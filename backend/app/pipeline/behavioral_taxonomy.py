"""Deterministic behavioral classification from Stage 1 derived signals."""

from __future__ import annotations

import numpy as np

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix
from app.models.stage3 import BehavioralProfile


def classify_behavior(matrix: ProfileSignalMatrix, derived: DerivedSignals) -> BehavioralProfile:
    n = len(matrix.captions)
    intervals = matrix.posting_intervals_hours

    if intervals:
        mean_h = float(np.mean(intervals))
        cv = float(np.std(intervals) / (mean_h + 1e-6))
    else:
        cv = 1.0

    burst_count = len(derived.burst_events)
    if derived.posting_regularity > 0.65 and burst_count == 0:
        rhythm = "regular"
    elif burst_count >= 2 or cv > 1.2:
        rhythm = "bursty"
    elif n >= 5 and derived.posting_regularity < 0.35:
        rhythm = "dormant_return"
    else:
        rhythm = "irregular"

    eng_slope = derived.engagement_slope
    ff_ratio = matrix.follower_following_ratio
    if eng_slope > 0.002 and ff_ratio < 2:
        engagement_strategy = "growth_chasing"
    elif derived.persona_consistency_score > 0.6 and abs(eng_slope) < 0.001:
        engagement_strategy = "community"
    else:
        engagement_strategy = "broadcast"

    if matrix.caption_lengths:
        mean_cap = float(np.mean(matrix.caption_lengths))
        video_share = sum(1 for t in matrix.post_types if t in ("video", "reel", "clips")) / max(n, 1)
        if video_share > 0.55:
            content_mode = "visual"
        elif mean_cap > 120:
            content_mode = "textual"
        else:
            content_mode = "mixed"
    else:
        content_mode = "mixed"

    if derived.topic_drift_score > 0.45:
        topic_commitment = "pivoting"
    elif derived.topic_drift_score > 0.25:
        topic_commitment = "drifting"
    else:
        topic_commitment = "stable_niche"

    vol = derived.emotional_volatility
    if vol > 0.35:
        affect_pattern = "volatile"
    elif vol < 0.12:
        affect_pattern = "stable"
    else:
        captions = matrix.captions[: min(n, 30)]
        if len(captions) >= 8:
            from app.pipeline.stage1_extract import extract_quick_emotion

            vals = [extract_quick_emotion(c)["valence"] for c in captions]
            if len(vals) >= 6:
                ac = np.corrcoef(vals[:-3], vals[3:])[0, 1] if np.std(vals) > 1e-6 else 0
                affect_pattern = "cyclical" if ac < -0.25 else "moderate"
            else:
                affect_pattern = "moderate"
        else:
            affect_pattern = "moderate"

    summary = (
        f"Posting rhythm: {rhythm.replace('_', ' ')}; "
        f"engagement: {engagement_strategy.replace('_', ' ')}; "
        f"content: {content_mode}; "
        f"topics: {topic_commitment.replace('_', ' ')}; "
        f"affect: {affect_pattern}."
    )

    return BehavioralProfile(
        rhythm=rhythm,
        engagement_strategy=engagement_strategy,
        content_mode=content_mode,
        topic_commitment=topic_commitment,
        affect_pattern=affect_pattern,
        summary=summary,
    )
