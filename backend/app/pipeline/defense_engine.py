"""Round 2 defense — per-challenge evaluation and rationale-based confidence updates."""

from __future__ import annotations

from typing import Any

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage2 import AgentHypothesis, Challenge
from app.pipeline.confidence_calibration import compute_signal_confidence
from app.pipeline.llm_parsing import format_evidence, parse_confidence, parse_text_field

DEFENSE_SYSTEM = """You are an analyst in a multi-agent debate council defending your hypothesis after cross-examination.

For EACH challenge directed at you, you must read the challenger's specific objection and respond individually.
Do NOT give one generic defense that ignores the challenger's point.

Return JSON with:
- revised_hypothesis (string): your updated overall hypothesis after weighing all challenges
- key_claim (string): one-sentence distilled claim
- evidence (string): supporting evidence for the revised view
- challenge_evaluations (array, one entry per challenge, same order as provided):
    - challenger (string): must match the challenger id exactly
    - verdict (string): exactly one of "accept", "partial", "reject"
    - rationale (string): 2-4 sentences citing specific evidence; explain WHY you accept or reject THIS challenge
    - confidence_delta (number): change to confidence ONLY if verdict is accept (-0.03 to -0.12) or partial (-0.01 to -0.06); MUST be 0 if reject
    - response (string): one sentence addressing this challenger's specific point

Rules:
- reject + confidence_delta 0 when the challenge misreads evidence or applies wrong framework
- accept only when the challenge identifies a genuine gap you cannot rebut
- partial when the challenge has merit but your core claim survives with nuance
- confidence_delta must be 0 for every reject; never apply the same rationale to all challenges
- Do NOT copy-paste identical rationales across challenges
"""

MIN_RATIONALE_CHARS = 48
MAX_DELTA_PER_CHALLENGE = 0.12
MAX_TOTAL_DELTA = 0.28


def format_challenge_block(ch: Challenge) -> str:
    text = ch.challenge_text
    if isinstance(text, dict):
        parts = []
        for key in ("challenge_summary", "contradiction", "weakest_link", "refutation_data"):
            if text.get(key):
                parts.append(f"{key}: {format_evidence(text[key])}")
        body = " | ".join(parts) if parts else format_evidence(text)
    else:
        body = str(text)
    return f"[{ch.challenger}] {body}"


def build_defense_prompt(hyp: AgentHypothesis, challenges: list[Challenge]) -> str:
    original = hyp.analysis.get("key_hypothesis") or hyp.analysis.get("key_claim") or ""
    conf = hyp.analysis.get("confidence", 0.5)
    blocks = "\n\n".join(
        f"Challenge {i + 1} — challenger_id: {c.challenger}\n{format_challenge_block(c)}"
        for i, c in enumerate(challenges)
    )
    return f"""You are {hyp.agent}.

Original hypothesis: {original}
Original key claim: {hyp.analysis.get('key_claim', original)}
Original confidence: {conf}
Original evidence: {format_evidence(hyp.analysis.get('evidence', ''))}

You received {len(challenges)} challenges. Evaluate each separately in challenge_evaluations (challenger must match challenger_id):

{blocks}

Revise your hypothesis only where challenges with accept/partial verdicts warrant it. Return the JSON schema described in your instructions."""


def _normalize_verdict(raw: Any) -> str:
    v = str(raw or "reject").strip().lower()
    if v in ("accept", "accepted", "valid", "concede", "conceded"):
        return "accept"
    if v in ("partial", "partly", "partially", "qualified"):
        return "partial"
    return "reject"


