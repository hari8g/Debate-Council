"""Blend LLM-reported confidence with measurable signal alignment scores."""

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.pipeline.llm_parsing import parse_confidence


def compute_signal_confidence(
    agent_id: str,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> float:
    """Evidence-weighted confidence from post data — differs per agent specialty."""
    n = max(1, len(matrix.captions))
    data_coverage = min(1.0, n / 25)

    if agent_id == "temporal_analyst":
        signal = min(
            1.0,
            abs(derived.engagement_slope) * 50
            + derived.topic_drift_score * 0.35
            + derived.posting_regularity * 0.35,
        )
    elif agent_id == "psychographer":
        signal = min(1.0, derived.emotional_volatility * 1.5 + derived.persona_consistency_score * 0.45)
    elif agent_id == "sociologist":
        ratio = matrix.follower_following_ratio
        signal = min(1.0, min(ratio / 4, 1.0) * 0.55 + data_coverage * 0.45)
    elif agent_id == "behavioural_economist":
        signal = min(1.0, abs(derived.hashtag_slope) * 3 + abs(derived.engagement_slope) * 40 + 0.15)
    elif agent_id == "narrative_analyst":
        signal = min(
            1.0,
            derived.topic_drift_score * 0.45
            + (1 - derived.persona_consistency_score) * 0.35
            + data_coverage * 0.2,
        )
    elif agent_id == "cultural_analyst":
        signal = min(1.0, data_coverage * 0.55 + derived.persona_consistency_score * 0.35)
    else:
        signal = data_coverage * 0.5

    base = 0.28 + 0.58 * signal * (0.5 + 0.5 * data_coverage)
    return round(max(0.28, min(0.92, base)), 3)


def augment_agent_confidence(
    agent_id: str,
    analysis: dict,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
    *,
    challenges_received: int = 0,
) -> dict:
    """Attach LLM, signal, and blended confidence with rationale."""
    llm_conf = parse_confidence(analysis.get("confidence", 0.5))
    signal_conf = compute_signal_confidence(agent_id, matrix, derived)

    # Generic 0.85 from LLM gets down-weighted in favour of measurable signals
    if abs(llm_conf - 0.85) < 0.03:
        blended = 0.32 * llm_conf + 0.68 * signal_conf
    else:
        blended = 0.52 * llm_conf + 0.48 * signal_conf

    if challenges_received > 0:
        penalty = min(0.12, challenges_received * 0.008)
        accepted = analysis.get("valid_challenges")
        if accepted:
            penalty *= 0.5
        blended = max(0.22, blended - penalty)

    analysis = dict(analysis)
    analysis["confidence_llm"] = llm_conf
    analysis["confidence_signal"] = signal_conf
    analysis["confidence"] = round(blended, 3)
    analysis["confidence_rationale"] = (
        f"Blended LLM ({llm_conf:.0%}) + signal alignment ({signal_conf:.0%})"
        + (f"; {challenges_received} challenges received" if challenges_received else "")
    )
    return analysis
