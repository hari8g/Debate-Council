import asyncio
import time

from app.jobs.store import JobState
from app.models.report import PersonaDynamicsReport
from app.models.stage1 import DerivedSignals, ProfileSignalMatrix, SignalSummary
from app.models.stage2 import AgentHypothesis, DebateRecord, PersonaModel
from app.models.stage3 import (
    FutureStateDistribution,
    FutureStateNarrative,
    OuParameters,
    PersonalR0Estimate,
    PhasePortrait,
)
from app.pipeline.stage1_extract import extract_profile
from app.pipeline.stage2_debate import run_debate_council
from app.pipeline.stage3_project import run_projection
from app.streaming.events import job_complete, report_update, stage_complete, stage_rerun_start, stage_start


def _empty_stage3() -> tuple[
    None, None, list[PersonalR0Estimate], None, None
]:
    return None, None, [], None, None


def _empty_stage2() -> tuple[list[AgentHypothesis], None, None]:
    return [], None, None


def build_report(
    job: JobState,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
    summary: SignalSummary,
    hypotheses: list[AgentHypothesis],
    debate: DebateRecord | None,
    persona: PersonaModel | None,
    ou: OuParameters | None,
    portrait: PhasePortrait | None,
    strains: list[PersonalR0Estimate],
    future: FutureStateDistribution | None,
    narrative: FutureStateNarrative | None,
) -> PersonaDynamicsReport:
    posts = len(matrix.captions)
    enrich_quality = 0.0
    if matrix.enrichment:
        enrich_quality = matrix.enrichment.capture_report.quality_score
    data_quality = min(1.0, posts / 100) * 0.35 + derived.persona_consistency_score * 0.35 + enrich_quality * 0.3

    ethical_flags = ["public_profile_only", "no_clinical_diagnosis"]
    if data_quality < 0.4:
        ethical_flags.append("limited_data_warning")
    if posts < 20:
        ethical_flags.append("insufficient_posts_for_reliable_projection")
    if posts < 5:
        ethical_flags.append("very_few_posts_metrics_unreliable")

    r_squared = ou.r_squared if ou else 0.0
    projection_confidence: dict[str, float] = {}
    if future:
        if future.projection_quality:
            projection_confidence = future.projection_quality.horizon_confidence
        elif future.simulation_audit:
            projection_confidence = {
                str(h): future.projection_confidence
                for h in future.simulation_audit.horizons_days
            }
        else:
            projection_confidence = {"30": future.projection_confidence}

    return PersonaDynamicsReport(
        profile_url=job.url,
        username=matrix.username,
        analysis_period_days=summary.analysis_period_days,
        posts_analysed=posts,
        signal_summary=summary,
        derived_signals=derived,
        signal_matrix=matrix,
        agent_hypotheses=hypotheses,
        debate_record=debate,
        persona_model=persona,
        ou_parameters=ou,
        phase_portrait=portrait,
        belief_strain_profiles=strains,
        future_state=future,
        future_narrative=narrative,
        data_quality_score=data_quality,
        model_fit_r_squared=r_squared,
        projection_confidence=projection_confidence,
        ethical_flags=ethical_flags,
    )


async def run_pipeline(job: JobState) -> None:
    def emit(event):
        job.append_event(event)

    ts = time.time()

    emit(stage_start(job.job_id, ts, 1, "Profile Signal Extraction", "Extracting temporal signal matrix from Instagram profile"))
    matrix, derived, summary = await extract_profile(job, emit)
    emit(stage_complete(job.job_id, time.time(), 1, {
        "signal_summary": summary.model_dump(mode="json"),
        "derived_signals": derived.model_dump(mode="json"),
    }))

    emit(stage_start(job.job_id, time.time(), 2, "Multi-Agent Debate Council", "Six agents debate to stress-test persona hypotheses"))
    hypotheses, debate, persona = await run_debate_council(job.job_id, matrix, derived, emit)
    emit(stage_complete(job.job_id, time.time(), 2, {
        "persona_model": persona.model_dump(mode="json"),
        "debate_summary": {"agents": len(hypotheses), "challenges": len(debate.challenges)},
    }))

    emit(stage_start(job.job_id, time.time(), 3, "Future State Projection", "Dynamical systems modelling and Monte Carlo simulation"))
    ou, portrait, strains, future, narrative = await run_projection(job.job_id, matrix, derived, persona, emit)
    emit(stage_complete(job.job_id, time.time(), 3, {
        "ou_r_squared": ou.r_squared,
        "projection_confidence": future.projection_confidence,
    }))

    report = build_report(job, matrix, derived, summary, hypotheses, debate, persona, ou, portrait, strains, future, narrative)
    job.report = report
    job.complete(job_complete(job.job_id, time.time(), report.model_dump(mode="json")))


