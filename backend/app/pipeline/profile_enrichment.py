"""
High-fidelity Instagram data capture: profile metadata, stories, highlights,
and per-post engagement (comments, liker samples, views/saves).
Uses Instagram v1 REST endpoints with logged-in session (GraphQL bypass).
"""
from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Any

import instaloader

from app.config import settings
from app.models.stage1 import (
    CommentData,
    DataCaptureReport,
    HighlightSnapshot,
    PostDetail,
    ProfileEnrichment,
    ProfileMetadata,
    StorySnapshot,
)
from app.pipeline.instagram_client import IG_WEB_HEADERS, _extract_count, ig_get, parse_item_timestamp


def _ts_iso(raw: object) -> str | None:
    if raw is None:
        return None
    try:
        ts = int(raw)
        if ts > 1_000_000_000_000:
            ts //= 1000
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def parse_profile_metadata(profile: instaloader.Profile, user_node: dict | None = None) -> ProfileMetadata:
    """Extract rich profile metadata from web_profile_info user node."""
    user = user_node or getattr(profile, "_user_node", None) or {}

    bio_links: list[dict[str, str]] = []
    for link in user.get("bio_links") or []:
        if isinstance(link, dict):
            bio_links.append({
                "url": link.get("url") or link.get("lynx_url") or "",
                "title": link.get("title") or "",
            })

    edge_media = user.get("edge_owner_to_timeline_media") or {}
    media_count = int(edge_media.get("count") or user.get("media_count") or 0)
    highlight_count = int((user.get("highlight_reel_count") or 0))

    followers = int(user.get("edge_followed_by", {}).get("count") or profile.followers or 0)
    following = int(user.get("edge_follow", {}).get("count") or profile.followees or 0)

    pronouns: list[str] = []
    for p in user.get("pronouns") or []:
        if isinstance(p, str):
            pronouns.append(p)

    account_age_days: int | None = None
    if hasattr(profile, "date_joined") and profile.date_joined:
        account_age_days = (datetime.utcnow() - profile.date_joined).days

    category = user.get("category_name") or user.get("category") or getattr(profile, "business_category_name", None)
    business_cat = user.get("business_category_name") or getattr(profile, "business_category_name", None)

    pic = user.get("profile_pic_url_hd") or user.get("hd_profile_pic_url_info", {}).get("url") or user.get("profile_pic_url")

    sources = ["web_profile_info"]
    reels_count = user.get("total_clips_count")
    if reels_count is not None:
        sources.append("clips_count")

    ratio = followers / max(following, 1)
    posts_per_follower = media_count / max(followers, 1)

    return ProfileMetadata(
        username=profile.username,
        full_name=user.get("full_name") or getattr(profile, "full_name", None),
        user_id=str(user.get("id") or profile.userid),
        biography=user.get("biography") or profile.biography,
        bio_links=bio_links,
        external_url=user.get("external_url") or profile.external_url,
        profile_pic_url=pic,
        is_verified=bool(user.get("is_verified") or getattr(profile, "is_verified", False)),
        is_private=bool(user.get("is_private") or profile.is_private),
        is_business=bool(user.get("is_business_account") or getattr(profile, "is_business_account", False)),
        is_professional=bool(user.get("is_professional_account")),
        follower_count=followers,
        following_count=following,
        media_count=media_count,
        highlight_reel_count=highlight_count,
        reels_count=int(reels_count) if reels_count is not None else None,
        category=category,
        business_category=business_cat,
        pronouns=pronouns,
        account_age_days=account_age_days,
        follower_following_ratio=ratio,
        posts_per_follower=posts_per_follower,
        mutual_followers_count=int(user.get("mutual_followers_count") or 0) or None,
        has_guides=bool(user.get("has_guides")),
        has_channel=bool(user.get("has_videos") or user.get("has_igtv_series")),
        data_sources=sources,
        capture_timestamp=datetime.now(timezone.utc).isoformat(),
    )


def parse_highlights_from_user(user_node: dict) -> list[HighlightSnapshot]:
    edges = (user_node.get("edge_highlight_reels") or {}).get("edges") or []
    highlights: list[HighlightSnapshot] = []
    for edge in edges:
        node = edge.get("node") or {}
        cover = (node.get("cover_media") or {}).get("thumbnail_src") or node.get("cover_media_cropped_thumbnail", {}).get("url")
        highlights.append(HighlightSnapshot(
            id=str(node.get("id") or ""),
            title=node.get("title") or "Highlight",
            cover_url=cover,
            item_count=int(node.get("edge_highlight_reels", {}).get("count") or 0),
        ))
    return highlights


