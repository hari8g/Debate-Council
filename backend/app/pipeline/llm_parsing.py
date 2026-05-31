"""Parse numeric values from LLM JSON that may use words instead of numbers."""
from __future__ import annotations

import re
from typing import Any

CONFIDENCE_WORDS = {
    "very low": 0.2,
    "low": 0.35,
    "medium": 0.55,
    "moderate": 0.55,
    "high": 0.75,
    "very high": 0.9,
}


def parse_confidence(value: Any, default: float = 0.5) -> float:
    if value is None:
        return default
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        v = float(value)
        if v > 1.0 and v <= 100.0:
            return v / 100.0
        return max(0.0, min(1.0, v))
    if isinstance(value, str):
        s = value.strip().lower()
        if s in CONFIDENCE_WORDS:
            return CONFIDENCE_WORDS[s]
        if s.endswith("%"):
            try:
                return max(0.0, min(1.0, float(s[:-1]) / 100.0))
            except ValueError:
                pass
        try:
            v = float(s)
            if v > 1.0 and v <= 100.0:
                return v / 100.0
            return max(0.0, min(1.0, v))
        except ValueError:
            return default
    return default


def parse_numeric(value: Any, default: float = 0.0, lo: float | None = None, hi: float | None = None) -> float:
    if isinstance(value, (int, float)):
        v = float(value)
    elif isinstance(value, str):
        s = value.strip().lower()
        if s in CONFIDENCE_WORDS:
            v = CONFIDENCE_WORDS[s]
        else:
            try:
                v = float(s)
            except ValueError:
                return default
    else:
        return default
    if lo is not None:
        v = max(lo, v)
    if hi is not None:
        v = min(hi, v)
    return v


def parse_big_five(data: Any) -> dict[str, float]:
    if not isinstance(data, dict):
        return {}
    level_words = {"low": 3.0, "medium": 5.5, "moderate": 5.5, "high": 8.0}
    out: dict[str, float] = {}
    for trait, raw in data.items():
        if isinstance(raw, str) and raw.strip().lower() in level_words:
            out[trait] = level_words[raw.strip().lower()]
        else:
            try:
                out[trait] = parse_numeric(raw, default=5.0, lo=0.0, hi=10.0)
            except (TypeError, ValueError):
                continue
    return out


def parse_text_field(value: Any, default: str = "") -> str:
    """Coerce LLM fields that should be strings but may arrive as nested objects."""
    if value is None:
        return default
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        parts = [parse_text_field(v) for v in value]
        return "; ".join(p for p in parts if p)
    if isinstance(value, dict):
        for key in ("summary", "text", "insight", "key_insight", "description", "content"):
            if key in value and value[key]:
                return parse_text_field(value[key])
        return format_evidence(value)
    return str(value)


def format_evidence(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "; ".join(format_evidence(v) for v in value if v)
    if isinstance(value, dict):
        parts = []
        for k, v in value.items():
            if v:
                parts.append(f"{k}: {format_evidence(v)}")
        return "; ".join(parts)
    return str(value)


def normalize_agent_analysis(analysis: dict[str, Any]) -> dict[str, Any]:
    out = dict(analysis)
    if "confidence" in out:
        out["confidence"] = parse_confidence(out["confidence"])
    if "big_five" in out:
        out["big_five"] = parse_big_five(out.get("big_five"))
    if "evidence" in out:
        out["evidence"] = format_evidence(out["evidence"])
    return out


_PSYCH_FIELDS = ("valence", "arousal", "stability", "connectivity", "engagement", "ideological")
_SECTION_KEYS = (
    "core_identity",
    "psychological_profile",
    "social_strategy",
    "narrative_self_model",
    "revealed_preferences",
    "cultural_identity",
    "temporal_state",
    "genuine_uncertainties",
)


def _normalize_section(section: Any) -> dict[str, Any]:
    if isinstance(section, str):
        return {"summary": section, "claims": []}
    if not isinstance(section, dict):
        return {"summary": str(section) if section else "", "claims": []}
    out = dict(section)
    out["summary"] = parse_text_field(out.get("summary", ""))
    claims = []
    for c in out.get("claims") or []:
        if not isinstance(c, dict):
            continue
        claims.append(
            {
                "claim": str(c.get("claim", "")),
                "confidence": parse_confidence(c.get("confidence", 0.5)),
                "evidence": format_evidence(c.get("evidence", "")),
            }
        )
    out["claims"] = claims
    return out


def normalize_synthesis_result(result: dict[str, Any]) -> dict[str, Any]:
    """Coerce LLM synthesis JSON so numeric fields never use words like 'Medium'."""
    out = dict(result)
    for key in _SECTION_KEYS:
        if key in out:
            out[key] = _normalize_section(out[key])

    cs = out.get("current_state")
    if isinstance(cs, dict):
        out["current_state"] = {
            field: parse_numeric(cs.get(field, 0.5 if field != "valence" else 0.0), default=0.5 if field != "valence" else 0.0)
            for field in _PSYCH_FIELDS
        }
    elif cs is not None:
        out["current_state"] = {}

    if "big_five" in out:
        out["big_five"] = parse_big_five(out.get("big_five"))

    if "summary" in out:
        out["summary"] = parse_text_field(out.get("summary", ""))
    if "key_insight" in out:
        out["key_insight"] = parse_text_field(out.get("key_insight", ""))

    return out
