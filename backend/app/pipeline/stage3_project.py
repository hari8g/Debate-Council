"""Stage 3 orchestration: state → OU → portrait → strains → Monte Carlo → narrative."""

from __future__ import annotations

import time
from typing import Any, Callable

import numpy as np

from app.config import settings
from app.llm.client import call_llm_async
from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage2 import PersonaModel
from app.models.stage3 import (
    FutureGoalsOutlook,
    FutureStateDistribution,
    FutureStateNarrative,
    OuParameters,
    PersonalR0Estimate,
    PhasePortrait,
)
from app.pipeline.belief_strain_engine import build_adaptive_strain_estimates
from app.pipeline.stage3_monte import compute_projection_quality, run_monte_carlo
from app.pipeline.stage3_ou import compute_phase_portrait, estimate_ou_parameters
from app.pipeline.stage3_state import (
    build_behavioral_state_model,
    build_external_inputs,
    estimate_state_history,
    fuse_states,
)

FUTURE_NARRATIVE_SYSTEM = """You synthesise future state projections for ONE specific Instagram profile.
Write in second person ("they" / profile owner's username). Reference their actual themes, posts, and metrics.
Return JSON with:
- next_30_days, next_90_days, six_month_horizon, epistemic_limits (required strings)
- long_horizon: optional string for T+365+ when provided in prompt (only if data supports it)
- profile_context: 2 sentences tying projection to this person's observed behaviour
- strain_outlook: how their dominant narrative threads will evolve

Rules:
- NO generic filler ("trajectory may intensify" without saying HOW for THIS profile)
- Cite specific strain labels, engagement trends, or caption themes from the prompt
- Do NOT contradict Monte Carlo medians (if valence median falls, do not claim rising positivity)
- Acknowledge data limits (post count, window, projection confidence) in epistemic_limits
"""

FUTURE_GOALS_SYSTEM = """You are a strategic future-orientation analyst for ONE Instagram profile.
Given their persona model, Monte Carlo projections, narrative strains, and posting behavior, infer what this person is likely working toward on Instagram and in life themes visible through their public presence.

Return JSON:
- strategic_summary: 2-3 sentences on their overall direction
- instagram_trajectory: what content/engagement patterns they will likely pursue (specific themes, formats, posting rhythm)
- focus_areas: array of {area, rationale, confidence} — 3-5 items (confidence 0-1)
- likely_goals: array of {goal, timeframe, reasoning} — 3-5 concrete goals (timeframe: "30d"|"90d"|"6mo"|"1y")
- reasoning_trace: step-by-step chain linking observed signals → inference → projected focus (4-6 bullet sentences as one string with newlines)

Rules:
- Ground every inference in provided data — cite strains, slopes, persona sections, MC medians
- Distinguish Instagram-specific goals from broader life-direction themes inferred from content
- Be specific to THIS profile — no generic influencer advice
- confidence reflects evidence strength, not wishful thinking
"""


def _parse_horizons() -> list[int]:
    raw = settings.projection_horizons_days.strip()
    horizons = sorted({int(x.strip()) for x in raw.split(",") if x.strip().isdigit()})
    return horizons or [30, 90, 180, 365]


def _state_agreement(measured: np.ndarray, persona: PersonaModel) -> float:
    from app.pipeline.stage3_state import persona_to_array

    m = measured[-1] if len(measured) else persona_to_array(persona)
    inf = persona_to_array(persona)
    return float(np.clip(1.0 - np.mean(np.abs(m - inf) / np.array([2, 1, 1, 1, 1, 1])), 0, 1))


