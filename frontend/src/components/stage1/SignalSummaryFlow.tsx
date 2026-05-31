import { useState } from 'react';
import type { ProfileEnrichment, SignalSummary } from '../../types/report';
import { PostSampleTable } from './PostSampleTable';
import { MetricHelp } from '../shared/MetricHelp';
import { Calendar, FileText, Sparkles } from 'lucide-react';

export function SignalSummaryFlow({
  summary,
}: {
  summary: SignalSummary;
}) {
  const [tab, setTab] = useState<'overview' | 'samples'>('overview');
  const periodLabel = summary.fetch_all_posts
    ? `Full archive (${summary.analysis_period_days} day span)`
    : `${summary.analysis_period_days}-day window`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-br from-[var(--color-bg)] to-[var(--color-bg-muted)] p-5">
        <p className="section-eyebrow-accent">Stage 1 complete</p>
        <h3 className="mt-1 text-xl">Signal summary — what we captured</h3>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          A readable snapshot of @{summary.username}&apos;s public voice: enough posts to detect rhythm,
          enough context to ground later debate and projection.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={FileText}
          label="Posts analysed"
          value={String(summary.posts_analysed)}
          help="Posts that passed fetch, deduplication, and entered the signal matrix"
        />
        <SummaryTile
          icon={Calendar}
          label="Analysis window"
          value={periodLabel}
          help={
            summary.fetch_all_posts
              ? 'All available posts were fetched; span is oldest to newest post date'
              : 'Only posts within the selected lookback window are included'
          }
        />
        <SummaryTile
          icon={Sparkles}
          label="Representative samples"
          value={String(summary.post_samples?.length ?? 0)}
          help="Evenly spaced posts chosen to illustrate the full arc without showing every caption"
        />
      </div>

      <div className="flex gap-2 border-b border-[var(--color-border)]">
        {(['overview', 'samples'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm capitalize transition ${
              tab === t
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {t === 'overview' ? 'Profile snapshot' : 'Post samples'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          {summary.bio && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <p className="text-xs text-[var(--color-text-muted)]">Bio</p>
              <p className="mt-1 text-sm">{summary.bio}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Followers" value={summary.follower_count.toLocaleString()} />
            <MiniStat label="Following" value={summary.following_count.toLocaleString()} />
            <MiniStat label="Next stage" value="Debate council" />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            This summary travels into Stage 2 as shared evidence — agents will cite these posts and metrics when forming hypotheses.
          </p>
        </div>
      )}

      {tab === 'samples' && (
        <PostSampleTable samples={summary.post_samples} enrichment={summary.enrichment as ProfileEnrichment | undefined} />
      )}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  help,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-2 flex items-center gap-2 text-[var(--color-accent)]">
        <Icon className="h-4 w-4" />
        <span className="flex items-center text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
          <MetricHelp title={label}>{help}</MetricHelp>
        </span>
      </div>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2">
      <p className="text-[10px] uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className="font-medium text-[var(--color-accent)]">{value}</p>
    </div>
  );
}
