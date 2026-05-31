"""
Instagram v1 API workarounds for instaloader 4.15.1 GraphQL doc_id failures (403/401).

See: instaloader issues #2688 (profile lookup), #2689 (posts feed).
"""
from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Iterator

import certifi
import instaloader
import requests
from instaloader.exceptions import ProfileNotExistsException
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import settings

IG_WEB_HEADERS = {
    "X-IG-App-ID": "936619743392459",
    "X-ASBD-ID": "198387",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    ),
    "X-Requested-With": "XMLHttpRequest",
}


TRANSIENT_REQUEST_ERRORS = (
    requests.exceptions.SSLError,
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
    requests.exceptions.ChunkedEncodingError,
)


def configure_ig_session(session: requests.Session) -> None:
    """Harden requests session against macOS/Python SSL flakiness."""
    session.verify = certifi.where()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)


def ig_get(
    session: requests.Session,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, str | int] | None = None,
    timeout: float | None = None,
    max_retries: int = 5,
) -> requests.Response:
    """GET with retries for transient SSL/connection failures."""
    last_error: Exception | None = None
    request_timeout = timeout if timeout is not None else 30.0

    for attempt in range(max_retries):
        try:
            return session.get(url, headers=headers, params=params, timeout=request_timeout)
        except TRANSIENT_REQUEST_ERRORS as exc:
            last_error = exc
            if attempt + 1 >= max_retries:
                break
            time.sleep(min(2**attempt, 10))

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Instagram request failed: {url}")


def create_instaloader() -> instaloader.Instaloader:
    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_comments=False,
        save_metadata=False,
        max_connection_attempts=5,
    )
    ig_user = settings.instagram_username.strip()
    if ig_user:
        session_path = settings.instagram_session.strip() or None
        L.load_session_from_file(ig_user, session_path)
        if not L.context.is_logged_in:
            raise RuntimeError(
                f"Instagram session for '{ig_user}' is invalid or expired. "
                f"Re-import: python scripts/import_instagram_session.py"
            )
    configure_ig_session(L.context._session)
    return L


def fetch_profile(L: instaloader.Instaloader, username: str) -> instaloader.Profile:
    """Load profile via web_profile_info (bypasses broken GraphQL fbsearch doc_id)."""
    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
    headers = {
        **IG_WEB_HEADERS,
        "Referer": f"https://www.instagram.com/{username}/",
    }
    resp = ig_get(
        L.context._session,
        url,
        headers=headers,
        timeout=L.context.request_timeout,
    )
    if resp.status_code == 404:
        raise ProfileNotExistsException(f"Profile {username} does not exist.")
    resp.raise_for_status()
    user = (resp.json().get("data") or {}).get("user")
    if not user:
        raise ProfileNotExistsException(f"Profile {username} does not exist.")
    profile = instaloader.Profile(L.context, user)
    profile._has_full_metadata = True
    profile._user_node = user
    return profile


def parse_item_timestamp(item: dict) -> datetime | None:
    """Parse post time from Instagram feed item fields (always naive UTC)."""
    for key in ("taken_at", "device_timestamp", "taken_at_timestamp", "created_at"):
        raw = item.get(key)
        if raw is None:
            continue
        try:
            ts = int(raw)
            if ts > 1_000_000_000_000:
                ts //= 1000
            return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
        except (TypeError, ValueError, OSError):
            continue

    cap = item.get("caption")
    if isinstance(cap, dict) and cap.get("created_at") is not None:
        try:
            ts = int(cap["created_at"])
            if ts > 1_000_000_000_000:
                ts //= 1000
            return datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
        except (TypeError, ValueError, OSError):
            pass

    for child in item.get("carousel_media") or []:
        if isinstance(child, dict):
            child_ts = parse_item_timestamp(child)
            if child_ts:
                return child_ts

    return None


