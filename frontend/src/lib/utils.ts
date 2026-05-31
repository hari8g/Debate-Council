import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/30';
  if (confidence >= 0.4) return 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30';
  return 'text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30';
}

export function formatEvidence(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatEvidence).filter(Boolean).join('; ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${formatEvidence(v)}`)
      .join('; ');
  }
  return String(value);
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Parse LLM confidence that may be 0.85, "85%", or "Medium". */
export function parseConfidence(value: unknown, defaultVal = 0.5): number {
  if (value == null) return defaultVal;
  if (typeof value === 'number') {
    if (value > 1 && value <= 100) return value / 100;
    return Math.max(0, Math.min(1, value));
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    const words: Record<string, number> = {
      'very low': 0.2, low: 0.35, medium: 0.55, moderate: 0.55, high: 0.75, 'very high': 0.9,
    };
    if (words[s] != null) return words[s];
    if (s.endsWith('%')) {
      const n = parseFloat(s.slice(0, -1));
      if (!Number.isNaN(n)) return Math.max(0, Math.min(1, n / 100));
    }
    const n = parseFloat(s);
    if (!Number.isNaN(n)) {
      if (n > 1 && n <= 100) return n / 100;
      return Math.max(0, Math.min(1, n));
    }
  }
  return defaultVal;
}

export function parseInstagramUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('@')) return trimmed.length > 1;
  return /instagram\.com\/[\w.]+/i.test(trimmed) || /^[\w.]+$/.test(trimmed);
}

export function reportToMarkdown(report: import('../types/report').PersonaDynamicsReport): string {
  const lines = [
    `# North Star Report: @${report.username}`,
    '',
    `**Profile:** ${report.profile_url}`,
    `**Posts analysed:** ${report.posts_analysed} over ${report.analysis_period_days} days`,
    `**Data quality:** ${formatPercent(report.data_quality_score)}`,
    '',
    '## Key Insight',
    report.persona_model?.key_insight || 'N/A',
    '',
    '## Derived Signals',
    `- Posting regularity: ${formatNumber(report.derived_signals.posting_regularity)}`,
    `- Emotional volatility: ${formatNumber(report.derived_signals.emotional_volatility)}`,
    `- Engagement slope: ${formatNumber(report.derived_signals.engagement_slope, 4)}`,
    `- Topic drift: ${formatNumber(report.derived_signals.topic_drift_score)}`,
    '',
    '## Future State (T+30)',
    report.future_narrative?.next_30_days || 'N/A',
    '',
    '## Epistemic Limits',
    report.future_narrative?.epistemic_limits || 'N/A',
  ];
  return lines.join('\n');
}
