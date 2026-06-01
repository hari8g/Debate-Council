import type { DerivedSignals } from '../types/report';

export type MetricHealth = 'strong' | 'moderate' | 'weak' | 'insufficient';

/** Keys for the four derived metrics that feed Stage 3 projection. */
export type Stage3DriverKey = 'posting_regularity' | 'emotional_volatility' | 'engagement_slope' | 'topic_drift';

export interface MetricInterpretation {
  label: string;
  value: number;
  formatted: string;
  health: MetricHealth;
  meaning: string;
  formula: string;
  howToRead: string;
  /** Highlighted as a Stage 3 state-estimation input. */
  stage3Driver?: Stage3DriverKey;
}

function healthFromRange(value: number, low: number, high: number, invert = false): MetricHealth {
  const v = invert ? 1 - value : value;
  if (v >= high) return 'strong';
  if (v >= low) return 'moderate';
  return 'weak';
}

export function interpretDerivedSignals(
  signals: DerivedSignals,
  postsAnalysed: number,
): MetricInterpretation[] {
  const lowData = postsAnalysed < 5;

  return [
    {
      label: 'Posting Regularity',
      stage3Driver: 'posting_regularity',
      value: signals.posting_regularity,
      formatted: signals.posting_regularity.toFixed(2),
      health: lowData ? 'insufficient' : healthFromRange(signals.posting_regularity, 0.35, 0.65),
      meaning: lowData
        ? 'Not enough posts to measure rhythm reliably.'
        : signals.posting_regularity >= 0.65
          ? 'Posts arrive on a fairly predictable schedule.'
          : signals.posting_regularity >= 0.35
            ? 'Some rhythm, but timing varies noticeably.'
            : 'Posting times are erratic or clustered.',
      formula: '1 − (std dev of hours between posts ÷ mean interval), clipped 0–1',
      howToRead: '1.0 = clockwork regularity · 0.0 = completely unpredictable gaps',
    },
    {
      label: 'Emotional Volatility',
      stage3Driver: 'emotional_volatility',
      value: signals.emotional_volatility,
      formatted: signals.emotional_volatility.toFixed(2),
      health: lowData ? 'insufficient' : signals.emotional_volatility > 0.25 ? 'strong' : signals.emotional_volatility > 0.08 ? 'moderate' : 'weak',
      meaning: signals.emotional_volatility > 0.25
        ? 'Caption tone swings sharply between posts.'
        : signals.emotional_volatility > 0.08
          ? 'Moderate emotional variation in captions.'
          : 'Tone stays relatively flat across posts.',
      formula: 'Std dev of arousal scores from caption keyword + punctuation analysis',
      howToRead: 'Higher = more reactive / mood-swingy content (not clinical diagnosis)',
    },
    {
      label: 'Engagement Slope',
      stage3Driver: 'engagement_slope',
      value: signals.engagement_slope,
      formatted: signals.engagement_slope.toFixed(4),
      health: lowData ? 'insufficient' : Math.abs(signals.engagement_slope) > 0.001 ? 'moderate' : 'weak',
      meaning: signals.engagement_slope > 0.001
        ? 'Engagement rate is trending upward over the window.'
        : signals.engagement_slope < -0.001
          ? 'Engagement rate is declining over the window.'
          : 'Engagement is flat — no clear trend.',
      formula: 'Linear regression slope of (likes+comments)/followers vs post index',
      howToRead: 'Positive = growing resonance per post · Negative = fading reach',
    },
    {
      label: 'Caption Length Trend',
      value: signals.caption_length_slope,
      formatted: signals.caption_length_slope.toFixed(4),
      health: lowData ? 'insufficient' : Math.abs(signals.caption_length_slope) > 0.5 ? 'moderate' : 'weak',
      meaning: signals.caption_length_slope > 0.5
        ? 'Captions are getting longer — more elaboration over time.'
        : signals.caption_length_slope < -0.5
          ? 'Captions are getting shorter — more minimal over time.'
          : 'Caption length is stable.',
      formula: 'Linear regression slope of word-count per post vs post index',
      howToRead: 'Words added/removed per post on average across the timeline',
    },
    {
      label: 'Hashtag Strategy',
      value: signals.hashtag_slope,
      formatted: signals.hashtag_slope.toFixed(4),
      health: lowData ? 'insufficient' : Math.abs(signals.hashtag_slope) > 0.05 ? 'moderate' : 'weak',
      meaning: signals.hashtag_slope > 0.05
        ? 'Using more hashtags recently — possible reach-seeking.'
        : signals.hashtag_slope < -0.05
          ? 'Using fewer hashtags — relying less on discovery tags.'
          : 'Hashtag usage is steady.',
      formula: 'Linear regression slope of hashtag count vs post index',
      howToRead: 'Rising slope may indicate audience-growth anxiety (heuristic)',
    },
    {
      label: 'Topic Drift',
      stage3Driver: 'topic_drift',
      value: signals.topic_drift_score,
      formatted: signals.topic_drift_score.toFixed(2),
      health: lowData ? 'insufficient' : signals.topic_drift_score > 0.7 ? 'strong' : signals.topic_drift_score > 0.4 ? 'moderate' : 'weak',
      meaning: signals.topic_drift_score > 0.7
        ? 'Early vs recent posts discuss very different topics.'
        : signals.topic_drift_score > 0.4
          ? 'Noticeable topic shift between early and recent content.'
          : 'Topics stay consistent across the timeline.',
      formula: '1 − vocabulary overlap between first third and last third of captions',
      howToRead: '1.0 = complete topic change · 0.0 = same themes throughout',
    },
    {
      label: 'Persona Consistency',
      value: signals.persona_consistency_score,
      formatted: signals.persona_consistency_score.toFixed(2),
      health: lowData ? 'insufficient' : healthFromRange(signals.persona_consistency_score, 0.4, 0.7),
      meaning: signals.persona_consistency_score >= 0.7
        ? 'Caption style and engagement patterns align coherently.'
        : signals.persona_consistency_score >= 0.4
          ? 'Mixed signals — some cross-modal mismatch.'
          : 'Caption and engagement patterns diverge — fragmented presentation.',
      formula: '1 − average coefficient of variation of caption length + engagement rate',
      howToRead: 'Higher = the “story” the metrics tell is internally consistent',
    },
  ];
}

