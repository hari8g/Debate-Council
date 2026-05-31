import re
import time
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlparse

import numpy as np

from app.jobs.store import JobState
from app.config import settings
from app.models.stage1 import (
    BurstEvent,
    CommentData,
    DataCaptureReport,
    DerivedSignals,
    HighlightSnapshot,
    PostSample,
    ProfileEnrichment,
    ProfileMetadata,
    ProfileSignalMatrix,
    SignalSummary,
    StorySnapshot,
)
from app.streaming.events import (
    stage_complete,
    stage_start,
    substep_complete,
    substep_progress,
    substep_start,
)


def parse_instagram_username(url: str) -> str:
    url = url.strip().rstrip("/")
    if url.startswith("@"):
        return url[1:]
    parsed = urlparse(url if "://" in url else f"https://{url}")
    path = parsed.path.strip("/")
    parts = path.split("/")
    if parts and parts[0]:
        return parts[0].lstrip("@")
    raise ValueError(f"Could not parse Instagram username from: {url}")


def extract_quick_emotion(caption: str) -> dict[str, float]:
    positive = len(re.findall(r"\b(love|happy|grateful|amazing|best|joy|celebrate)\b", caption.lower()))
    negative = len(re.findall(r"\b(hate|angry|sad|worst|fail|crisis|wrong)\b", caption.lower()))
    exclamations = caption.count("!")
    valence = np.clip((positive - negative) / max(len(caption.split()), 1) * 5, -1, 1)
    arousal = np.clip(0.3 + exclamations * 0.1 + abs(valence) * 0.3, 0, 1)
    return {"valence": float(valence), "arousal": float(arousal)}


def detect_posting_bursts(intervals: list[float], threshold: float = 2.5) -> list[BurstEvent]:
    if len(intervals) < 3:
        return []
    mean_interval = np.mean(intervals)
    bursts: list[BurstEvent] = []
    i = 0
    while i < len(intervals):
        if intervals[i] < mean_interval / threshold:
            start = i
            while i < len(intervals) and intervals[i] < mean_interval / threshold:
                i += 1
            multiplier = mean_interval / (np.mean(intervals[start:i]) + 1e-6)
            bursts.append(
                BurstEvent(
                    start_index=start,
                    end_index=i - 1,
                    multiplier=float(multiplier),
                    description=f"Posting burst: {multiplier:.1f}x normal frequency",
                )
            )
        else:
            i += 1
    return bursts


def extract_topics(captions: list[str]) -> set[str]:
    words: set[str] = set()
    for cap in captions:
        for word in re.findall(r"\b[a-z]{4,}\b", cap.lower()):
            if word not in {"this", "that", "with", "from", "have", "been", "will", "your", "they"}:
                words.add(word)
    return words


