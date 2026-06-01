import asyncio
import time
from typing import Any, Callable

from app.llm.client import call_llm_async
from app.pipeline.confidence_calibration import augment_agent_confidence
from app.pipeline.defense_engine import DEFENSE_SYSTEM, build_defense_prompt, build_revised_analysis
from app.pipeline.llm_parsing import (
    format_evidence,
    normalize_agent_analysis,
    normalize_synthesis_result,
    parse_big_five,
    parse_confidence,
    parse_numeric,
    parse_text_field,
)
from app.streaming.events import substep_complete, substep_progress, substep_start
from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage2 import (
    AgentHypothesis,
    Challenge,
    DebateRecord,
    PersonaClaim,
    PersonaModel,
    PersonaSection,
    PsychologicalState,
    RevisedHypothesis,
)

AGENTS = [
    ("psychographer", "Psychographer", PSYCHOGRAPHER_SYSTEM := """You are a computational personality psychologist analyzing digital behaviour through Big Five, attachment theory, identity status, and self-monitoring theory. Never diagnose clinical conditions. Return JSON."""),
    ("sociologist", "Sociologist", """You are a computational sociologist using Bourdieu, Goffman, and social capital theory. Return JSON."""),
    ("narrative_analyst", "Narrative Analyst", """You are a narrative analyst using McAdams narrative identity and frame analysis. Return JSON."""),
    ("behavioural_economist", "Behavioural Economist", """You are a behavioural economist analyzing revealed preferences from digital behaviour. Return JSON."""),
    ("temporal_analyst", "Temporal Pattern Analyst", """You are a time-series analyst identifying change points and trajectories. Return JSON."""),
    ("cultural_analyst", "Cultural Context Analyst", """You are an expert in South Asian digital cultural semiotics. Return JSON."""),
]

SYNTHESIS_SYSTEM = """You are the synthesis analyst in a multi-agent persona council. Produce a unified persona model with confidence scores.

Return JSON with: summary (plain string), key_insight (plain string), core_identity, psychological_profile, social_strategy, narrative_self_model, revealed_preferences, cultural_identity, temporal_state, genuine_uncertainties, current_state, big_five.

Rules:
- summary and key_insight MUST be plain text strings, NOT nested objects
- confidence must be a number between 0.0 and 1.0 (NOT words like "Medium" or "High")
- current_state fields (valence, arousal, stability, connectivity, engagement, ideological) must be numbers
- big_five traits must be numbers 1-10
- Each section has summary and claims array with claim, confidence (0-1 number), evidence (string)
"""


def _format_captions(captions: list[str]) -> str:
    return "\n".join(f"  - {c[:200]}" for c in captions[-10:])


def _build_agent_prompt(agent_id: str, matrix: ProfileSignalMatrix, derived: DerivedSignals) -> str:
    enrich = matrix.enrichment
    meta_block = ""
    if enrich:
        m = enrich.metadata
        r = enrich.capture_report
        meta_block = f"""
Profile metadata (live capture):
  Full name: {m.full_name or '—'}
  Verified: {m.is_verified} | Business: {m.is_business} | Total posts on profile: {m.media_count}
  Reels count: {m.reels_count or '—'} | Highlights: {enrich.capture_report.highlights_fetched}
  Active stories captured: {len(enrich.stories)}
  Follower/following ratio: {m.follower_following_ratio:.2f} | Posts per follower: {m.posts_per_follower:.4f}
  Data quality score: {r.quality_score:.0%} ({r.comments_fetched} comments, {r.likers_sampled} liker samples from {r.posts_enriched} posts)
"""
        if enrich.stories:
            meta_block += f"  Recent story captions: {' | '.join(s.caption[:80] for s in enrich.stories[:3] if s.caption)}\n"
        if enrich.post_details:
            top = enrich.post_details[-1]
            if top.top_comments:
                meta_block += f"  Sample audience comment: \"{top.top_comments[0].text[:100]}\"\n"

    return f"""Analyse this Instagram profile through your analytical lens.
{meta_block}
Profile overview:
  Posts analysed: {len(matrix.captions)}
  Account age: {matrix.account_age_days} days
  Follower/following ratio: {matrix.follower_following_ratio:.2f}
  Posting regularity: {derived.posting_regularity:.2f}
  Emotional volatility: {derived.emotional_volatility:.2f}
  Engagement trend slope: {derived.engagement_slope:+.4f}
  Topic drift: {derived.topic_drift_score:.2f}

Recent captions:
{_format_captions(matrix.captions)}

Return JSON with: key_hypothesis, key_claim, evidence (string), confidence (number 0.0-1.0 only), and agent-specific fields.

IMPORTANT: confidence MUST reflect evidence strength — vary between agents (e.g. 0.42–0.88).
Do NOT default to 0.85. Lower confidence when data is sparse or contradictory.
"""