def fetch_active_stories(
    session: Any,
    user_id: str,
    username: str,
    timeout: float = 30.0,
) -> tuple[list[StorySnapshot], int, str | None]:
    """Fetch current story ring via reels_media endpoint."""
    api_calls = 0
    error: str | None = None
    stories: list[StorySnapshot] = []

    headers = {**IG_WEB_HEADERS, "Referer": f"https://www.instagram.com/{username}/"}
    url = "https://www.instagram.com/api/v1/feed/reels_media/"
    params = {"reel_ids": user_id}

    try:
        resp = ig_get(session, url, headers=headers, params=params, timeout=timeout)
        api_calls += 1
        if resp.status_code == 404:
            return [], api_calls, "No active stories (404)"
        resp.raise_for_status()
        data = resp.json()

        reels = data.get("reels") or data.get("reels_media") or {}
        reel = reels.get(str(user_id)) or reels.get(user_id) or {}
        items = reel.get("items") or []

        for item in items:
            ts = parse_item_timestamp(item)
            exp = item.get("expiring_at")
            caption_obj = item.get("caption") or {}
            caption = caption_obj.get("text") if isinstance(caption_obj, dict) else ""
            mentions = re.findall(r"@(\w+)", caption or "")

            media_type = "video" if item.get("media_type") in (2, "video") else "image"
            if item.get("story_link_stickers"):
                link_url = (item["story_link_stickers"][0].get("url") or {}).get("url")
            else:
                link_url = None

            stories.append(StorySnapshot(
                id=str(item.get("pk") or item.get("id") or ""),
                taken_at=ts.isoformat() if ts else None,
                media_type=media_type,
                expires_at=_ts_iso(exp),
                viewer_count=_extract_count(item.get("viewer_count")) or None,
                caption=(caption or "")[:500] or None,
                link_url=link_url,
                mentions=mentions,
            ))
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"

    return stories, api_calls, error


def fetch_media_comments(
    session: Any,
    media_id: str,
    username: str,
    max_comments: int = 30,
    timeout: float = 30.0,
) -> tuple[list[CommentData], int]:
    """Paginate /media/{id}/comments/ — avoids broken GraphQL."""
    comments: list[CommentData] = []
    api_calls = 0
    min_id: str | None = None
    headers = {**IG_WEB_HEADERS, "Referer": f"https://www.instagram.com/{username}/"}
    url = f"https://www.instagram.com/api/v1/media/{media_id}/comments/"

    while len(comments) < max_comments:
        params: dict[str, str] = {"can_support_threading": "true"}
        if min_id:
            params["min_id"] = min_id
        try:
            resp = ig_get(session, url, headers=headers, params=params, timeout=timeout)
            api_calls += 1
            if resp.status_code in (403, 404):
                break
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            break

        batch = data.get("comments") or []
        if not batch:
            break

        for c in batch:
            user = c.get("user") or {}
            comments.append(CommentData(
                username=user.get("username") or "?",
                text=c.get("text") or "",
                likes=int(c.get("comment_like_count") or 0),
            ))
            if len(comments) >= max_comments:
                break

        if not data.get("has_more_comments"):
            break
        min_id = data.get("next_min_id")
        if not min_id:
            break
        time.sleep(0.6)

    return comments[:max_comments], api_calls


def fetch_media_likers(
    session: Any,
    media_id: str,
    username: str,
    max_likers: int = 24,
    timeout: float = 30.0,
) -> tuple[list[str], int]:
    """Sample likers from /media/{id}/likers/ (may require follow relationship)."""
    api_calls = 0
    headers = {**IG_WEB_HEADERS, "Referer": f"https://www.instagram.com/{username}/"}
    url = f"https://www.instagram.com/api/v1/media/{media_id}/likers/"

    try:
        resp = ig_get(session, url, headers=headers, timeout=timeout)
        api_calls += 1
        if resp.status_code in (403, 404):
            return [], api_calls
        resp.raise_for_status()
        users = resp.json().get("users") or []
        return [u.get("username") for u in users if u.get("username")][:max_likers], api_calls
    except Exception:
        return [], api_calls


def post_dict_to_detail(post: dict, index: int, comments: list[CommentData], likers: list[str]) -> PostDetail:
    return PostDetail(
        media_id=str(post.get("media_id") or ""),
        shortcode=str(post.get("shortcode") or ""),
        post_index=index,
        likes=int(post.get("likes") or 0),
        comments_count=int(post.get("comments") or 0),
        views=post.get("views"),
        saves=post.get("saves"),
        shares=post.get("shares"),
        location_name=post.get("location_name"),
        mentions=post.get("mentions") or [],
        tagged_users=post.get("tagged_users") or [],
        is_carousel=bool(post.get("is_carousel")),
        carousel_count=int(post.get("carousel_count") or 1),
        like_and_view_counts_disabled=bool(post.get("like_and_view_counts_disabled")),
        top_comments=comments,
        liker_sample=likers,
        music_title=post.get("music_title"),
        accessibility_caption=post.get("accessibility_caption"),
        post_url=post.get("url"),
    )