def graphql_timeline_node_to_dict(node: dict) -> dict | None:
    """Convert edge_owner_to_timeline_media node to unified post dict."""
    if not node:
        return None
    ts_raw = node.get("taken_at_timestamp") or node.get("taken_at")
    if ts_raw is None:
        return None
    try:
        ts = int(ts_raw)
        timestamp = datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None)
    except (TypeError, ValueError, OSError):
        return None

    caption = ""
    cap_edges = (node.get("edge_media_to_caption") or {}).get("edges") or []
    if cap_edges and isinstance(cap_edges[0].get("node"), dict):
        caption = cap_edges[0]["node"].get("text") or ""

    likes = _extract_count((node.get("edge_liked_by") or {}).get("count"))
    if likes == 0:
        likes = _extract_count((node.get("edge_media_preview_like") or {}).get("count"))
    comments = _extract_count((node.get("edge_media_to_comment") or {}).get("count"))

    shortcode = node.get("shortcode") or ""
    media_id = str(node.get("id") or node.get("pk") or "")
    is_video = node.get("is_video") or node.get("__typename") == "GraphVideo"
    post_type = "video" if is_video else "image"

    return {
        "timestamp": timestamp,
        "caption": caption,
        "hashtags": re.findall(r"#(\w+)", caption),
        "mentions": re.findall(r"@(\w+)", caption),
        "tagged_users": [],
        "likes": likes,
        "comments": comments,
        "views": None,
        "saves": None,
        "shares": None,
        "post_type": post_type,
        "url": f"https://www.instagram.com/p/{shortcode}/" if shortcode else "",
        "media_id": media_id,
        "shortcode": shortcode,
        "location_name": None,
        "is_carousel": bool(node.get("edge_sidecar_to_children")),
        "carousel_count": 1,
        "like_and_view_counts_disabled": False,
        "music_title": None,
        "accessibility_caption": node.get("accessibility_caption"),
        "_source": "profile_timeline",
    }


def feed_item_to_dict(item: dict) -> dict | None:
    """Build rich post payload from /feed/user/ API item (no GraphQL)."""
    ts = parse_item_timestamp(item)
    if ts is None:
        return None

    caption = ""
    cap = item.get("caption")
    if isinstance(cap, dict):
        caption = cap.get("text") or ""
    elif isinstance(cap, str):
        caption = cap

    media_type = item.get("media_type", 1)
    is_video = media_type in (2, "video", "GraphVideo")
    is_carousel = bool(item.get("carousel_media_count", 0) and int(item.get("carousel_media_count", 0)) > 1)
    carousel_count = int(item.get("carousel_media_count") or 1)

    likes = _extract_count(item.get("like_count"))
    comments = _extract_count(item.get("comment_count"))
    if comments == 0:
        comments = _extract_count(item.get("comments"))

    views = _extract_count(item.get("play_count") or item.get("view_count") or item.get("video_view_count"))
    saves = _extract_count(item.get("save_count"))
    shares = _extract_count(item.get("share_count"))

    code = item.get("code") or item.get("shortcode") or ""
    media_id = str(item.get("pk") or item.get("id") or "")
    hashtags = re.findall(r"#(\w+)", caption)
    mentions = re.findall(r"@(\w+)", caption)

    tagged_users: list[str] = []
    for tag in (item.get("usertags") or {}).get("in") or []:
        u = tag.get("user") or {}
        if u.get("username"):
            tagged_users.append(u["username"])

    loc = item.get("location") or {}
    location_name = loc.get("name") if isinstance(loc, dict) else None

    music_title: str | None = None
    clips = item.get("clips_metadata") or {}
    if isinstance(clips, dict):
        music = clips.get("music_info") or clips.get("original_sound_info") or {}
        if isinstance(music, dict):
            music_title = (music.get("music_asset_info") or music.get("original_sound_info") or {}).get("title")
            if not music_title:
                music_title = music.get("title")

    accessibility_caption = item.get("accessibility_caption")

    url = ""
    try:
        url = item["image_versions2"]["candidates"][0]["url"]
    except (KeyError, IndexError, TypeError):
        url = f"https://www.instagram.com/p/{code}/" if code else ""

    post_type = "video" if is_video else ("carousel" if is_carousel else "image")
    if item.get("product_type") == "clips" or item.get("media_type") == 2:
        post_type = "reel" if is_video else post_type

    return {
        "timestamp": ts,
        "caption": caption,
        "hashtags": hashtags,
        "mentions": mentions,
        "tagged_users": tagged_users,
        "likes": likes,
        "comments": comments,
        "views": views if views else None,
        "saves": saves if saves else None,
        "shares": shares if shares else None,
        "post_type": post_type,
        "url": url,
        "media_id": media_id,
        "shortcode": code,
        "location_name": location_name,
        "is_carousel": is_carousel,
        "carousel_count": carousel_count,
        "like_and_view_counts_disabled": bool(item.get("like_and_view_counts_disabled")),
        "music_title": music_title,
        "accessibility_caption": accessibility_caption,
        "_source": "feed_user",
    }