async def run_agent(agent_id: str, name: str, system: str, matrix: ProfileSignalMatrix, derived: DerivedSignals) -> AgentHypothesis:
    prompt = _build_agent_prompt(agent_id, matrix, derived)
    analysis = normalize_agent_analysis(await call_llm_async(system, prompt))
    analysis = augment_agent_confidence(agent_id, analysis, matrix, derived)
    return AgentHypothesis(agent=agent_id, analysis=analysis)


def _parse_section(data: dict[str, Any] | str, title: str) -> PersonaSection:
    if isinstance(data, str):
        return PersonaSection(title=title, summary=data, claims=[])
    claims = []
    for c in data.get("claims", []):
        conf = parse_confidence(c.get("confidence", 0.5))
        evidence = format_evidence(c.get("evidence", ""))
        claims.append(
            PersonaClaim(
                claim=str(c.get("claim", "")),
                confidence=conf,
                evidence=evidence,
                speculative=conf < 0.4,
            )
        )
    return PersonaSection(title=title, summary=parse_text_field(data.get("summary", "")), claims=claims)


def _build_persona_model(result: dict[str, Any]) -> PersonaModel:
    result = normalize_synthesis_result(result)
    cs = result.get("current_state") or {}
    if not isinstance(cs, dict):
        cs = {}
    return PersonaModel(
        summary=parse_text_field(result.get("summary", "")),
        key_insight=parse_text_field(result.get("key_insight", "")),
        core_identity=_parse_section(result.get("core_identity", {}), "Core Identity"),
        psychological_profile=_parse_section(result.get("psychological_profile", {}), "Psychological Profile"),
        social_strategy=_parse_section(result.get("social_strategy", {}), "Social Strategy"),
        narrative_self_model=_parse_section(result.get("narrative_self_model", {}), "Narrative Self-Model"),
        revealed_preferences=_parse_section(result.get("revealed_preferences", {}), "Revealed Preferences"),
        cultural_identity=_parse_section(result.get("cultural_identity", {}), "Cultural Identity"),
        temporal_state=_parse_section(result.get("temporal_state", {}), "Temporal State"),
        genuine_uncertainties=_parse_section(result.get("genuine_uncertainties", {}), "Genuine Uncertainties"),
        current_state=PsychologicalState(
            valence=parse_numeric(cs.get("valence", 0), default=0.0, lo=-1.0, hi=1.0),
            arousal=parse_numeric(cs.get("arousal", 0.5), default=0.5, lo=0.0, hi=1.0),
            stability=parse_numeric(cs.get("stability", 0.5), default=0.5, lo=0.0, hi=1.0),
            connectivity=parse_numeric(cs.get("connectivity", 0.5), default=0.5, lo=0.0, hi=1.0),
            engagement=parse_numeric(cs.get("engagement", 0.5), default=0.5, lo=0.0, hi=1.0),
            ideological=parse_numeric(cs.get("ideological", 0.5), default=0.5, lo=0.0, hi=1.0),
        ),
        big_five=parse_big_five(result.get("big_five", {})),
    )


