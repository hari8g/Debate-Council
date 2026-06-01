"""Tests for Round 2 per-challenge defense calibration."""

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage2 import AgentHypothesis, Challenge
from app.pipeline.defense_engine import (
    build_revised_analysis,
    calibrate_revised_confidence,
    normalize_challenge_evaluations,
)


def _minimal_matrix() -> ProfileSignalMatrix:
    return ProfileSignalMatrix(username="test")


def _minimal_derived() -> DerivedSignals:
    return DerivedSignals()


def test_reject_verdict_zeroes_confidence_delta():
    ch = Challenge(challenger="sociologist", target="psychographer", challenge_text="test challenge")
    raw = [
        {
            "challenger": "sociologist",
            "verdict": "reject",
            "rationale": "This challenge misreads the posting rhythm entirely; burst windows align with exogenous events not trait anxiety.",
            "confidence_delta": -0.1,
        }
    ]
    normalized = normalize_challenge_evaluations(raw, [ch])
    assert normalized[0]["verdict"] == "reject"
    assert normalized[0]["confidence_delta"] == 0.0


def test_short_rationale_downgrades_to_reject():
    ch = Challenge(challenger="temporal_analyst", target="psychographer", challenge_text="timing objection")
    raw = [{"challenger": "temporal_analyst", "verdict": "accept", "rationale": "too short", "confidence_delta": -0.08}]
    normalized = normalize_challenge_evaluations(raw, [ch])
    assert normalized[0]["verdict"] == "reject"
    assert normalized[0]["confidence_delta"] == 0.0


def test_accept_and_partial_apply_negative_deltas_only():
    challenges = [
        Challenge(challenger="a", target="psychographer", challenge_text="c1"),
        Challenge(challenger="b", target="psychographer", challenge_text="c2"),
    ]
    evaluations = normalize_challenge_evaluations(
        [
            {
                "challenger": "a",
                "verdict": "accept",
                "rationale": "Valid gap in original framing that the signal matrix confirms across multiple posting windows and caption shifts.",
                "confidence_delta": -0.06,
            },
            {
                "challenger": "b",
                "verdict": "partial",
                "rationale": "Some merit in audience segmentation point but core mechanism survives with tighter bounds on the claim.",
                "confidence_delta": -0.03,
            },
        ],
        challenges,
    )
    original = {"confidence": 0.72}
    revised, rationale, _ = calibrate_revised_confidence(
        original, evaluations, "psychographer", _minimal_matrix(), _minimal_derived()
    )
    assert revised < 0.72
    assert "accepted" in rationale
    assert evaluations[0]["confidence_delta"] < 0
    assert evaluations[1]["confidence_delta"] < 0


def test_build_revised_analysis_includes_per_challenge_evaluations():
    hyp = AgentHypothesis(
        agent="psychographer",
        analysis={"confidence": 0.7, "key_hypothesis": "test", "key_claim": "test claim"},
    )
    ch = Challenge(challenger="sociologist", target="psychographer", challenge_text="objection")
    llm = {
        "revised_hypothesis": "revised",
        "key_claim": "revised claim",
        "evidence": "ev",
        "challenge_evaluations": [
            {
                "challenger": "sociologist",
                "verdict": "reject",
                "rationale": "The sociologist challenge conflates engagement drag with identity signalling without evidence from caption structure.",
                "response": "Rebutted on evidence grounds.",
                "confidence_delta": 0,
            }
        ],
    }
    out = build_revised_analysis(llm, hyp, [ch], _minimal_matrix(), _minimal_derived())
    assert len(out["challenge_evaluations"]) == 1
    assert out["challenges_rejected"] == 1
    assert out["confidence_before"] == 0.7
