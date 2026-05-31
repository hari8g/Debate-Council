import type { ProfileEnrichment } from '../../types/report';
import { formatPercent } from '../../lib/utils';
import { QualityScoreInfo } from './QualityScoreInfo';
import { MetricHelp } from '../shared/MetricHelp';
import { MessageCircle, Heart, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function EngagementDepthPanel({
  enrichment,
  payload,
}: {
  enrichment?: ProfileEnrichment;
  payload?: Record<string, unknown>;
}) {
  const [phase, setPhase] = useState(0);
  const report = enrichment?.capture_report;
  const posts = enrichment?.post_details ?? [];
  const totalComments = posts.reduce((s, p) => s + p.comments_count, 0);
  const withComments = posts.filter((p) => p.top_comments.length > 0).length;
  const enrichedN = Number(payload?.posts_enriched ?? report?.posts_enriched ?? posts.length);

  const phases = [
    { title: 'Why enrich?', body: 'Raw like counts miss audience quality. We sample comments and likers on recent posts to see who engages and how.' },
    { title: 'What we capture', body: `${enrichedN} recent posts deep-scanned for comments, liker handles, locations, and view counts where available.` },
    { title: 'How it is used', body: 'Enrichment feeds capture quality scoring and gives Stage 2 agents concrete audience evidence beyond captions.' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {phases.map((p, i) => (
          <button
            key={p.title}
            type="button"
            onClick={() => setPhase(i)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
              phase === i
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
            }`}
          >
            {i + 1}. {p.title}
            {i < phases.length - 1 && phase === i && <ChevronRight className="h-3 w-3" />}
          </button>
        ))}
      </div>

      <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        {phases[phase].body}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Posts enriched"
          value={String(enrichedN)}
          help="Most recent posts selected for comment/liker API calls (rate-limit aware)"
        />
        <Metric
          label="Comments captured"
          value={String(payload?.comments_fetched ?? report?.comments_fetched ?? totalComments)}
          help="Total comment records retrieved across enriched posts"
        />
        <Metric
          label="Posts w/ comments"
          value={posts.length ? `${withComments}/${posts.length}` : '—'}
          help="Share of enriched posts where comment text was available"
        />
        <Metric
          label="Depth quality"
          value={payload?.quality_score != null ? formatPercent(Number(payload.quality_score)) : report ? formatPercent(report.quality_score) : '—'}
          help="Weighted score: post volume, bio, stories, comments, likers, views — measures how complete the capture is"
          info={<QualityScoreInfo />}
        />
      </div>

      {posts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Audience signals — click to expand</h4>
          {posts.slice(0, 6).map((post) => (
            <EnrichedPostCard key={post.media_id || post.shortcode} post={post} />
          ))}
        </div>
      )}

      {posts.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">Enrichment runs after posts are fetched — data will appear here shortly.</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  help,
  info,
}: {
  label: string;
  value: string;
  help: string;
  info?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2">
      <div className="flex items-center text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
        <MetricHelp title={label}>{help}</MetricHelp>
        {info}
      </div>
      <div className="mt-0.5 font-medium text-[var(--color-accent)]">{value}</div>
    </div>
  );
}

function EnrichedPostCard({ post }: { post: import('../../types/report').PostDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]"
    >
      <summary className="cursor-pointer px-3 py-2.5 text-sm">
        <span className="font-medium">Post #{post.post_index + 1}</span>
        <span className="ml-3 inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <Heart className="h-3 w-3" /> {post.likes.toLocaleString()}
          <MessageCircle className="ml-2 h-3 w-3" /> {post.comments_count}
        </span>
      </summary>
      <div className="border-t border-[var(--color-border)] px-3 py-2">
        {post.top_comments.slice(0, 2).map((c, i) => (
          <p key={i} className="mb-2 text-xs text-[var(--color-text-muted)]">
            <span className="text-[var(--color-accent)]">@{c.username}</span>: {c.text.slice(0, 140)}
          </p>
        ))}
        {post.top_comments.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">Counts only — comment text unavailable.</p>
        )}
      </div>
    </details>
  );
}
