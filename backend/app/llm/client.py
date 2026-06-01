import asyncio
import json
import logging
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_RETRYABLE_EXCEPTIONS = (
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.WriteTimeout,
    httpx.PoolTimeout,
    httpx.ConnectError,
    httpx.RemoteProtocolError,
    httpx.NetworkError,
)

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


def _effective_max_retries() -> int:
    retries = settings.llm_max_retries
    if retries < 0:
        logger.warning("LLM_MAX_RETRIES=%s is invalid; using 4", retries)
        retries = 4
    return min(retries, 10)


def _llm_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        connect=settings.llm_connect_timeout,
        read=settings.llm_read_timeout,
        write=60.0,
        pool=30.0,
    )


def _retry_delay(attempt: int) -> float:
    return min(2.0 ** attempt * 2.0, 45.0)


async def call_llm_async(system: str, prompt: str, json_mode: bool = True) -> dict[str, Any]:
    api_key = (settings.llm_api_key or "").strip()
    if not api_key:
        return _mock_llm_response(system, prompt)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    base_url = (settings.llm_base_url or "https://api.openai.com/v1").strip().rstrip("/")
    url = f"{base_url}/chat/completions"
    max_attempts = max(1, _effective_max_retries() + 1)
    last_error: Exception | None = None
    attempts_made = 0

    for attempt in range(max_attempts):
        attempts_made += 1
        try:
            async with httpx.AsyncClient(timeout=_llm_timeout()) as client:
                resp = await client.post(url, headers=headers, json=body)
                if resp.status_code in _RETRYABLE_STATUS:
                    last_error = httpx.HTTPStatusError(
                        f"HTTP {resp.status_code}",
                        request=resp.request,
                        response=resp,
                    )
                    if attempt < max_attempts - 1:
                        delay = _retry_delay(attempt)
                        logger.warning(
                            "LLM HTTP %s — retry %d/%d in %.0fs (%s)",
                            resp.status_code,
                            attempt + 1,
                            _effective_max_retries(),
                            delay,
                            url,
                        )
                        await asyncio.sleep(delay)
                        continue
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"]
                if json_mode:
                    return json.loads(content)
                return {"text": content}
        except _RETRYABLE_EXCEPTIONS as exc:
            last_error = exc
            if attempt >= max_attempts - 1:
                break
            delay = _retry_delay(attempt)
            logger.warning(
                "LLM %s — retry %d/%d in %.0fs (%s)",
                type(exc).__name__,
                attempt + 1,
                _effective_max_retries(),
                delay,
                url,
            )
            await asyncio.sleep(delay)
        except httpx.HTTPStatusError as exc:
            last_error = exc
            if exc.response.status_code in _RETRYABLE_STATUS and attempt < max_attempts - 1:
                delay = _retry_delay(attempt)
                logger.warning(
                    "LLM HTTP %s — retry %d/%d in %.0fs",
                    exc.response.status_code,
                    attempt + 1,
                    _effective_max_retries(),
                    delay,
                )
                await asyncio.sleep(delay)
                continue
            detail = exc.response.text[:200] if exc.response is not None else str(exc)
            raise RuntimeError(
                f"LLM API error {exc.response.status_code} from {base_url}: {detail}"
            ) from exc
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            last_error = exc
            if attempt >= max_attempts - 1:
                break
            delay = _retry_delay(attempt)
            logger.warning("LLM response parse error — retry %d/%d in %.0fs", attempt + 1, _effective_max_retries(), delay)
            await asyncio.sleep(delay)

    hint = (
        "Check network/VPN, LLM_BASE_URL, and API key. "
        "Transient timeouts are retried automatically."
    )
    if last_error is None:
        error_detail = "no response received"
    elif isinstance(last_error, httpx.HTTPStatusError) and last_error.response is not None:
        error_detail = f"HTTP {last_error.response.status_code}"
    else:
        error_detail = type(last_error).__name__

    raise RuntimeError(
        f"LLM API unreachable after {attempts_made} attempt(s) "
        f"({error_detail} @ {base_url}). {hint}"
    ) from last_error