async def run_projection(
    job_id: str,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
    persona: PersonaModel,
    emit: Callable[[Any], None],
) -> tuple[OuParameters, PhasePortrait, list[PersonalR0Estimate], FutureStateDistribution, FutureStateNarrative]:
    from app.streaming.events import substep_complete, substep_progress, substep_start

    horizons = _parse_horizons()

    emit(substep_start(job_id, time.time(), 3, "s3_state", "State vector estimation"))
    state_history, dt_days, calendar_span, mean_interval = estimate_state_history(matrix, derived)
    ou_pre = estimate_ou_parameters(state_history, dt_days, derived)
    fused, w_meas = fuse_states(state_history, persona, ou_pre.r_squared, len(matrix.captions))
    behavioral = build_behavioral_state_model(
        matrix, derived, persona, state_history, fused, w_meas, calendar_span, mean_interval,
    )
    agreement = _state_agreement(state_history, persona)
    emit(
        substep_complete(
            job_id,
            time.time(),
            3,
            "s3_state",
            {
                "dimensions": 6,
                "points": len(state_history),
                "behavioral_profile": behavioral.behavioral_profile.model_dump(mode="json"),
                "behavioral_state": behavioral.model_dump(mode="json"),
                "calendar_span_days": calendar_span,
                "fusion_weight_measured": w_meas,
            },
        )
    )

    emit(substep_start(job_id, time.time(), 3, "s3_ou", "OU parameter fitting"))
    ou = estimate_ou_parameters(state_history, dt_days, derived)
    emit(substep_complete(job_id, time.time(), 3, "s3_ou", ou.model_dump(mode="json")))

    emit(substep_start(job_id, time.time(), 3, "s3_portrait", "Phase portrait computation"))
    portrait = compute_phase_portrait(ou)
    emit(substep_complete(job_id, time.time(), 3, "s3_portrait", portrait.model_dump(mode="json")))

    emit(substep_start(job_id, time.time(), 3, "s3_strains", "Adaptive belief strain discovery"))
    strains = build_adaptive_strain_estimates(matrix, persona, max_strains=4)
    for i, est in enumerate(strains):
        emit(
            substep_progress(
                job_id,
                time.time(),
                3,
                "s3_strains",
                f"Strain {i + 1}/{len(strains)}: {est.label} (R₀={est.r0:.2f})",
                percent=(i + 1) / max(len(strains), 1) * 100,
            )
        )
        emit(substep_complete(job_id, time.time(), 3, f"s3_strain_{est.strain_type}", est.model_dump(mode="json")))

    emit(
        substep_complete(
            job_id,
            time.time(),
            3,
            "s3_strains",
            {"count": len(strains), "strains": [s.model_dump(mode="json") for s in strains]},
        )
    )

    emit(substep_start(job_id, time.time(), 3, "s3_monte", "Monte Carlo simulation"))
    u_mean = build_external_inputs(derived, 1)[0]
    pq = compute_projection_quality(
        ou, len(matrix.captions), horizons, strains, agreement, settings.projection_confidence_tau,
    )

    def mc_progress(done: int, total: int) -> None:
        emit(
            substep_progress(
                job_id, time.time(), 3, "s3_monte",
                f"Monte Carlo path {done:,}/{total:,} — integrating OU + strain dynamics",
                percent=done / total * 100,
            )
        )

    future = run_monte_carlo(
        ou,
        fused,
        horizons,
        u_mean,
        n_simulations=settings.monte_carlo_simulations,
        progress_cb=mc_progress,
        strains=strains,
        username=matrix.username,
        projection_quality=pq,
        dt_day=1.0,
    )
    future.behavioral_state = behavioral
    emit(substep_complete(job_id, time.time(), 3, "s3_monte", future.model_dump(mode="json")))

    emit(substep_start(job_id, time.time(), 3, "s3_narrative", "Future narrative generation"))
    post_samples = "\n".join(
        f"  - [{matrix.post_types[i] if i < len(matrix.post_types) else '?'}] "
        f"{matrix.captions[i][:100]} (eng {matrix.engagement_rates[i]:.4f})"
        for i in range(min(8, len(matrix.captions)))
    )
    strain_block = "\n".join(
        f"  • {s.label}: trend={s.trend_label}, proj T+30={s.projected_activation_30d:.2f} — {s.plain_summary[:100]}"
        for s in strains
    )
    horizon_lines = []
    for h in horizons:
        dist = future.horizons.get(str(h))
        conf = pq.horizon_confidence.get(str(h), pq.overall)
        if dist:
            horizon_lines.append(
                f"T+{h} (confidence {conf:.0%}): median valence {dist.median[0]:+.2f}, "
                f"P(+valence)={dist.p_positive_valence:.0%}, P(regime persist)={dist.p_regime_persistence:.0%}"
            )

    long_h = future.horizons.get("365") or future.horizons.get(str(max(horizons)))

    prompt = f"""Profile: @{matrix.username} | {len(matrix.captions)} posts analysed over {calendar_span:.0f} calendar days
Bio: {(matrix.bio or '')[:200]}
Persona summary: {persona.summary}
Key insight: {persona.key_insight}

Behavioral profile: {behavioral.behavioral_profile.summary}
Fusion: {w_meas:.0%} measured posts + {1 - w_meas:.0%} LLM persona for simulation anchor.

Derived signals: posting regularity {derived.posting_regularity:.2f}, engagement slope {derived.engagement_slope:+.4f}, topic drift {derived.topic_drift_score:.2f}, emotional volatility {derived.emotional_volatility:.2f}

Fused state now: valence {behavioral.fused_state.valence:.2f}, arousal {behavioral.fused_state.arousal:.2f}, stability {behavioral.fused_state.stability:.2f}

Monte Carlo ({settings.monte_carlo_simulations} sims, OU {ou.fit_method}, R²={ou.r_squared:.3f}):
{chr(10).join(horizon_lines)}

Projection quality: {pq.overall:.0%} overall. Notes: {'; '.join(pq.notes) or 'none'}

Narrative strains:
{strain_block}

Recent posts:
{post_samples}

Scenarios: {', '.join(f"{s['name']} ({s['probability']:.0%})" for s in future.scenario_paths[:3])}
"""
    if long_h and max(horizons) >= 365:
        prompt += f"\nLong horizon T+{max(horizons)} median valence: {long_h.median[0]:+.2f} — treat as extrapolation.\n"

    narr_result = await call_llm_async(FUTURE_NARRATIVE_SYSTEM, prompt)

    goals_prompt = f"""Profile: @{matrix.username}
Persona summary: {persona.summary}
Key insight: {persona.key_insight}
Temporal state: {persona.temporal_state.summary if persona.temporal_state else 'unknown'}
Revealed preferences: {persona.revealed_preferences.summary if persona.revealed_preferences else 'unknown'}

Behavioral profile: {behavioral.behavioral_profile.summary}
Posting regularity: {derived.posting_regularity:.2f}, engagement slope: {derived.engagement_slope:+.4f}

Monte Carlo medians:
{chr(10).join(horizon_lines)}

Scenarios: {', '.join(f"{s['name']} ({s['probability']:.0%})" for s in future.scenario_paths[:3])}

Narrative strains:
{strain_block}

Future narrative (30d): {narr_result.get('next_30_days', '')[:400]}
"""
    goals_result = await call_llm_async(FUTURE_GOALS_SYSTEM, goals_prompt)
    goals_outlook = FutureGoalsOutlook(
        strategic_summary=goals_result.get("strategic_summary", ""),
        instagram_trajectory=goals_result.get("instagram_trajectory", ""),
        focus_areas=goals_result.get("focus_areas") or [],
        likely_goals=goals_result.get("likely_goals") or [],
        reasoning_trace=goals_result.get("reasoning_trace", ""),
    )

    narrative = FutureStateNarrative(
        next_30_days=narr_result.get("next_30_days", ""),
        next_90_days=narr_result.get("next_90_days", ""),
        six_month_horizon=narr_result.get("six_month_horizon", ""),
        long_horizon=narr_result.get("long_horizon", ""),
        epistemic_limits=narr_result.get("epistemic_limits", ""),
        profile_context=narr_result.get("profile_context", ""),
        strain_outlook=narr_result.get("strain_outlook", ""),
        goals_outlook=goals_outlook,
    )
    emit(substep_complete(job_id, time.time(), 3, "s3_narrative", narrative.model_dump(mode="json")))

    return ou, portrait, strains, future, narrative
