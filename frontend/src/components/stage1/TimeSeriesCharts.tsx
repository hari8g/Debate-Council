import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { chartTick, chartTooltipStyle } from '../../lib/chartTheme';
import type { DerivedSignals, ProfileSignalMatrix, SignalSummary } from '../../types/report';

export function TimeSeriesCharts({
  matrix,
  summary,
  derived,
}: {
  matrix?: ProfileSignalMatrix;
  summary?: SignalSummary;
  derived?: DerivedSignals;
}) {
  if (!matrix && !summary) return null;

  const intervals = matrix?.posting_intervals_hours.map((v, i) => ({ i, hours: v })) || [];
  const engagement = matrix?.engagement_rates.map((v, i) => ({ i, rate: v * 100 })) || [];
  const captions = matrix?.caption_lengths.map((v, i) => ({ i, words: v })) || [];
  const hashtags = matrix?.hashtag_counts.map((v, i) => ({ i, count: v })) || [];

  const chartProps = {
    margin: { top: 5, right: 5, left: 0, bottom: 5 },
  };

  return (
    <div>
      <h3 className="mb-4 text-xl">Temporal Signals</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {intervals.length > 0 && (
          <ChartCard title="Posting Rhythm (hours between posts)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={intervals} {...chartProps}>
                <XAxis dataKey="i" tick={chartTick} />
                <YAxis tick={chartTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="hours" stroke="#c9a962" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {engagement.length > 0 && (
          <ChartCard title="Engagement Rate (%)">
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart {...chartProps}>
                <XAxis dataKey="i" type="number" tick={chartTick} />
                <YAxis dataKey="rate" tick={chartTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Scatter data={engagement} fill="#c9a962" />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {captions.length > 0 && (
          <ChartCard title="Caption Length Evolution">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={captions} {...chartProps}>
                <XAxis dataKey="i" tick={chartTick} />
                <YAxis tick={chartTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="words" stroke="#c9a962" fill="#c9a96233" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {hashtags.length > 0 && (
          <ChartCard title="Hashtag Count per Post">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={hashtags} {...chartProps}>
                <XAxis dataKey="i" tick={chartTick} />
                <YAxis tick={chartTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#8a7340" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {derived && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-sm">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            Temporal summary (from derived signals)
          </h4>
          <p className="text-[var(--color-text-muted)]">
            <strong>Engagement slope</strong> {derived.engagement_slope.toFixed(4)} —{' '}
            {derived.engagement_slope > 0.001
              ? 'engagement trending up over the window'
              : derived.engagement_slope < -0.001
                ? 'engagement trending down'
                : 'flat engagement trend'}
            . <strong>Topic drift</strong> {derived.topic_drift_score.toFixed(2)} —{' '}
            {derived.topic_drift_score > 0.7
              ? 'topics shifted significantly between early and recent posts'
              : derived.topic_drift_score > 0.4
                ? 'moderate topic evolution'
                : 'topics stayed consistent'}
            .
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Charts above show raw post-level data; summary values are regression statistics computed in Stage 1.
          </p>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h4 className="mb-2 text-sm text-[var(--color-text-muted)]">{title}</h4>
      {children}
    </div>
  );
}
