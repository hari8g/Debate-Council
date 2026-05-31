import type { DerivedSignals } from '../types/report';

export type MetricHealth = 'strong' | 'moderate' | 'weak' | 'insufficient';

export interface MetricInterpretation {
  label: string;
  value: number;
  formatted: string;
  health: MetricHealth;
  meaning: string;
  formula: string;
  howToRead: string;
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
