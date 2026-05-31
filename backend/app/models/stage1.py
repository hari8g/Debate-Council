from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CommentData(BaseModel):
    username: str
    text: str
    likes: int = 0
    timestamp: Optional[datetime] = None


class ProfileMetadata(BaseModel):
    username: str
    full_name: Optional[str] = None
    user_id: Optional[str] = None
    biography: Optional[str] = None
    bio_links: list[dict[str, str]] = Field(default_factory=list)
    external_url: Optional[str] = None
    profile_pic_url: Optional[str] = None
    is_verified: bool = False
    is_private: bool = False
    is_business: bool = False
    is_professional: bool = False
    follower_count: int = 0
    following_count: int = 0
    media_count: int = 0
    highlight_reel_count: int = 0
    reels_count: Optional[int] = None
    category: Optional[str] = None
    business_category: Optional[str] = None
    pronouns: list[str] = Field(default_factory=list)
    account_age_days: Optional[int] = None
    follower_following_ratio: float = 0.0
    posts_per_follower: float = 0.0
    mutual_followers_count: Optional[int] = None
    has_guides: bool = False
    has_channel: bool = False
    data_sources: list[str] = Field(default_factory=list)
    capture_timestamp: Optional[str] = None


class StorySnapshot(BaseModel):
    id: str
    taken_at: Optional[str] = None
    media_type: str = "image"
    expires_at: Optional[str] = None
    viewer_count: Optional[int] = None
    caption: Optional[str] = None
    link_url: Optional[str] = None
    mentions: list[str] = Field(default_factory=list)


class HighlightSnapshot(BaseModel):
    id: str
    title: str
    cover_url: Optional[str] = None
    item_count: int = 0


class PostDetail(BaseModel):
    media_id: str
    shortcode: str = ""
    post_index: int = 0
    likes: int = 0
    comments_count: int = 0
    views: Optional[int] = None
    saves: Optional[int] = None
    shares: Optional[int] = None
    location_name: Optional[str] = None
    mentions: list[str] = Field(default_factory=list)
    tagged_users: list[str] = Field(default_factory=list)
    is_carousel: bool = False
    carousel_count: int = 1
    like_and_view_counts_disabled: bool = False
    top_comments: list[CommentData] = Field(default_factory=list)
    liker_sample: list[str] = Field(default_factory=list)
    music_title: Optional[str] = None
    accessibility_caption: Optional[str] = None
    post_url: Optional[str] = None


class DataCaptureReport(BaseModel):
    posts_fetched: int = 0
    posts_enriched: int = 0
    comments_fetched: int = 0
    likers_sampled: int = 0
    stories_fetched: int = 0
    highlights_fetched: int = 0
    feed_pages_scanned: int = 0
    api_calls_made: int = 0
    limitations: list[str] = Field(default_factory=list)
    quality_score: float = 0.0


class ProfileEnrichment(BaseModel):
    metadata: ProfileMetadata
    stories: list[StorySnapshot] = Field(default_factory=list)
    highlights: list[HighlightSnapshot] = Field(default_factory=list)
    post_details: list[PostDetail] = Field(default_factory=list)
    capture_report: DataCaptureReport = Field(default_factory=DataCaptureReport)


class ProfileSignalMatrix(BaseModel):
    username: str
    bio: Optional[str] = None
    bio_link: Optional[str] = None
    profile_category: Optional[str] = None
    account_age_days: int = 0
    post_timestamps: list[datetime] = Field(default_factory=list)
    captions: list[str] = Field(default_factory=list)
    hashtag_sets: list[list[str]] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)
    video_urls: list[Optional[str]] = Field(default_factory=list)
    audio_tracks: list[Optional[str]] = Field(default_factory=list)
    post_types: list[str] = Field(default_factory=list)
    likes: list[int] = Field(default_factory=list)
    comments_counts: list[int] = Field(default_factory=list)
    saves: list[Optional[int]] = Field(default_factory=list)
    views: list[Optional[int]] = Field(default_factory=list)
    comment_streams: list[list[CommentData]] = Field(default_factory=list)
    follower_count: int = 0
    following_count: int = 0
    follower_following_ratio: float = 0.0
    posting_intervals_hours: list[float] = Field(default_factory=list)
    engagement_rates: list[float] = Field(default_factory=list)
    engagement_velocities: list[float] = Field(default_factory=list)
    caption_lengths: list[int] = Field(default_factory=list)
    hashtag_counts: list[int] = Field(default_factory=list)
    enrichment: Optional[ProfileEnrichment] = None


class BurstEvent(BaseModel):
    start_index: int
    end_index: int
    multiplier: float
    start_date: Optional[str] = None
    description: str = ""


class DerivedSignals(BaseModel):
    posting_regularity: float = 0.0
    engagement_slope: float = 0.0
    caption_length_slope: float = 0.0
    hashtag_slope: float = 0.0
    emotional_volatility: float = 0.0
    burst_events: list[BurstEvent] = Field(default_factory=list)
    topic_drift_score: float = 0.0
    persona_consistency_score: float = 0.0


class PostSample(BaseModel):
    index: int
    timestamp: str
    caption_excerpt: str
    post_type: str
    likes: int
    comments: int
    engagement_rate: float
    hashtags: list[str] = Field(default_factory=list)
    views: Optional[int] = None
    saves: Optional[int] = None
    location: Optional[str] = None
    shortcode: Optional[str] = None


class SignalSummary(BaseModel):
    username: str
    bio: Optional[str] = None
    follower_count: int = 0
    following_count: int = 0
    posts_analysed: int = 0
    analysis_period_days: int = 0
    fetch_all_posts: bool = False
    post_samples: list[PostSample] = Field(default_factory=list)
    enrichment: Optional[ProfileEnrichment] = None
