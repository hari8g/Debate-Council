"""Stage 3 state vector estimation and fusion with Stage 2 persona."""

from __future__ import annotations

from datetime import datetime

import numpy as np

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage2 import PersonaModel, PsychologicalState
from app.models.stage3 import BehavioralStateModel
from app.pipeline.behavioral_taxonomy import classify_behavior
from app.pipeline.stage1_extract import extract_quick_emotion


STATE_DIM = 6
INPUT_LABELS = ["engagement_slope", "topic_drift", "burst_intensity", "emotional_volatility"]


def _post_timestamps_days(matrix: ProfileSignalMatrix) -> np.ndarray:
    if not matrix.post_timestamps:
        return np.arange(len(matrix.captions), dtype=float)
    t0 = matrix.post_timestamps[0]
    days: list[float] = []
    for ts in matrix.post_timestamps:
        if isinstance(ts, datetime):
            days.append((ts - t0).total_seconds() / 86400.0)
        else:
            days.append(float(len(days)))
    return np.array(days, dtype=float)


def _engagement_vs_baseline(matrix: ProfileSignalMatrix, index: int) -> float:
    rates = matrix.engagement_rates
    if not rates or index >= len(rates):
        return 0.5
    baseline = float(np.median(rates))
    if baseline < 1e-8:
        return min(1.0, rates[index] * 100)
    ratio = rates[index] / baseline
    return float(np.clip(ratio / 2.0, 0, 1))


def _stability_at_index(matrix: ProfileSignalMatrix, index: int, window: int = 5) -> float:
    n = len(matrix.captions)
    start = max(0, index - window + 1)
    caps = matrix.caption_lengths[start : index + 1] if matrix.caption_lengths else [10]
    engs = matrix.engagement_rates[start : index + 1] if matrix.engagement_rates else [0.01]
    if len(caps) < 2:
        return 0.5
    cap_cv = float(np.std(caps) / (np.mean(caps) + 1e-6))
    eng_cv = float(np.std(engs) / (np.mean(engs) + 1e-6))
    return float(np.clip(1.0 - min(1.0, (cap_cv + eng_cv) / 2), 0, 1))


def _connectivity_at_index(matrix: ProfileSignalMatrix, index: int) -> float:
    ht = len(matrix.hashtag_sets[index]) if index < len(matrix.hashtag_sets) else 0
    interval_reg = 0.5
    if matrix.posting_intervals_hours and index < len(matrix.posting_intervals_hours):
        gap = matrix.posting_intervals_hours[index]
        interval_reg = float(np.clip(1.0 - min(gap / 168.0, 1.0), 0, 1))
    tag_score = min(1.0, ht / 8.0)
    return float(np.clip(0.55 * tag_score + 0.45 * interval_reg, 0, 1))


def _ideological_intensity(caption: str, valence: float, arousal: float) -> float:
    c = caption.lower()
    moral = len([w for w in ("must", "should", "wrong", "right", "truth", "fight", "justice", "believe") if w in c])
    frames = len([w for w in ("us", "they", "enemy", "system", "movement", "change", "resist") if w in c])
    score = moral * 0.08 + frames * 0.06 + abs(valence) * 0.35 + arousal * 0.25
    return float(np.clip(score, 0, 1))


def estimate_state_history(
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
) -> tuple[np.ndarray, np.ndarray, float, float]:
    """Return (states T×6, dt_days T-1, calendar_span, mean_interval)."""
    n = len(matrix.captions)
    if n == 0:
        return np.zeros((1, STATE_DIM)), np.array([7.0]), 0.0, 7.0

    day_series = _post_timestamps_days(matrix)
    calendar_span = float(day_series[-1] - day_series[0]) if n > 1 else 0.0
    if n > 1:
        dt_series = np.diff(day_series)
        dt_series = np.clip(dt_series, 0.25, 90.0)
    else:
        dt_series = np.array([7.0])

    mean_interval = float(np.mean(dt_series)) if len(dt_series) else 7.0

    states = []
    for i in range(n):
        emo = extract_quick_emotion(matrix.captions[i])
        v, a = emo["valence"], emo["arousal"]
        states.append([
            v,
            a,
            _stability_at_index(matrix, i),
            _connectivity_at_index(matrix, i),
            _engagement_vs_baseline(matrix, i),
            _ideological_intensity(matrix.captions[i], v, a),
        ])

    return np.array(states, dtype=float), dt_series, calendar_span, mean_interval


def _state_from_array(arr: np.ndarray) -> PsychologicalState:
    return PsychologicalState(
        valence=float(arr[0]),
        arousal=float(arr[1]),
        stability=float(arr[2]),
        connectivity=float(arr[3]),
        engagement=float(arr[4]),
        ideological=float(arr[5]),
    )


def persona_to_array(persona: PersonaModel) -> np.ndarray:
    cs = persona.current_state
    return np.array([cs.valence, cs.arousal, cs.stability, cs.connectivity, cs.engagement, cs.ideological])


def fuse_states(
    measured: np.ndarray,
    persona: PersonaModel,
    ou_r_squared: float,
    n_posts: int,
) -> tuple[np.ndarray, float]:
    inferred = persona_to_array(persona)
    measured_last = measured[-1] if len(measured) else inferred

    if n_posts < 5 or ou_r_squared < 0.15:
        w_meas = 0.35
    elif ou_r_squared > 0.45 and n_posts >= 25:
        w_meas = 0.72
    else:
        w_meas = 0.55

    fused = w_meas * measured_last + (1.0 - w_meas) * inferred
    fused[0] = float(np.clip(fused[0], -1, 1))
    fused[1:] = np.clip(fused[1:], 0, 1)

    return fused, w_meas


def build_external_inputs(derived: DerivedSignals, n_transitions: int) -> np.ndarray:
    burst = min(1.0, len(derived.burst_events) * 0.25)
    u = np.array([
        derived.engagement_slope * 50,
        derived.topic_drift_score,
        burst,
        derived.emotional_volatility,
    ])
    return np.tile(u, (max(1, n_transitions), 1))


def build_behavioral_state_model(
    matrix: ProfileSignalMatrix,
    derived: DerivedSignals,
    persona: PersonaModel,
    state_history: np.ndarray,
    fused: np.ndarray,
    w_meas: float,
    calendar_span: float,
    mean_interval: float,
) -> BehavioralStateModel:
    measured_last = state_history[-1] if len(state_history) else fused
    inferred = persona_to_array(persona)
    return BehavioralStateModel(
        measured_state=_state_from_array(measured_last),
        inferred_state=_state_from_array(inferred),
        fused_state=_state_from_array(fused),
        fusion_weight_measured=w_meas,
        behavioral_profile=classify_behavior(matrix, derived),
        calendar_span_days=calendar_span,
        mean_post_interval_days=mean_interval,
    )