def topic_overlap(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def compute_cross_modal_consistency(matrix: ProfileSignalMatrix) -> float:
    if len(matrix.captions) < 3:
        return 0.5
    caption_vars = np.std(matrix.caption_lengths) / (np.mean(matrix.caption_lengths) + 1e-6)
    engagement_vars = np.std(matrix.engagement_rates) / (np.mean(matrix.engagement_rates) + 1e-6)
    consistency = 1.0 - min(1.0, (caption_vars + engagement_vars) / 2)
    return float(consistency)


def compute_derived_signals(matrix: ProfileSignalMatrix) -> DerivedSignals:
    intervals = matrix.posting_intervals_hours
    posting_regularity = 0.0
    if intervals:
        posting_regularity = float(1.0 - (np.std(intervals) / (np.mean(intervals) + 1e-6)))
        posting_regularity = np.clip(posting_regularity, 0, 1)

    t = np.arange(len(matrix.engagement_rates)) if matrix.engagement_rates else np.array([])
    engagement_slope = 0.0
    caption_slope = 0.0
    hashtag_slope = 0.0
    if len(t) > 1:
        engagement_slope = float(np.polyfit(t, matrix.engagement_rates, 1)[0])
        caption_slope = float(np.polyfit(t, matrix.caption_lengths, 1)[0])
        hashtag_slope = float(np.polyfit(t, matrix.hashtag_counts, 1)[0])

    emotion_scores = [extract_quick_emotion(c) for c in matrix.captions]
    emotional_volatility = float(np.std([e["arousal"] for e in emotion_scores])) if emotion_scores else 0.0

    bursts = detect_posting_bursts(intervals)
    n = len(matrix.captions)
    early = matrix.captions[: max(1, n // 3)]
    recent = matrix.captions[-max(1, n // 3) :]
    topic_drift = 1.0 - topic_overlap(extract_topics(early), extract_topics(recent))

    return DerivedSignals(
        posting_regularity=posting_regularity,
        engagement_slope=engagement_slope,
        caption_length_slope=caption_slope,
        hashtag_slope=hashtag_slope,
        emotional_volatility=emotional_volatility,
        burst_events=bursts,
        topic_drift_score=float(topic_drift),
        persona_consistency_score=compute_cross_modal_consistency(matrix),
    )


def build_signal_summary(
    matrix: ProfileSignalMatrix,
    lookback_days: int,
    *,
    fetch_all_posts: bool = False,
) -> SignalSummary:
    samples: list[PostSample] = []
    n = len(matrix.captions)
    indices = list(range(0, n, max(1, n // 10)))[:10]

    detail_by_index = {}
    if matrix.enrichment:
        for d in matrix.enrichment.post_details:
            detail_by_index[d.post_index] = d

    for i in indices:
        cap = matrix.captions[i]
        detail = detail_by_index.get(i)
        samples.append(
            PostSample(
                index=i,
                timestamp=matrix.post_timestamps[i].isoformat() if i < len(matrix.post_timestamps) else "",
                caption_excerpt=cap[:120] + ("..." if len(cap) > 120 else ""),
                post_type=matrix.post_types[i] if i < len(matrix.post_types) else "image",
                likes=matrix.likes[i] if i < len(matrix.likes) else 0,
                comments=matrix.comments_counts[i] if i < len(matrix.comments_counts) else 0,
                engagement_rate=matrix.engagement_rates[i] if i < len(matrix.engagement_rates) else 0.0,
                hashtags=matrix.hashtag_sets[i] if i < len(matrix.hashtag_sets) else [],
                views=matrix.views[i] if i < len(matrix.views) else None,
                saves=matrix.saves[i] if i < len(matrix.saves) else None,
                location=detail.location_name if detail else None,
                shortcode=detail.shortcode if detail else None,
            )
        )
    period_days = lookback_days
    if matrix.post_timestamps:
        if fetch_all_posts and len(matrix.post_timestamps) >= 2:
            period_days = max(1, (matrix.post_timestamps[-1] - matrix.post_timestamps[0]).days)
        elif not fetch_all_posts:
            period_days = lookback_days

    return SignalSummary(
        username=matrix.username,
        bio=matrix.bio,
        follower_count=matrix.follower_count,
        following_count=matrix.following_count,
        posts_analysed=len(matrix.captions),
        analysis_period_days=period_days,
        fetch_all_posts=fetch_all_posts,
        post_samples=samples,
        enrichment=matrix.enrichment,
    )


def _demo_enrichment(username: str, n_posts: int) -> ProfileEnrichment:
    return ProfileEnrichment(
        metadata=ProfileMetadata(
            username=username,
            full_name="Demo Creator",
            biography=f"Digital commentator | {username}",
            is_verified=False,
            is_business=True,
            follower_count=50000,
            following_count=800,
            media_count=n_posts * 4,
            highlight_reel_count=3,
            reels_count=42,
            category="Creator",
            follower_following_ratio=50000 / 800,
            data_sources=["demo"],
        ),
        stories=[
            StorySnapshot(id="s1", media_type="video", caption="Behind the scenes today", mentions=["brandx"]),
        ],
        highlights=[
            HighlightSnapshot(id="h1", title="Travel", item_count=12),
            HighlightSnapshot(id="h2", title="Fitness", item_count=8),
        ],
        capture_report=DataCaptureReport(
            posts_fetched=n_posts,
            posts_enriched=min(5, n_posts),
            comments_fetched=45,
            likers_sampled=20,
            stories_fetched=1,
            highlights_fetched=2,
            quality_score=0.72,
            limitations=["Demo data — not live Instagram"],
        ),
    )


def _generate_demo_matrix(username: str, lookback_days: int) -> ProfileSignalMatrix:
    n_posts = min(180, max(30, lookback_days // 2))
    now = datetime.utcnow()
    timestamps = [now - timedelta(days=lookback_days - i * (lookback_days / n_posts)) for i in range(n_posts)]

    captions = [
        f"Post {i}: Reflecting on the state of things. #{['politics', 'life', 'culture'][i % 3]}"
        for i in range(n_posts)
    ]
    hashtags = [[f"tag{j}" for j in range(i % 5 + 1)] for i in range(n_posts)]
    likes = [int(500 + 200 * np.sin(i / 10) + np.random.randint(-50, 50)) for i in range(n_posts)]
    comments = [int(likes[i] * 0.05) for i in range(n_posts)]
    followers = 50000

    intervals = [
        float((timestamps[i + 1] - timestamps[i]).total_seconds() / 3600) for i in range(n_posts - 1)
    ]
    engagement_rates = [(likes[i] + comments[i]) / followers for i in range(n_posts)]

    return ProfileSignalMatrix(
        username=username,
        bio=f"Digital commentator | {username} | opinions are my own",
        bio_link="https://example.com",
        profile_category="Creator",
        account_age_days=lookback_days * 2,
        post_timestamps=timestamps,
        captions=captions,
        hashtag_sets=hashtags,
        image_urls=[f"https://example.com/img/{i}.jpg" for i in range(n_posts)],
        video_urls=[None] * n_posts,
        audio_tracks=[None] * n_posts,
        post_types=["image" if i % 3 else "reel" for i in range(n_posts)],
        likes=likes,
        comments_counts=comments,
        saves=[int(likes[i] * 0.02) for i in range(n_posts)],
        views=[int(likes[i] * 3) if i % 3 == 0 else None for i in range(n_posts)],
        comment_streams=[[CommentData(username="user1", text="Great post!", likes=5)] for _ in range(n_posts)],
        follower_count=followers,
        following_count=800,
        follower_following_ratio=followers / 800,
        posting_intervals_hours=intervals,
        engagement_rates=engagement_rates,
        engagement_velocities=engagement_rates,
        caption_lengths=[len(c.split()) for c in captions],
        hashtag_counts=[len(h) for h in hashtags],
        enrichment=_demo_enrichment(username, n_posts),
    )


async def extract_profile(job: JobState, emit: Any) -> tuple[ProfileSignalMatrix, DerivedSignals, SignalSummary]:
    ts = time.time()
    username = parse_instagram_username(job.url)

    emit(substep_start(job.job_id, ts, 1, "s1_resolve", "Resolve profile"))
    emit(substep_complete(job.job_id, ts, 1, "s1_resolve", {"username": username}))

    emit(substep_start(job.job_id, ts, 1, "s1_metadata", "Fetch profile metadata"))
    use_instaloader = True
    matrix: ProfileSignalMatrix | None = None

    try:
        matrix = await _extract_with_instaloader(job, emit, username)
    except Exception as e:
        if settings.use_mock_pipeline or not settings.instagram_username.strip():
            use_instaloader = False
            emit(
                substep_progress(
                    job.job_id, time.time(), 1, "s1_metadata",
                    f"Instagram extraction failed ({type(e).__name__}: {e}). Using demo data.",
                )
            )
            matrix = _generate_demo_matrix(username, job.lookback_days)
            emit(substep_complete(
                job.job_id, time.time(), 1, "s1_metadata",
                {"username": username, "source": "demo", "follower_count": matrix.follower_count},
            ))
            emit(substep_complete(job.job_id, time.time(), 1, "s1_posts", {"posts_analysed": len(matrix.captions), "mock": True}))
            emit(substep_complete(job.job_id, time.time(), 1, "s1_stories", {"stories": 1, "highlights": 2}))
            emit(substep_complete(job.job_id, time.time(), 1, "s1_engagement", {"posts_enriched": 5, "mock": True}))
        else:
            raise RuntimeError(
                f"Instagram extraction failed ({type(e).__name__}: {e}). "
                "Transient SSL/network errors are retried automatically — if this persists, "
                "check VPN/firewall and re-import your session: python scripts/import_instagram_session.py"
            ) from e

    emit(substep_start(job.job_id, time.time(), 1, "s1_matrix", "Build signal matrix"))
    emit(
        substep_complete(
            job.job_id, time.time(), 1, "s1_matrix",
            matrix.model_dump(mode="json"),
        )
    )

    emit(substep_start(job.job_id, time.time(), 1, "s1_derived", "Compute derived signals"))
    derived = compute_derived_signals(matrix)
    emit(
        substep_complete(
            job.job_id, time.time(), 1, "s1_derived",
            derived.model_dump(mode="json"),
        )
    )

    summary = build_signal_summary(matrix, job.lookback_days, fetch_all_posts=job.fetch_all_posts)
    emit(
        substep_complete(
            job.job_id, time.time(), 1, "s1_summary",
            summary.model_dump(mode="json"),
        )
    )

    return matrix, derived, summary


async def _extract_with_instaloader(job: JobState, emit: Any, username: str) -> ProfileSignalMatrix:
    import asyncio
    from datetime import datetime as dt, timedelta as td

    from app.pipeline.instagram_client import (
        collect_posts_in_lookback,
        create_instaloader,
        fetch_profile,
    )
    from app.pipeline.profile_enrichment import enrich_profile_data, parse_profile_metadata

    def _sync_extract() -> ProfileSignalMatrix:
        L = create_instaloader()
        profile = fetch_profile(L, username)

        meta = parse_profile_metadata(profile)
        emit(substep_complete(
            job.job_id, time.time(), 1, "s1_metadata",
            {
                "username": meta.username,
                "bio": meta.biography,
                "follower_count": meta.follower_count,
                "following_count": meta.following_count,
                "full_name": meta.full_name,
                "is_verified": meta.is_verified,
                "media_count": meta.media_count,
                "source": "instaloader",
            },
        ))


        emit(substep_start(job.job_id, time.time(), 1, "s1_posts", "Fetch posts"))

        def post_progress(msg: str) -> None:
            emit(substep_progress(job.job_id, time.time(), 1, "s1_posts", msg))

        posts_data, pages_scanned, fetch_report = collect_posts_in_lookback(
            L,
            profile,
            job.lookback_days,
            fetch_all=job.fetch_all_posts,
            progress_cb=post_progress,
            expected_media_count=meta.media_count or None,
        )
        n = len(posts_data)
        expected = fetch_report.get("expected_media_count")

        if n == 0:
            emit(
                substep_progress(
                    job.job_id, time.time(), 1, "s1_posts",
                    f"No posts returned after scanning {pages_scanned} page(s) across all sources",
                )
            )
        elif fetch_report.get("under_collected"):
            emit(
                substep_progress(
                    job.job_id, time.time(), 1, "s1_posts",
                    f"Fetched {n} posts ({pages_scanned} pages) — profile lists {expected} total; "
                    f"clips added {fetch_report.get('clips_added', 0)}",
                )
            )
        else:
            sources = ", ".join(fetch_report.get("sources_used") or [])
            if job.fetch_all_posts:
                msg = f"Fetched {n} posts — full archive ({pages_scanned} pages via {sources or 'feed'})"
            else:
                msg = (
                    f"Fetched {n} posts from last {job.lookback_days} days "
                    f"({pages_scanned} pages via {sources or 'feed'})"
                )
            emit(
                substep_progress(
                    job.job_id, time.time(), 1, "s1_posts",
                    msg,
                )
            )

        emit(substep_complete(
            job.job_id, time.time(), 1, "s1_posts",
            {
                "posts_analysed": n,
                "pages_scanned": pages_scanned,
                "fetch_report": fetch_report,
            },
        ))

        def progress(msg: str) -> None:
            emit(substep_progress(job.job_id, time.time(), 1, "s1_engagement", msg))

        emit(substep_start(job.job_id, time.time(), 1, "s1_stories", "Stories & highlights"))
        enrichment = enrich_profile_data(
            L, profile, posts_data, pages_scanned, fetch_report=fetch_report, emit_progress=progress,
        )
        emit(substep_complete(
            job.job_id, time.time(), 1, "s1_stories",
            {
                "stories": enrichment.capture_report.stories_fetched,
                "highlights": enrichment.capture_report.highlights_fetched,
            },
        ))

        emit(substep_start(job.job_id, time.time(), 1, "s1_engagement", "Post engagement depth"))
        emit(substep_complete(
            job.job_id, time.time(), 1, "s1_engagement",
            {
                "posts_enriched": enrichment.capture_report.posts_enriched,
                "comments_fetched": enrichment.capture_report.comments_fetched,
                "likers_sampled": enrichment.capture_report.likers_sampled,
                "quality_score": enrichment.capture_report.quality_score,
                "api_calls": enrichment.capture_report.api_calls_made,
            },
        ))

        meta = enrichment.metadata
        followers = meta.follower_count or profile.followers
        following = meta.following_count or profile.followees

        timestamps = [p["timestamp"] for p in posts_data]
        intervals = [
            float((timestamps[j + 1] - timestamps[j]).total_seconds() / 3600) for j in range(n - 1)
        ]
        likes = [p["likes"] for p in posts_data]
        comments = [p["comments"] for p in posts_data]
        views = [p.get("views") for p in posts_data]
        saves = [p.get("saves") for p in posts_data]
        engagement_rates = [(likes[j] + comments[j]) / max(followers, 1) for j in range(n)]

        comment_streams: list[list[CommentData]] = [[] for _ in range(n)]
        for detail in enrichment.post_details:
            if 0 <= detail.post_index < n:
                comment_streams[detail.post_index] = detail.top_comments

        account_age = meta.account_age_days or job.lookback_days * 2
        if hasattr(profile, "date_joined") and profile.date_joined:
            account_age = (dt.utcnow() - profile.date_joined).days

        return ProfileSignalMatrix(
            username=username,
            bio=meta.biography or profile.biography,
            bio_link=meta.external_url or profile.external_url,
            profile_category=meta.category or meta.business_category,
            account_age_days=account_age,
            post_timestamps=timestamps,
            captions=[p["caption"] for p in posts_data],
            hashtag_sets=[p["hashtags"] for p in posts_data],
            image_urls=[p["url"] for p in posts_data],
            video_urls=[p["url"] if p["post_type"] in ("video", "reel") else None for p in posts_data],
            audio_tracks=[p.get("music_title") for p in posts_data],
            post_types=[p["post_type"] for p in posts_data],
            likes=likes,
            comments_counts=comments,
            saves=saves,
            views=views,
            comment_streams=comment_streams,
            follower_count=followers,
            following_count=following,
            follower_following_ratio=meta.follower_following_ratio,
            posting_intervals_hours=intervals,
            engagement_rates=engagement_rates,
            engagement_velocities=engagement_rates,
            caption_lengths=[len(p["caption"].split()) for p in posts_data],
            hashtag_counts=[len(p["hashtags"]) for p in posts_data],
            enrichment=enrichment,
        )

    result = await asyncio.to_thread(_sync_extract)
    posts_count = len(result.captions)
    if posts_count < 5:
        emit(
            substep_progress(
                job.job_id, time.time(), 1, "s1_derived",
                f"Only {posts_count} post(s) available — derived metrics may show zeros until more posts are fetched",
            )
        )
    return result