async def rerun_stage(job: JobState, stage_num: int) -> None:
    """Re-execute a single pipeline stage and merge results into the job report."""
    if stage_num not in (1, 2, 3):
        raise ValueError(f"Invalid stage: {stage_num}")

    def emit(event):
        job.append_event(event)

    emit(stage_rerun_start(job.job_id, time.time(), stage_num))

    existing = job.report
    if stage_num > 1 and not existing:
        raise RuntimeError("Complete Stage 1 before rerunning later stages.")

    matrix: ProfileSignalMatrix
    derived: DerivedSignals
    summary: SignalSummary
    hypotheses: list[AgentHypothesis]
    debate: DebateRecord | None
    persona: PersonaModel | None
    ou: OuParameters | None
    portrait: PhasePortrait | None
    strains: list[PersonalR0Estimate]
    future: FutureStateDistribution | None
    narrative: FutureStateNarrative | None

    if stage_num == 1:
        emit(stage_start(job.job_id, time.time(), 1, "Profile Signal Extraction", "Re-fetching profile signals"))
        matrix, derived, summary = await extract_profile(job, emit)
        emit(stage_complete(job.job_id, time.time(), 1, {
            "signal_summary": summary.model_dump(mode="json"),
            "derived_signals": derived.model_dump(mode="json"),
        }))
        hypotheses, debate, persona = _empty_stage2()
        ou, portrait, strains, future, narrative = _empty_stage3()
    elif stage_num == 2:
        assert existing is not None
        matrix = existing.signal_matrix  # type: ignore[assignment]
        derived = existing.derived_signals
        summary = existing.signal_summary
        emit(stage_start(job.job_id, time.time(), 2, "Multi-Agent Debate Council", "Re-running debate council"))
        hypotheses, debate, persona = await run_debate_council(job.job_id, matrix, derived, emit)
        emit(stage_complete(job.job_id, time.time(), 2, {
            "persona_model": persona.model_dump(mode="json"),
            "debate_summary": {"agents": len(hypotheses), "challenges": len(debate.challenges)},
        }))
        ou, portrait, strains, future, narrative = _empty_stage3()
    else:
        assert existing is not None
        matrix = existing.signal_matrix  # type: ignore[assignment]
        derived = existing.derived_signals
        summary = existing.signal_summary
        hypotheses = existing.agent_hypotheses
        debate = existing.debate_record
        persona = existing.persona_model
        if not persona:
            raise RuntimeError("Complete Stage 2 before rerunning Stage 3.")
        emit(stage_start(job.job_id, time.time(), 3, "Future State Projection", "Re-running projection engine"))
        ou, portrait, strains, future, narrative = await run_projection(job.job_id, matrix, derived, persona, emit)
        emit(stage_complete(job.job_id, time.time(), 3, {
            "ou_r_squared": ou.r_squared,
            "projection_confidence": future.projection_confidence,
        }))

    report = build_report(
        job, matrix, derived, summary, hypotheses, debate, persona,
        ou, portrait, strains, future, narrative,
    )
    job.report = report
    job.finish_rerun(report_update(job.job_id, time.time(), stage_num, report.model_dump(mode="json")))


async def run_mock_pipeline(job: JobState) -> None:
    """Fast mock pipeline for UI development without LLM/Instagram."""
    from app.streaming.events import substep_complete, substep_progress, substep_start

    def emit(event):
        job.append_event(event)

    stages = [
        (1, "Profile Signal Extraction", [
            ("s1_resolve", "Resolve profile"),
            ("s1_metadata", "Fetch profile metadata"),
            ("s1_posts", "Fetch posts", 10),
            ("s1_matrix", "Build signal matrix"),
            ("s1_derived", "Compute derived signals"),
        ]),
        (2, "Multi-Agent Debate Council", [
            ("s2_agents", "Agent hypotheses"),
            ("s2_challenge", "Round 1: Challenges", 5),
            ("s2_defense", "Round 2: Defenses"),
            ("s2_synthesis", "Round 3: Synthesis"),
        ]),
        (3, "Future State Projection", [
            ("s3_state", "State vector estimation"),
            ("s3_ou", "OU parameter fitting"),
            ("s3_portrait", "Phase portrait"),
            ("s3_strains", "Belief strain R₀"),
            ("s3_monte", "Monte Carlo", 5),
            ("s3_narrative", "Future narrative"),
        ]),
    ]

    for stage_num, title, substeps in stages:
        emit(stage_start(job.job_id, time.time(), stage_num, title, title))
        for substep in substeps:
            sid, label = substep[0], substep[1]
            steps = substep[2] if len(substep) > 2 else 1
            emit(substep_start(job.job_id, time.time(), stage_num, sid, label))
            for i in range(steps):
                if steps > 1:
                    emit(substep_progress(job.job_id, time.time(), stage_num, sid, f"Step {i+1}/{steps}", percent=(i+1)/steps*100))
                await asyncio.sleep(0.3)
            emit(substep_complete(job.job_id, time.time(), stage_num, sid, {"mock": True}))
        emit(stage_complete(job.job_id, time.time(), stage_num, {"mock": True}))
        await asyncio.sleep(0.2)

    await run_pipeline(job)