def compute_capture_quality(
    metadata: ProfileMetadata,
    n_posts: int,
    report: DataCaptureReport,
    posts_with_views: int,
) -> float:
    score = 0.0
    score += min(0.22, n_posts / 50 * 0.22)
    score += 0.12 if metadata.biography else 0.04
    score += 0.08 if metadata.full_name else 0.02
    score += 0.08 if metadata.media_count > 0 else 0.0
    score += min(0.18, report.comments_fetched / max(report.posts_enriched * 8, 1) * 0.18)
    score += min(0.10, report.likers_sampled / max(report.posts_enriched * 5, 1) * 0.10)
    score += 0.10 if report.stories_fetched > 0 else 0.03
    score += 0.07 if report.highlights_fetched > 0 else 0.02
    score += min(0.15, posts_with_views / max(n_posts, 1) * 0.15)
    return round(min(1.0, score), 3)


def enrich_profile_data(
    L: instaloader.Instaloader,
    profile: instaloader.Profile,
    posts_data: list[dict],
    pages_scanned: int,
    *,
    fetch_report: dict | None = None,
    emit_progress: Any | None = None,
) -> ProfileEnrichment:
    """Orchestrate metadata, stories, highlights, and post-level engagement capture."""
    user_node = getattr(profile, "_user_node", None) or {}
    session = L.context._session
    username = profile.username

    metadata = parse_profile_metadata(profile, user_node)
    highlights = parse_highlights_from_user(user_node)

    report = DataCaptureReport(
        posts_fetched=len(posts_data),
        feed_pages_scanned=pages_scanned,
        highlights_fetched=len(highlights),
    )
    limitations: list[str] = []

    if fetch_report:
        for lim in fetch_report.get("limitations") or []:
            limitations.append(lim)
        if fetch_report.get("under_collected"):
            limitations.append(
                f"Post fetch: {fetch_report.get('posts_in_window', len(posts_data))} collected, "
                f"profile total {fetch_report.get('expected_media_count', '?')} "
                f"(sources: {', '.join(fetch_report.get('sources_used') or [])})",
            )
        if fetch_report.get("clips_added", 0) > 0:
            limitations.append(
                f"Added {fetch_report['clips_added']} posts from reels/clips feed (not in grid feed alone)",
            )

    if metadata.is_private and not L.context.is_logged_in:
        limitations.append("Private profile — login required for full capture")

    # Stories
    if emit_progress:
        emit_progress("Fetching active stories…")
    stories, story_calls, story_err = fetch_active_stories(
        session, str(profile.userid), username, timeout=L.context.request_timeout,
    )
    report.api_calls_made += story_calls
    report.stories_fetched = len(stories)
    if story_err and not stories:
        limitations.append(f"Stories: {story_err}")
    time.sleep(1.0)

    # Enrich recent posts (newest last in posts_data after sort)
    enrich_n = settings.instagram_enrich_posts
    max_comments = settings.instagram_max_comments_per_post
    max_likers = settings.instagram_max_likers_per_post

    posts_to_enrich = posts_data[-enrich_n:] if enrich_n > 0 else []
    post_details: list[PostDetail] = []
    posts_with_views = sum(1 for p in posts_data if p.get("views"))

    for i, post in enumerate(posts_to_enrich):
        media_id = post.get("media_id")
        if not media_id:
            continue

        idx = posts_data.index(post)
        if emit_progress:
            emit_progress(f"Enriching post {i + 1}/{len(posts_to_enrich)} (comments & likers)…")

        comments, c_calls = fetch_media_comments(
            session, media_id, username, max_comments=max_comments, timeout=L.context.request_timeout,
        )
        report.api_calls_made += c_calls
        report.comments_fetched += len(comments)

        likers, l_calls = fetch_media_likers(
            session, media_id, username, max_likers=max_likers, timeout=L.context.request_timeout,
        )
        report.api_calls_made += l_calls
        report.likers_sampled += len(likers)

        post_details.append(post_dict_to_detail(post, idx, comments, likers))
        report.posts_enriched += 1
        time.sleep(0.8)

    if not post_details and posts_data:
        limitations.append("Post engagement depth skipped — no media IDs in feed payload")
    elif len(posts_to_enrich) < len(posts_data):
        limitations.append(
            f"Comments/likers fetched for {len(posts_to_enrich)} most recent posts only (rate-limit safe)"
        )

    hidden_counts = sum(1 for p in posts_data if p.get("like_and_view_counts_disabled"))
    if hidden_counts:
        limitations.append(f"{hidden_counts} post(s) hide like/view counts on Instagram")

    report.limitations = limitations
    report.quality_score = compute_capture_quality(metadata, len(posts_data), report, posts_with_views)

    return ProfileEnrichment(
        metadata=metadata,
        stories=stories,
        highlights=highlights,
        post_details=post_details,
        capture_report=report,
    )