def normalize_challenge_evaluations(
    raw_evaluations: Any,
    challenges: list[Challenge],
) -> list[dict[str, Any]]:
    """Align LLM output to incoming challenges; fill gaps with conservative rejects."""
    by_challenger: dict[str, dict[str, Any]] = {}
    if isinstance(raw_evaluations, list):
        for item in raw_evaluations:
            if not isinstance(item, dict):
                continue
            cid = str(item.get("challenger", "")).strip()
            if cid:
                by_challenger[cid] = item

    normalized: list[dict[str, Any]] = []
    for ch in challenges:
        item = by_challenger.get(ch.challenger, {})
        verdict = _normalize_verdict(item.get("verdict"))
        rationale = str(item.get("rationale") or item.get("response") or "").strip()
        response = str(item.get("response") or rationale or "").strip()
        delta = parse_confidence(item.get("confidence_delta"), 0.0)

        if verdict == "reject":
            delta = 0.0
        elif len(rationale) < MIN_RATIONALE_CHARS:
            verdict = "reject"
            delta = 0.0
            rationale = rationale or "Insufficient rationale — challenge rejected by calibration."
        else:
            if verdict == "accept":
                delta = -max(0.03, min(MAX_DELTA_PER_CHALLENGE, abs(delta) if delta != 0 else 0.06))
            elif verdict == "partial":
                delta = -max(0.01, min(0.06, abs(delta) if delta != 0 else 0.03))
            if delta > 0:
                delta = 0.0

        normalized.append(
            {
                "challenger": ch.challenger,
                "target": ch.target,
                "verdict": verdict,
                "rationale": rationale,
                "response": response,
                "confidence_delta": round(delta, 3),
                "challenge_summary": format_challenge_block(ch),
            }
        )
    return normalized


def calibrate_revised_confidence(
    original_analysis: dict[str, Any],
    evaluations: list[dict[str, Any]],
    agent_id: str,
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> tuple[float, str, list[dict[str, Any]]]:
    """Apply only validated per-challenge deltas to the Round 1 baseline."""
    baseline = parse_confidence(original_analysis.get("confidence"), 0.5)
    signal_conf = compute_signal_confidence(agent_id, matrix, derived)

    total_delta = sum(float(e.get("confidence_delta") or 0) for e in evaluations)
    total_delta = max(-MAX_TOTAL_DELTA, min(0.0, total_delta))

    accepted = [e for e in evaluations if e.get("verdict") == "accept"]
    partial = [e for e in evaluations if e.get("verdict") == "partial"]
    rejected = [e for e in evaluations if e.get("verdict") == "reject"]

    revised = max(0.18, min(0.95, baseline + total_delta))

    # Slight anchor to signal alignment so confidence stays grounded in data
    revised = round(0.72 * revised + 0.28 * signal_conf, 3)
    revised = max(0.18, min(0.95, revised))

    rationale_parts = [
        f"Baseline {baseline:.0%}",
        f"{len(accepted)} accepted",
        f"{len(partial)} partial",
        f"{len(rejected)} rejected",
        f"net Δ {total_delta:+.0%}",
    ]
    if accepted or partial:
        top = (accepted + partial)[0]
        rationale_parts.append(f"primary adjustment: {top.get('challenger')} ({top.get('verdict')})")

    return revised, "; ".join(rationale_parts), evaluations


def build_revised_analysis(
    llm_result: dict[str, Any],
    hyp: AgentHypothesis,
    challenges: list[Challenge],
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> dict[str, Any]:
    """Merge LLM defense output with deterministic confidence calibration."""
    evaluations = normalize_challenge_evaluations(llm_result.get("challenge_evaluations"), challenges)
    confidence, conf_rationale, evaluations = calibrate_revised_confidence(
        hyp.analysis, evaluations, hyp.agent, matrix, derived
    )

    original_conf = parse_confidence(hyp.analysis.get("confidence"), 0.5)
    out = {
        "revised_hypothesis": parse_text_field(llm_result.get("revised_hypothesis", "")),
        "key_claim": parse_text_field(llm_result.get("key_claim", llm_result.get("revised_hypothesis", ""))),
        "evidence": format_evidence(llm_result.get("evidence", "")),
        "challenge_evaluations": evaluations,
        "confidence": confidence,
        "confidence_before": original_conf,
        "confidence_delta_total": round(confidence - original_conf, 3),
        "confidence_rationale": conf_rationale,
        "confidence_llm": parse_confidence(llm_result.get("confidence"), confidence),
        "confidence_signal": compute_signal_confidence(hyp.agent, matrix, derived),
        "challenges_accepted": sum(1 for e in evaluations if e.get("verdict") == "accept"),
        "challenges_partial": sum(1 for e in evaluations if e.get("verdict") == "partial"),
        "challenges_rejected": sum(1 for e in evaluations if e.get("verdict") == "reject"),
    }
    return out