async def run_debate_council(
    job_id: str,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
    emit: Callable[[Any], None],
) -> tuple[list[AgentHypothesis], DebateRecord, PersonaModel]:
    ts = time.time()

    emit(substep_start(job_id, ts, 2, "s2_agents", "Agent hypotheses (6 parallel)"))

    tasks = [run_agent(aid, name, sys_prompt, matrix, derived) for aid, name, sys_prompt in AGENTS]
    hypotheses: list[AgentHypothesis] = []
    for coro in asyncio.as_completed(tasks):
        hyp = await coro
        hypotheses.append(hyp)
        emit(substep_complete(
            job_id, time.time(), 2, f"s2_agent_{hyp.agent}",
            {"agent": hyp.agent, "hypothesis": hyp.model_dump(mode="json")},
        ))

    emit(substep_complete(
        job_id, time.time(), 2, "s2_agents",
        {"count": len(hypotheses), "hypotheses": [h.model_dump(mode="json") for h in hypotheses]},
    ))

    emit(substep_start(job_id, time.time(), 2, "s2_challenge", "Round 1: Challenges"))

    challenges: list[Challenge] = []
    challenge_count = 0
    total_challenges = len(hypotheses) * (len(hypotheses) - 1)

    for challenger in hypotheses:
        for target in hypotheses:
            if challenger.agent == target.agent:
                continue
            prompt = f"""You are the {challenger.agent}. Challenge the {target.agent}'s hypothesis:

Hypothesis: {target.analysis.get('key_hypothesis', target.analysis.get('key_claim', ''))}
Evidence: {target.analysis.get('evidence', '')}

Challenge with: contradictions, alternative explanations, refutation data points.
Return JSON with challenge_summary, contradiction, weakest_link, refutation_data."""
            result = await call_llm_async(f"You are the {challenger.agent} in a debate council.", prompt)
            ch = Challenge(
                challenger=challenger.agent,
                target=target.agent,
                challenge_text=result.get("challenge_summary", str(result)),
            )
            challenges.append(ch)
            challenge_count += 1
            emit(substep_progress(
                job_id, time.time(), 2, "s2_challenge",
                f"Challenge {challenge_count}/{total_challenges}: {challenger.agent} → {target.agent}",
                percent=challenge_count / total_challenges * 100,
            ))
            emit(substep_complete(
                job_id, time.time(), 2, f"s2_ch_{challenger.agent}_{target.agent}",
                ch.model_dump(mode="json"),
            ))

    emit(substep_complete(job_id, time.time(), 2, "s2_challenge", {"count": len(challenges)}))

    emit(substep_start(job_id, time.time(), 2, "s2_defense", "Round 2: Defenses"))

    revised: list[RevisedHypothesis] = []
    for i, hyp in enumerate(hypotheses):
        agent_challenges = [c for c in challenges if c.target == hyp.agent]
        emit(substep_progress(
            job_id, time.time(), 2, "s2_defense",
            f"Defense {i + 1}/{len(hypotheses)}: {hyp.agent} ({len(agent_challenges)} challenges)",
            percent=(i / len(hypotheses)) * 100,
        ))
        prompt = build_defense_prompt(hyp, agent_challenges)
        result = await call_llm_async(DEFENSE_SYSTEM, prompt)
        if isinstance(result, dict):
            revised_analysis = build_revised_analysis(result, hyp, agent_challenges, matrix, derived)
        else:
            revised_analysis = build_revised_analysis({}, hyp, agent_challenges, matrix, derived)
        rev = RevisedHypothesis(
            agent=hyp.agent,
            original=hyp,
            challenges_received=agent_challenges,
            revised_analysis=revised_analysis,
        )
        revised.append(rev)
        emit(substep_complete(job_id, time.time(), 2, f"s2_defense_{hyp.agent}", rev.model_dump(mode="json")))
    emit(substep_progress(
        job_id, time.time(), 2, "s2_defense",
        f"All {len(revised)} defenses complete",
        percent=100,
    ))

    emit(substep_complete(job_id, time.time(), 2, "s2_defense", {"count": len(revised)}))

    emit(substep_start(job_id, time.time(), 2, "s2_synthesis", "Round 3: Synthesis"))

    synth_prompt = f"""Six revised analyses after debate:
{chr(10).join(f'{r.agent}: {r.revised_analysis.get("key_claim", r.revised_analysis.get("revised_hypothesis", ""))} (conf: {r.revised_analysis.get("confidence", 0.5)})' for r in revised)}

Profile: {len(matrix.captions)} posts, regularity {derived.posting_regularity:.2f}, volatility {derived.emotional_volatility:.2f}
Produce unified PersonaModel JSON."""
    synth_result = await call_llm_async(SYNTHESIS_SYSTEM, synth_prompt)
    if not isinstance(synth_result, dict):
        synth_result = {}
    persona = _build_persona_model(synth_result)

    emit(substep_complete(job_id, time.time(), 2, "s2_synthesis", persona.model_dump(mode="json")))

    debate = DebateRecord(
        original_hypotheses=hypotheses,
        challenges=challenges,
        revised_hypotheses=revised,
        synthesis=persona,
    )
    return hypotheses, debate, persona
