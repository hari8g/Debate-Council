"""
Adaptive, profile-contextual narrative theme discovery.

Discovers themes from this account's hashtags and captions, then measures whether
each theme is growing, fading, or steady — using metrics that map to posting
behaviour, not opaque epidemiology jargon.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from typing import Any

import numpy as np
from scipy.integrate import odeint
from scipy.optimize import curve_fit

from app.models.stage1 import ProfileSignalMatrix
from app.models.stage2 import PersonaModel
from app.models.stage3 import PersonalR0Estimate

STOPWORDS = {
    "this", "that", "with", "from", "have", "been", "will", "your", "they",
    "what", "when", "where", "which", "about", "just", "like", "really", "into",
    "https", "http", "instagram", "reels", "video", "photo", "share", "follow",
}

# Methodology-era template labels — never use as seeds; only appear in stale mock data.
LEGACY_TEMPLATE_STRAINS = {
    "institutional_failure", "political_mobilisation", "political_mobilization",
    "aspiration_shift", "celebration", "content_theme",
}


def _caption_words(caption: str) -> list[str]:
    return [w for w in re.findall(r"\b[a-z]{4,}\b", caption.lower()) if w not in STOPWORDS]


def _format_tag(tag: str) -> str:
    t = tag.lower().lstrip("#")
    return f"#{t}" if t else ""


def _build_hashtag_clusters(matrix: ProfileSignalMatrix, max_strains: int) -> list[dict[str, Any]]:
    """Cluster hashtags by co-occurrence on the same post."""
    n = len(matrix.captions)
    if n == 0:
        return []

    tag_counts: Counter[str] = Counter()
    cooccur: dict[str, Counter[str]] = defaultdict(Counter)

    for tags in matrix.hashtag_sets:
        normalized = [t.lower().lstrip("#") for t in tags if t.strip()]
        for t in normalized:
            tag_counts[t] += 1
        for i, a in enumerate(normalized):
            for b in normalized[i + 1 :]:
                cooccur[a][b] += 1
                cooccur[b][a] += 1

    candidates: list[tuple[str, int, set[str]]] = []
    used: set[str] = set()

    for seed, count in tag_counts.most_common(max_strains * 3):
        if seed in used or count < 2:
            continue
        cluster = {seed}
        for neighbor, _ in cooccur[seed].most_common(4):
            if tag_counts[neighbor] >= 2:
                cluster.add(neighbor)
        used.update(cluster)
        candidates.append((seed, count, cluster))

    if not candidates:
        word_counts: Counter[str] = Counter()
        for cap in matrix.captions:
            word_counts.update(_caption_words(cap))
        for word, count in word_counts.most_common(max_strains * 2):
            if count >= 2:
                candidates.append((word, count, {word}))

    strains: list[dict[str, Any]] = []
    for seed, _count, cluster in candidates[: max_strains * 2]:
        keywords: set[str] = set(cluster)
        evidence_indices: list[int] = []

        for i, cap in enumerate(matrix.captions):
            tags = [t.lower().lstrip("#") for t in (matrix.hashtag_sets[i] if i < len(matrix.hashtag_sets) else [])]
            if cluster.intersection(tags) or seed in cap.lower():
                evidence_indices.append(i)
                keywords.update(tags[:6])
                keywords.update(_caption_words(cap)[:6])

        if len(evidence_indices) < 2:
            continue

        tag_labels = [_format_tag(t) for t in sorted(cluster, key=lambda t: -tag_counts.get(t, 0))[:3]]
        if tag_labels:
            label = " · ".join(tag_labels)
        else:
            label = seed.replace("_", " ").title()

        strain_type = re.sub(r"[^a-z0-9_]+", "_", seed.lower())[:40]
        if strain_type in LEGACY_TEMPLATE_STRAINS:
            continue

        kw_list = sorted(keywords)[:18]
        strains.append({
            "strain_type": strain_type,
            "label": label,
            "keywords": kw_list,
            "seed": seed,
            "cluster": cluster,
            "evidence_indices": evidence_indices,
        })
        if len(strains) >= max_strains:
            break

    return strains


def discover_profile_strains(
    matrix: ProfileSignalMatrix,
    persona: PersonaModel | None = None,
    max_strains: int = 4,
) -> list[dict[str, Any]]:
    """Build theme definitions from hashtags, caption words, and persona context."""
    strains = _build_hashtag_clusters(matrix, max_strains)

    if persona and strains:
        persona_words = set()
        blob = f"{persona.summary} {persona.key_insight}"
        persona_words.update(_caption_words(blob)[:25])
        for strain in strains:
            overlap = persona_words.intersection(strain["cluster"])
            if overlap:
                strain["keywords"] = sorted(set(strain["keywords"]) | overlap)[:18]

    return strains[:max_strains]


def compute_strain_activation_series(
    matrix: ProfileSignalMatrix,
    strain_def: dict[str, Any],
) -> tuple[list[float], list[int], list[str]]:
    """Engagement-weighted theme presence 0–1 per post, oldest → newest."""
    keywords = [k.lower().lstrip("#") for k in strain_def.get("keywords", [])]
    seed = strain_def.get("seed", "").lower()
    cluster = strain_def.get("cluster", {seed})
    series: list[float] = []
    active_indices: list[int] = []
    evidence: list[str] = []

    for i, cap in enumerate(matrix.captions):
        tags = [t.lower().lstrip("#") for t in (matrix.hashtag_sets[i] if i < len(matrix.hashtag_sets) else [])]
        text = cap.lower()
        hits = sum(1 for kw in keywords if kw in text or kw in tags)
        if cluster.intersection(set(tags)) or seed in text or seed in tags:
            hits += 2
        base = min(1.0, hits / max(len(keywords), 1))
        eng = matrix.engagement_rates[i] if i < len(matrix.engagement_rates) else 0.01
        score = float(min(1.0, base * 0.7 + min(eng * 80, 0.3)))
        series.append(score)
        if score > 0.08:
            active_indices.append(i)
            if len(evidence) < 3:
                evidence.append(cap[:140])

    return series, active_indices, evidence


def _compute_momentum(history: list[float]) -> tuple[float, str, float, float]:
    n = len(history)
    if n < 4:
        return 1.0, "steady", 0.0, 0.0
    third = max(1, n // 3)
    early = float(np.mean(history[:third]))
    recent = float(np.mean(history[-third:]))
    ratio = recent / max(early, 0.02)
    if ratio >= 1.3:
        return ratio, "growing", early, recent
    if ratio <= 0.7:
        return ratio, "fading", early, recent
    return ratio, "steady", early, recent


def _sir_fit(history: list[float], dt_days: float) -> tuple[float, float, float, list[float], str, float]:
    if len(history) < 6 or float(np.std(history)) < 0.02:
        return 0.1, 0.12, 1.0, [float("inf"), float("inf")], "limited", 0.0

    t = np.arange(len(history)) * dt_days
    hist_arr = np.array(history)

    def sir_model(t_arr, beta, gamma):
        def equations(y, _t):
            s, inf, r = y
            return [-beta * s * inf, beta * s * inf - gamma * inf, gamma * inf]

        y0 = [0.92, max(float(hist_arr[0]), 0.05), 0.03]
        sol = odeint(equations, y0, t_arr)
        return sol[:, 1]

    try:
        popt, pcov = curve_fit(
            sir_model, t, hist_arr,
            p0=[0.18, 0.12], bounds=([0.01, 0.01], [2.0, 1.5]), maxfev=8000,
        )
        beta, gamma = float(popt[0]), float(popt[1])
        r0 = beta / max(gamma, 1e-6)
        uncertainty = np.sqrt(np.diag(pcov)).tolist()
        predicted = sir_model(t, beta, gamma)
        ss_res = float(np.sum((hist_arr - predicted) ** 2))
        ss_tot = float(np.sum((hist_arr - np.mean(hist_arr)) ** 2))
        fit_r2 = max(0.0, 1.0 - ss_res / (ss_tot + 1e-6))
        quality = "sufficient" if fit_r2 > 0.25 and len(history) >= 8 else "moderate" if fit_r2 > 0.1 else "limited"
    except Exception:
        beta, gamma, r0 = 0.12, 0.14, 1.0
        uncertainty = [float("inf"), float("inf")]
        quality = "limited"
        fit_r2 = 0.0

    return beta, gamma, r0, uncertainty, quality, fit_r2


def _detect_changepoints(history: list[float], min_segment: int = 3) -> list[int]:
    n = len(history)
    if n < min_segment * 2:
        return []
    third = max(min_segment, n // 3)
    best_idx, best_delta = -1, 0.0
    for i in range(third, n - third):
        early = float(np.mean(history[:i]))
        late = float(np.mean(history[i:]))
        delta = abs(late - early)
        if delta > best_delta:
            best_delta = delta
            best_idx = i
    return [best_idx] if best_idx >= 0 and best_delta > 0.08 else []


def _project_strain_forward(beta: float, gamma: float, i0: float, days: int, dt: float = 1.0) -> float:
    S, I, R = max(0.05, 0.9 - i0), i0, 0.05
    steps = max(1, int(days / dt))
    b, g = beta, gamma
    for _ in range(steps):
        dI = (b * S * I - g * I) * dt
        dS = (-b * S * I) * dt
        dR = g * I * dt
        S, I, R = S + dS, I + dI, R + dR
        S, I, R = max(0, S), max(0, I), max(0, R)
        t = S + I + R + 1e-8
        S, I, R = S / t, I / t, R / t
    return float(I)


def _plain_summary(
    label: str,
    posts_active: int,
    posts_total: int,
    trend: str,
    momentum_ratio: float,
    peak_idx: int,
) -> str:
    pct = posts_active / max(posts_total, 1)
    theme = label if label else "This theme"

    if trend == "growing":
        trend_line = f"showing up more in recent posts (~{momentum_ratio:.1f}× vs their early baseline)"
    elif trend == "fading":
        trend_line = f"appearing less often lately (~{momentum_ratio:.1f}× vs early posts)"
    else:
        trend_line = "holding steady across their posting history"

    peak_line = f" Strongest around post #{peak_idx + 1}." if peak_idx >= 0 else ""
    return (
        f"{theme} appears in {posts_active} of {posts_total} posts ({pct:.0%}) — {trend_line}.{peak_line}"
    )


def build_adaptive_strain_estimates(
    matrix: ProfileSignalMatrix,
    persona: PersonaModel | None = None,
    max_strains: int = 4,
) -> list[PersonalR0Estimate]:
    """Discover themes → measure momentum → optional SIR fit for advanced view."""
    defs = discover_profile_strains(matrix, persona, max_strains=max_strains)
    if not defs:
        return []

    intervals = matrix.posting_intervals_hours
    mean_gap_days = float(np.mean(intervals) / 24) if intervals else 7.0
    dt_days = max(1.0, min(14.0, mean_gap_days))
    n = len(matrix.captions)

    results: list[PersonalR0Estimate] = []
    for sd in defs:
        history, active_idx, evidence = compute_strain_activation_series(matrix, sd)
        if len(active_idx) < 2:
            continue

        momentum_ratio, trend, early_mean, recent_mean = _compute_momentum(history)
        beta, gamma, r0, uncertainty, quality, sir_r2 = _sir_fit(history, dt_days)

        # Trajectory driven by observable momentum, not fragile SIR fit
        if trend == "growing":
            trajectory = "expanding"
        elif trend == "fading":
            trajectory = "contracting"
        else:
            trajectory = "stable"

        peak = int(np.argmax(history)) if history else -1
        active_pct = len(active_idx) / max(n, 1)
        variance = float(np.var(history)) if history else 0.0
        relevance = min(1.0, active_pct * 0.5 + min(variance * 8, 0.3) + (0.2 if trend != "steady" else 0.0))

        plain = _plain_summary(sd["label"], len(active_idx), n, trend, momentum_ratio, peak)
        sir_reliable = quality != "limited" and sir_r2 > 0.15
        interpretation = plain
        if sir_reliable:
            sir_note = "expanding" if r0 > 1.15 else "contracting" if r0 < 0.85 else "stable"
            interpretation += f" Dynamics model ({sir_note}, R₀={r0:.2f}, fit R²={sir_r2:.2f})."

        changepoints = _detect_changepoints(history)
        proj30 = _project_strain_forward(beta, gamma, recent_mean, 30, dt_days)
        proj90 = _project_strain_forward(beta, gamma, recent_mean, 90, dt_days)
        proj180 = _project_strain_forward(beta, gamma, recent_mean, 180, dt_days)

        results.append(PersonalR0Estimate(
            strain_type=sd["strain_type"],
            label=sd["label"],
            keywords=sd["keywords"],
            beta=beta,
            gamma=gamma,
            r0=r0,
            uncertainty=uncertainty,
            data_quality=quality,
            trajectory=trajectory,
            activation_history=[round(v, 4) for v in history],
            peak_post_index=peak,
            evidence_captions=evidence,
            interpretation=interpretation,
            posts_active=len(active_idx),
            posts_total=n,
            plain_summary=plain,
            momentum_ratio=round(momentum_ratio, 3),
            trend_label=trend,
            prevalence_pct=round(active_pct * 100, 1),
            early_activation=round(early_mean, 4),
            recent_activation=round(recent_mean, 4),
            relevance_score=round(relevance, 3),
            sir_fit_r2=round(sir_r2, 4),
            metric_confidence="high" if relevance > 0.45 and len(active_idx) >= 4 else "moderate" if relevance > 0.25 else "low",
            sir_reliable=sir_reliable,
            changepoint_indices=changepoints,
            projected_activation_30d=round(proj30, 4),
            projected_activation_90d=round(proj90, 4),
            projected_activation_180d=round(proj180, 4),
        ))

    results.sort(key=lambda s: (s.relevance_score, s.posts_active), reverse=True)
    return results[:max_strains]
