import { Fragment, useState } from 'react';
import type { PostSample, ProfileEnrichment } from '../../types/report';

export function PostSampleTable({
  samples,
  enrichment,
}: {
  samples: PostSample[];
  enrichment?: ProfileEnrichment;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!samples.length) return null;

  const detailByIndex = new Map(
    (enrichment?.post_details ?? []).map((d) => [d.post_index, d]),
  );

  return (
    <div>
      <h3 className="mb-4 text-xl">Post Samples</h3>
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-elevated)] text-left text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Engagement</th>
              <th className="px-4 py-2">Caption</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((post) => {
              const detail = detailByIndex.get(post.index);
              return (
                <Fragment key={post.index}>
                  <tr
                    className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]"
                    onClick={() => setExpanded(expanded === post.index ? null : post.index)}
                  >
                    <td className="px-4 py-2">{post.index}</td>
                    <td className="px-4 py-2 capitalize">{post.post_type}</td>
                    <td className="px-4 py-2">
                      {post.likes} ♥ · {(post.engagement_rate * 100).toFixed(2)}%
                      {post.views != null && ` · ${post.views.toLocaleString()} views`}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2">{post.caption_excerpt}</td>
                  </tr>
                  {expanded === post.index && (
                    <tr className="border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
                      <td colSpan={4} className="px-4 py-3 text-[var(--color-text-muted)]">
                        <div>{post.caption_excerpt}</div>
                        {post.location && <div className="mt-1 text-xs">📍 {post.location}</div>}
                        {post.hashtags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {post.hashtags.map((h) => (
                              <span key={h} className="rounded bg-[var(--color-bg-elevated)] px-2 py-0.5 text-xs">
                                #{h}
                              </span>
                            ))}
                          </div>
                        )}
                        {detail && detail.top_comments.length > 0 && (
                          <div className="mt-3">
                            <div className="mb-1 text-xs font-medium text-[var(--color-text)]">Top comments</div>
                            <ul className="space-y-1">
                              {detail.top_comments.slice(0, 5).map((c, i) => (
                                <li key={i} className="rounded bg-[var(--color-bg-elevated)] p-2 text-xs">
                                  <strong>@{c.username}:</strong> {c.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
