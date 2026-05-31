import { useMemo, useState } from 'react';
import type { DerivedSignals, ProfileSignalMatrix, SignalSummary } from '../../types/report';
import { TimeSeriesCharts } from './TimeSeriesCharts';
import { MetricHelp } from '../shared/MetricHelp';
import { ArrowRight, Database, Layers, LineChart } from 'lucide-react';

const CHANNELS = [
  { key: 'captions', label: 'Captions', desc: 'Text content and emotional tone per post' },
  { key: 'engagement', label: 'Engagement', desc: 'Likes, comments, rates vs audience size' },
  { key: 'cadence', label: 'Cadence', desc: 'Posting intervals and burst patterns' },
  { key: 'hashtags', label: 'Hashtags', desc: 'Topic tags and discoverability signals' },
  { key: 'network', label: 'Network', desc: 'Follower/following ratio at capture time' },
];

export function SignalMatrixFlow({
  matrix,
  summary,
  derived,
}: {
  matrix: ProfileSignalMatrix;
  summary?: SignalSummary;
  derived?: DerivedSignals;
}) {
  const [step, setStep] = useState(0);
  const n = matrix.captions.length;
  const spanLabel = summary?.fetch_all_posts
    ? `Full archive · ${summary.analysis_period_days}d span`
    : summary
      ? `Last ${summary.analysis_period_days} days`
      : `${n} posts`;

  const stats = useMemo(
    () => [
      { label: 'Posts in matrix', value: String(n), help: 'Chronological posts after fetch & deduplication' },
      { label: 'Time span', value: spanLabel, help: 'Calendar coverage of included posts' },
      { label: 'Avg engagement', value: avg(matrix.engagement_rates), help: 'Mean engagement rate across posts' },
      { label: 'Posting regularity', value: derived ? `${Math.round(derived.posting_regularity * 100)}%` : '—', help: 'Inverse coefficient of variation of posting intervals — higher means steadier cadence' },
    ],
    [n, spanLabel, matrix.engagement_rates, derived],
  );

  const steps = [
    { title: 'Raw posts collected', icon: Database },
    { title: 'Channels aligned', icon: Layers },
    { title: 'Temporal matrix ready', icon: LineChart },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.title} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                step === i
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.title}
            </button>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          Each post becomes one row in a time-ordered table: timestamp, caption, likes, comments, hashtags,
          and type. Older posts sit at index 0; the newest at the end — this ordering drives all downstream slopes and state estimation.
        </p>
      )}

      {step === 1 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((ch) => (
            <div key={ch.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <p className="text-sm font-medium">{ch.label}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{ch.desc}</p>
            </div>
          ))}
        </div>
      )}

      {step === 2 && derived && (
        <p className="text-sm text-[var(--color-text-muted)]">
          The matrix feeds derived signals (slopes, bursts, topic drift) and Stage 3 state vectors. Explore the
          temporal patterns below — each chart reads directly from this matrix.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, help }) => (
          <div key={label} className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2">
            <div className="flex items-center text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
              {label}
              <MetricHelp title={label}>{help}</MetricHelp>
            </div>
            <div className="mt-0.5 font-medium text-[var(--color-accent)]">{value}</div>
          </div>
        ))}
      </div>

      {derived && <TimeSeriesCharts matrix={matrix} summary={summary} derived={derived} />}
    </div>
  );
}

function avg(values: number[]): string {
  if (!values.length) return '—';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(4);
}