export const HEALTH_STYLES: Record<MetricHealth, string> = {
  strong: 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]',
  moderate: 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  weak: 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]',
  insufficient: 'border-[var(--color-text-muted)]/30 bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]',
};

export const HEALTH_LABELS: Record<MetricHealth, string> = {
  strong: 'Clear signal',
  moderate: 'Moderate signal',
  weak: 'Weak signal',
  insufficient: 'Need more posts',
};

/** Distinct card backgrounds for Stage 3 driver metrics (derived signals panel). */
export const STAGE3_DRIVER_CARD_STYLES: Record<Stage3DriverKey, string> = {
  posting_regularity:
    'border-sky-500/35 bg-sky-500/12 ring-1 ring-sky-500/15 hover:border-sky-500/45',
  emotional_volatility:
    'border-rose-500/35 bg-rose-500/12 ring-1 ring-rose-500/15 hover:border-rose-500/45',
  engagement_slope:
    'border-emerald-500/35 bg-emerald-500/12 ring-1 ring-emerald-500/15 hover:border-emerald-500/45',
  topic_drift:
    'border-amber-500/35 bg-amber-500/12 ring-1 ring-amber-500/15 hover:border-amber-500/45',
};

export const STAGE3_DRIVER_LEGEND: { key: Stage3DriverKey; label: string; swatch: string }[] = [
  { key: 'posting_regularity', label: 'Posting regularity', swatch: 'bg-sky-500' },
  { key: 'engagement_slope', label: 'Engagement slope', swatch: 'bg-emerald-500' },
  { key: 'topic_drift', label: 'Topic drift', swatch: 'bg-amber-500' },
  { key: 'emotional_volatility', label: 'Emotional volatility', swatch: 'bg-rose-500' },
];