def iter_feed_items(
    L: instaloader.Instaloader, profile: instaloader.Profile, max_pages: int = 50
) -> Iterator[dict]:
    """Yield raw post dicts from /api/v1/feed/user/ pagination."""
    max_id: str | None = None
    headers = {
        **IG_WEB_HEADERS,
        "Referer": f"https://www.instagram.com/{profile.username}/",
    }
    url = f"https://www.instagram.com/api/v1/feed/user/{profile.userid}/"
    pages = 0

    while pages < max_pages:
        params: dict[str, str | int] = {"count": settings.instagram_feed_page_size}
        if max_id:
            params["max_id"] = max_id
        resp = ig_get(
            L.context._session,
            url,
            headers=headers,
            params=params,
            timeout=L.context.request_timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items") or []
        if not items:
            break
        for item in items:
            yield item
        pages += 1
        if not data.get("more_available"):
            break
        max_id = data.get("next_max_id")
        if not max_id:
            break
        time.sleep(1.5)


def _profile_feed_headers(profile: instaloader.Profile) -> dict[str, str]:
    return {**IG_WEB_HEADERS, "Referer": f"https://www.instagram.com/{profile.username}/"}


def _posts_from_profile_timeline(user_node: dict | None) -> list[dict]:
    """Seed from web_profile_info embedded timeline (often first ~12 grid posts)."""
    if not user_node:
        return []
    edges = (user_node.get("edge_owner_to_timeline_media") or {}).get("edges") or []
    posts: list[dict] = []
    for edge in edges:
        node = edge.get("node") if isinstance(edge, dict) else None
        if not node:
            continue
        post = graphql_timeline_node_to_dict(node)
        if post:
            posts.append(post)
    return posts


def _fetch_feed_user_page(
    session: requests.Session,
    profile: instaloader.Profile,
    *,
    max_id: str | None,
    min_timestamp: int | None,
    count: int,
    timeout: float,
) -> dict:
    url = f"https://www.instagram.com/api/v1/feed/user/{profile.userid}/"
    params: dict[str, str | int] = {"count": count}
    if min_timestamp is not None and min_timestamp > 0:
        params["min_timestamp"] = min_timestamp
    if max_id:
        params["max_id"] = max_id
    resp = ig_get(session, url, headers=_profile_feed_headers(profile), params=params, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def _fetch_clips_user_page(
    session: requests.Session,
    profile: instaloader.Profile,
    *,
    max_id: str | None,
    timeout: float,
) -> dict | None:
    """Reels/clips often live on a separate endpoint from grid feed/user."""
    url = "https://www.instagram.com/api/v1/clips/user/"
    headers = {
        **_profile_feed_headers(profile),
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data: dict[str, str] = {
        "target_user_id": str(profile.userid),
        "page_size": str(settings.instagram_feed_page_size),
    }
    if max_id:
        data["max_id"] = max_id
    try:
        resp = session.post(url, headers=headers, data=data, timeout=timeout)
        if resp.status_code in (404, 403):
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


def _items_from_clips_response(data: dict) -> list[dict]:
    items: list[dict] = []
    for key in ("items", "medias"):
        raw = data.get(key)
        if isinstance(raw, list):
            for entry in raw:
                if isinstance(entry, dict):
                    media = entry.get("media") if isinstance(entry.get("media"), dict) else entry
                    if isinstance(media, dict):
                        items.append(media)
    paging = data.get("paging_info") or {}
    if not items and isinstance(data.get("items"), list):
        items = [x for x in data["items"] if isinstance(x, dict)]
    return items


def _clips_next_cursor(data: dict) -> str | None:
    for key in ("next_max_id", "max_id"):
        val = data.get(key)
        if val:
            return str(val)
    paging = data.get("paging_info") or {}
    for key in ("max_id", "more_available"):
        if paging.get(key) and key == "max_id":
            return str(paging["max_id"])
    if paging.get("more_available") and data.get("next_max_id"):
        return str(data["next_max_id"])
    return None


def _clips_more_available(data: dict) -> bool:
    if data.get("more_available"):
        return True
    paging = data.get("paging_info") or {}
    return bool(paging.get("more_available"))


def _merge_post(collected: dict[str, dict], post: dict, *, duplicates: list[str]) -> None:
    mid = post.get("media_id") or post.get("shortcode")
    if not mid:
        return
    if mid in collected:
        duplicates.append(mid)
        existing = collected[mid]
        for field in ("views", "saves", "likes", "comments", "caption"):
            if not existing.get(field) and post.get(field):
                existing[field] = post[field]
        return
    collected[mid] = post


def _paginate_source(
    session: requests.Session,
    profile: instaloader.Profile,
    cutoff: datetime,
    *,
    source: str,
    min_timestamp: int | None,
    max_pages: int,
    page_size: int,
    timeout: float,
    collected: dict[str, dict],
    stats: dict[str, Any],
    progress_cb: Callable[[str], None] | None,
    fetch_all: bool = False,
) -> None:
    max_id: str | None = None
    pages = 0
    stop_reason = "exhausted"

    while pages < max_pages:
        if source == "feed_user":
            data = _fetch_feed_user_page(
                session, profile, max_id=max_id, min_timestamp=min_timestamp, count=page_size, timeout=timeout,
            )
            items = data.get("items") or []
            more = bool(data.get("more_available"))
            next_cursor = data.get("next_max_id")
        else:
            data = _fetch_clips_user_page(session, profile, max_id=max_id, timeout=timeout)
            if not data:
                stats["clips_unavailable"] = True
                stop_reason = "clips_unavailable"
                break
            items = _items_from_clips_response(data)
            more = _clips_more_available(data)
            next_cursor = _clips_next_cursor(data)

        pages += 1
        in_window = 0
        parsed = 0
        skipped = 0

        for item in items:
            post = feed_item_to_dict(item)
            if not post:
                skipped += 1
                continue
            parsed += 1
            post["_source"] = source
            if fetch_all or post["timestamp"] >= cutoff:
                _merge_post(collected, post, duplicates=stats.setdefault("duplicate_ids", []))
                in_window += 1

        stats[f"{source}_pages"] = pages
        stats["skipped_unparsed"] = stats.get("skipped_unparsed", 0) + skipped

        if progress_cb:
            label = "total" if fetch_all else "in window"
            progress_cb(
                f"{source}: page {pages}, {len(collected)} posts {label} (+{in_window} this page)",
            )

        # Stop when paginating past lookback window (not in fetch-all mode)
        if not fetch_all and parsed > 0 and in_window == 0:
            stop_reason = "passed_cutoff"
            break

        if not more:
            stop_reason = "no_more_pages"
            break

        if next_cursor:
            max_id = str(next_cursor)
        elif items:
            last_pk = items[-1].get("pk") or items[-1].get("id")
            if last_pk:
                max_id = str(last_pk)
            else:
                stop_reason = "missing_cursor"
                break
        else:
            stop_reason = "empty_page"
            break

        time.sleep(1.2)

    stats[f"{source}_stop"] = stop_reason


def collect_posts_in_lookback(
    L: instaloader.Instaloader,
    profile: instaloader.Profile,
    lookback_days: int,
    *,
    fetch_all: bool = False,
    progress_cb: Callable[[str], None] | None = None,
    expected_media_count: int | None = None,
) -> tuple[list[dict], int, dict[str, Any]]:
    """
    Collect posts from Instagram sources.

    When fetch_all=True, paginates until exhausted (no date cutoff).
    Otherwise collects only posts with timestamp >= now - lookback_days.
    """
    if fetch_all:
        cutoff = datetime.min.replace(tzinfo=None)
        min_timestamp: int | None = None
        max_pages = settings.instagram_max_feed_pages_all
    else:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=lookback_days)
        min_timestamp = int(cutoff.timestamp())
        max_pages = settings.instagram_max_feed_pages
    page_size = settings.instagram_feed_page_size
    session = L.context._session
    timeout = L.context.request_timeout

    user_node = getattr(profile, "_user_node", None)
    if expected_media_count is None and user_node:
        edge = user_node.get("edge_owner_to_timeline_media") or {}
        expected_media_count = int(edge.get("count") or user_node.get("media_count") or 0) or None

    collected: dict[str, dict] = {}
    stats: dict[str, Any] = {
        "fetch_all": fetch_all,
        "lookback_days": lookback_days if not fetch_all else None,
        "cutoff": None if fetch_all else cutoff.isoformat(),
        "expected_media_count": expected_media_count,
        "sources_used": [],
        "skipped_unparsed": 0,
        "duplicate_ids": [],
    }

    # Source 0: embedded profile timeline
    for post in _posts_from_profile_timeline(user_node):
        if fetch_all or post["timestamp"] >= cutoff:
            _merge_post(collected, post, duplicates=stats["duplicate_ids"])
    stats["profile_seed_count"] = len(collected)
    if collected:
        stats["sources_used"].append("profile_timeline")

    if progress_cb:
        progress_cb(f"Profile seed: {stats['profile_seed_count']} posts")

    # Source 1: main feed
    _paginate_source(
        session, profile, cutoff,
        source="feed_user",
        min_timestamp=min_timestamp,
        max_pages=max_pages,
        page_size=page_size,
        timeout=timeout,
        collected=collected,
        stats=stats,
        progress_cb=progress_cb,
        fetch_all=fetch_all,
    )
    stats["sources_used"].append("feed_user")

    # Source 2: reels/clips — critical when grid feed returns partial set
    before_clips = len(collected)
    _paginate_source(
        session, profile, cutoff,
        source="clips_user",
        min_timestamp=min_timestamp,
        max_pages=max_pages,
        page_size=page_size,
        timeout=timeout,
        collected=collected,
        stats=stats,
        progress_cb=progress_cb,
        fetch_all=fetch_all,
    )
    if len(collected) > before_clips:
        stats["sources_used"].append("clips_user")
    stats["clips_added"] = len(collected) - before_clips

    posts = sorted(collected.values(), key=lambda p: p["timestamp"])

    # Fallback if still empty (lookback) or under-collected (fetch-all)
    need_fallback = not posts or (fetch_all and expected_media_count and len(posts) < expected_media_count * 0.85)
    if need_fallback:
        candidates: list[dict] = []
        fallback_pages = max_pages if fetch_all else min(15, max_pages)
        for item in iter_feed_items(L, profile, max_pages=fallback_pages):
            post_dict = feed_item_to_dict(item)
            if post_dict:
                candidates.append(post_dict)
        candidates.sort(key=lambda p: p["timestamp"], reverse=True)
        if fetch_all:
            for p in candidates:
                _merge_post(collected, p, duplicates=stats["duplicate_ids"])
            posts = sorted(collected.values(), key=lambda p: p["timestamp"])
        else:
            posts = [p for p in candidates if p["timestamp"] >= cutoff]
            if not posts and candidates:
                posts = sorted(candidates[: min(50, len(candidates))], key=lambda p: p["timestamp"])
        stats["fallback_used"] = True

    pages_scanned = stats.get("feed_user_pages", 0) + stats.get("clips_user_pages", 0)
    stats["posts_in_window"] = len(posts)
    stats["duplicates_merged"] = len(stats["duplicate_ids"])
    if posts:
        stats["oldest"] = posts[0]["timestamp"].isoformat()
        stats["newest"] = posts[-1]["timestamp"].isoformat()

    if expected_media_count and len(posts) < expected_media_count * (0.85 if fetch_all else 0.7):
        stats["under_collected"] = True
        mode = "full archive" if fetch_all else f"last {lookback_days} days"
        stats["limitations"] = [
            f"Collected {len(posts)} posts ({mode}) but profile reports {expected_media_count} total — "
            "some reels or older posts may be API-restricted",
        ]
    else:
        stats["under_collected"] = False

    for p in posts:
        p.pop("_source", None)

    return posts, pages_scanned, stats


def iter_profile_posts(
    L: instaloader.Instaloader, profile: instaloader.Profile
) -> Iterator[instaloader.Post]:
    """Paginate posts via /api/v1/feed/user/ (bypasses broken timeline GraphQL doc_id)."""
    max_id: str | None = None
    headers = {
        **IG_WEB_HEADERS,
        "Referer": f"https://www.instagram.com/{profile.username}/",
    }
    url = f"https://www.instagram.com/api/v1/feed/user/{profile.userid}/"

    while True:
        params: dict[str, str | int] = {"count": settings.instagram_feed_page_size}
        if max_id:
            params["max_id"] = max_id
        resp = ig_get(
            L.context._session,
            url,
            headers=headers,
            params=params,
            timeout=L.context.request_timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        for item in data.get("items") or []:
            yield instaloader.Post.from_iphone_struct(L.context, item)
        if not data.get("more_available"):
            break
        max_id = data.get("next_max_id")
        if not max_id:
            break
        time.sleep(1.5)


def _extract_caption(src: dict, node: dict, post: instaloader.Post) -> str:
    for raw in (src.get("caption"), node.get("caption")):
        if isinstance(raw, dict):
            text = raw.get("text") or ""
            if text:
                return text
        elif isinstance(raw, str) and raw:
            return raw
    try:
        return post.caption or ""
    except Exception:
        return ""


def _extract_count(raw: object) -> int:
    if isinstance(raw, dict):
        return int(raw.get("count") or 0)
    if raw is None:
        return 0
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 0


def post_to_dict(post: instaloader.Post) -> dict:
    node = post._node
    # Posts from feed/user API are stored directly on _node via from_iphone_struct.
    src = node.get("iphone_struct") or node

    caption = _extract_caption(src, node, post)

    # Avoid post.comments — it triggers GraphQL and returns 403 on current instaloader.
    comments = _extract_count(node.get("comments"))
    if comments == 0:
        comments = _extract_count(src.get("comment_count"))

    likes = _extract_count(src.get("like_count"))
    if likes == 0:
        likes = _extract_count(node.get("edge_media_preview_like", {}).get("count"))

    hashtags = re.findall(r"#(\w+)", caption)
    if not hashtags:
        try:
            hashtags = list(post.caption_hashtags) if post.caption_hashtags else []
        except Exception:
            hashtags = []

    code = src.get("code") or node.get("shortcode") or ""
    url = post.url if post.url else (f"https://www.instagram.com/p/{code}/" if code else "")

    return {
        "timestamp": post.date_utc,
        "caption": caption,
        "hashtags": hashtags,
        "likes": likes,
        "comments": comments,
        "post_type": "video" if post.is_video else "image",
        "url": url,
    }
