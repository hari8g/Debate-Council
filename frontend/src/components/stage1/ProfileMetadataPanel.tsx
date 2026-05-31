import { BadgeCheck, BookOpen, Film, Link2, Shield, Users } from 'lucide-react';
import type { ProfileEnrichment } from '../../types/report';
import { formatPercent } from '../../lib/utils';
import { QualityScoreInfo } from './QualityScoreInfo';

export function ProfileMetadataPanel({ enrichment }: { enrichment: ProfileEnrichment }) {
  const m = enrichment.metadata;
  const r = enrichment.capture_report;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-xl">Profile & Network Metadata</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Captured from Instagram&apos;s web profile API, active stories, highlights, and per-post engagement
          endpoints.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-lg font-medium">@{m.username}</span>
          {m.full_name && <span className="text-[var(--color-text-muted)]">{m.full_name}</span>}
          {m.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs text-[var(--color-success)]">
              <BadgeCheck className="h-3 w-3" /> Verified
            </span>
          )}
          {m.is_business && (
            <span className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs">Business</span>
          )}
          {m.is_private && (
            <span className="rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-xs text-[var(--color-warning)]">
              Private
            </span>
          )}
        </div>
        {m.biography && <p className="mb-3 text-sm whitespace-pre-wrap">{m.biography}</p>}
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Followers" value={m.follower_count.toLocaleString()} icon={<Users className="h-3 w-3" />} />
          <Stat label="Following" value={m.following_count.toLocaleString()} />
          <Stat label="Total posts" value={m.media_count.toLocaleString()} />
          <Stat label="Reels" value={m.reels_count?.toLocaleString() ?? '—'} icon={<Film className="h-3 w-3" />} />
          <Stat label="F/F ratio" value={m.follower_following_ratio.toFixed(2)} />
          <Stat label="Posts / follower" value={m.posts_per_follower.toFixed(4)} />
          <Stat label="Category" value={m.category || m.business_category || '—'} />
          <Stat label="Account age" value={m.account_age_days ? `${m.account_age_days}d` : '—'} />
        </div>
        {(m.external_url || m.bio_links.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {m.external_url && (
              <a href={m.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline">
                <Link2 className="h-3 w-3" /> {m.external_url}
              </a>
            )}
            {m.bio_links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded bg-[var(--color-bg-elevated)] px-2 py-1 hover:underline">
                {l.title || l.url}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-[var(--color-accent)]" />
          Data capture audit
        </h4>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-2xl text-[var(--color-accent)]">
          <span>Quality score: {formatPercent(r.quality_score)}</span>
          <QualityScoreInfo />
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <AuditChip label="Posts fetched" value={String(r.posts_fetched)} />
          <AuditChip label="Posts enriched" value={String(r.posts_enriched)} />
          <AuditChip label="Comments pulled" value={String(r.comments_fetched)} />
          <AuditChip label="Likers sampled" value={String(r.likers_sampled)} />
          <AuditChip label="Stories" value={String(r.stories_fetched)} />
          <AuditChip label="Highlights" value={String(r.highlights_fetched)} />
          <AuditChip label="Feed pages" value={String(r.feed_pages_scanned)} />
          <AuditChip label="API calls" value={String(r.api_calls_made)} />
        </div>
        {r.limitations.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-[var(--color-text-muted)]">
            {r.limitations.map((lim) => (
              <li key={lim}>• {lim}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          Captured {m.capture_timestamp ? new Date(m.capture_timestamp).toLocaleString() : '—'}
        </p>
      </div>

      {(enrichment.stories.length > 0 || enrichment.highlights.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {enrichment.stories.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h4 className="mb-2 text-sm font-medium">Active stories ({enrichment.stories.length})</h4>
              <ul className="space-y-2 text-sm">
                {enrichment.stories.map((s) => (
                  <li key={s.id} className="rounded bg-[var(--color-bg-elevated)] p-2">
                    <span className="text-xs uppercase text-[var(--color-text-muted)]">{s.media_type}</span>
                    {s.caption && <p className="mt-1">{s.caption}</p>}
                    {s.mentions.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">@{s.mentions.join(' @')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {enrichment.highlights.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4" /> Highlight reels ({enrichment.highlights.length})
              </h4>
              <ul className="space-y-2 text-sm">
                {enrichment.highlights.map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded bg-[var(--color-bg-elevated)] p-2">
                    <span>{h.title}</span>
                    {h.item_count > 0 && <span className="text-xs text-[var(--color-text-muted)]">{h.item_count} items</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {enrichment.post_details.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Post engagement depth ({enrichment.post_details.length} enriched)</h4>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            Top comments and liker samples from the most recent posts — audience voice beyond the creator&apos;s captions.
          </p>
          <div className="space-y-3">
            {enrichment.post_details.map((p) => (
              <details key={p.media_id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                <summary className="cursor-pointer px-4 py-3 text-sm hover:bg-[var(--color-bg-elevated)]">
                  Post #{p.post_index} · {p.likes.toLocaleString()} ♥ · {p.comments_count} comments
                  {p.views != null && ` · ${p.views.toLocaleString()} views`}
                  {p.saves != null && ` · ${p.saves.toLocaleString()} saves`}
                  {p.location_name && ` · 📍 ${p.location_name}`}
                </summary>
                <div className="border-t border-[var(--color-border)] px-4 py-3 text-sm">
                  {p.music_title && <p className="mb-2 text-xs text-[var(--color-text-muted)]">🎵 {p.music_title}</p>}
                  {p.liker_sample.length > 0 && (
                    <p className="mb-2 text-xs">
                      <strong>Liker sample:</strong> @{p.liker_sample.slice(0, 8).join(', @')}
                      {p.liker_sample.length > 8 && ` +${p.liker_sample.length - 8} more`}
                    </p>
                  )}
                  {p.top_comments.length > 0 ? (
                    <ul className="space-y-2">
                      {p.top_comments.slice(0, 8).map((c, i) => (
                        <li key={i} className="rounded bg-[var(--color-bg-elevated)] p-2 text-xs">
                          <strong>@{c.username}</strong>
                          {c.likes > 0 && <span className="text-[var(--color-text-muted)]"> · {c.likes} ♥</span>}
                          <p className="mt-0.5 text-[var(--color-text-muted)]">{c.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[var(--color-text-muted)]">No comments retrieved (private or rate-limited).</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded bg-[var(--color-bg-elevated)] p-2">
      <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
        {icon} {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function AuditChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[var(--color-bg-elevated)] px-2 py-1.5">
      <div className="text-[10px] text-[var(--color-text-muted)]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