def _mock_llm_response(system: str, prompt: str) -> dict[str, Any]:
    agent_match = re.search(r"You are the (\w+)", system)
    agent = agent_match.group(1) if agent_match else "analyst"

    if "synthesis" in system.lower():
        return {
            "summary": "A politically engaged commentator with moderate emotional volatility.",
            "key_insight": "Increasing caption length suggests growing need to elaborate positions.",
            "core_identity": {
                "summary": "Externally reactive political commentator.",
                "claims": [
                    {
                        "claim": "Politically engaged with institutional failure framing",
                        "confidence": 0.72,
                        "evidence": "Burst events correlate with political events",
                    }
                ],
            },
            "psychological_profile": {
                "summary": "Moderate Neuroticism, high Openness.",
                "claims": [
                    {"claim": "Moderate Neuroticism", "confidence": 0.62, "evidence": "Emotional volatility 0.61"}
                ],
            },
            "social_strategy": {"summary": "Bridging political capital.", "claims": []},
            "narrative_self_model": {"summary": "Redemption arc with political focus.", "claims": []},
            "revealed_preferences": {"summary": "Values political commentary over audience growth.", "claims": []},
            "cultural_identity": {"summary": "South Asian digital semiotics.", "claims": []},
            "temporal_state": {"summary": "Approaching content transition.", "claims": []},
            "genuine_uncertainties": {
                "summary": "Private life events not visible.",
                "claims": [{"claim": "Personal relationships unknown", "confidence": 0.2, "evidence": "Absence of signal"}],
            },
            "current_state": {
                "valence": -0.12,
                "arousal": 0.58,
                "stability": 0.61,
                "connectivity": 0.72,
                "engagement": 0.48,
                "ideological": 0.64,
            },
            "big_five": {
                "openness": 7.5,
                "conscientiousness": 5.0,
                "extraversion": 6.0,
                "agreeableness": 4.5,
                "neuroticism": 6.5,
            },
        }

    if "cross-examination" in system.lower() or "challenge_evaluations" in prompt.lower():
        challengers = re.findall(r"challenger_id:\s*(\w+)", prompt)
        evaluations = []
        verdicts = ["reject", "partial", "accept", "reject", "partial"]
        for i, cid in enumerate(challengers):
            verdict = verdicts[i % len(verdicts)]
            delta = 0.0
            if verdict == "accept":
                delta = -0.08
            elif verdict == "partial":
                delta = -0.04
            evaluations.append(
                {
                    "challenger": cid,
                    "verdict": verdict,
                    "rationale": (
                        f"The {cid} challenge {'misreads the evidence base' if verdict == 'reject' else 'identifies a nuance worth integrating' if verdict == 'partial' else 'correctly flags a gap in the original framing'} "
                        f"when applied to the specific posting rhythm and caption structure visible in the signal matrix."
                    ),
                    "response": f"Addressing {cid}: the objection is {'rebutted on timing grounds' if verdict == 'reject' else 'partially incorporated' if verdict == 'partial' else 'accepted with revised framing'}.",
                    "confidence_delta": delta,
                }
            )
        return {
            "revised_hypothesis": "Politically engaged commentator with event-gated reactivity — revised after per-challenge review.",
            "key_claim": "Moderate reactivity externally triggered; core identity claim survives with nuance.",
            "evidence": "Burst alignment with political events; sustained posting during low-engagement windows.",
            "challenge_evaluations": evaluations,
        }

    if "challenge with:" in prompt.lower() or (
        "challenge" in prompt.lower()[:200] and "challenger_id" not in prompt.lower()
    ):
        return {
            "contradiction": "Alternative explanation via external events",
            "weakest_link": "Assumes internal anxiety without ruling out external triggers",
            "refutation_data": "Burst dates align with political events",
            "challenge_summary": "May be externally-reactive commentator, not anxious attachment.",
        }

    if "challenges from other analysts" in prompt.lower() or "challenges_received" in prompt.lower():
        return {
            "valid_challenges": ["External event correlation"],
            "invalid_challenges": [],
            "revised_hypothesis": "Politically engaged commentator becoming more defensive over time.",
            "key_claim": "Moderate Neuroticism, not high — externally reactive pattern.",
            "confidence": 0.62,
            "additional_evidence_needed": "Private messaging patterns",
        }

    if "future state" in prompt.lower() or "future narrative" in system.lower():
        return {
            "next_30_days": "Continued institutional failure framing with elevated emotional activation.",
            "next_90_days": "28% probability of major topic shift; 44% political intensification.",
            "six_month_horizon": "Path A: deeper ideological commitment (44%). Path B: disruption via personal event (56%).",
            "epistemic_limits": "Cannot predict private life events from Instagram alone.",
        }

    return {
        "key_hypothesis": f"{agent} hypothesis: profile shows consistent patterns in their domain.",
        "key_claim": f"Primary {agent} observation about behavioural patterns.",
        "evidence": "Derived from posting rhythm, engagement trends, and caption analysis.",
        "confidence": 0.68,
        "big_five": {"openness": 7.0, "conscientiousness": 5.5, "extraversion": 6.0, "agreeableness": 5.0, "neuroticism": 6.0},
        "attachment_style": "anxious-secure hybrid",
        "identity_status": "moratorium",
        "self_monitoring": "high",
        "capital_types": {"cultural": 0.7, "social": 0.6, "symbolic": 0.5, "economic": 0.3},
        "narrative_arc": "ascent",
        "protagonist_role": "commentator",
        "antagonist": "institutional failure",
        "revealed_values": ["political engagement", "audience validation"],
        "change_points": [{"index": 45, "description": "Engagement spike", "date": "2025-09"}],
        "trajectory": "volatile_improving",
        "tribal_affiliations": ["political commentator", "regional identity"],
        "refutation_evidence": "Consistent posting during low-engagement periods would refute anxious attachment.",
    }
