import { useState } from 'react';
import type { DerivedSignals } from '../../types/report';
import {
  HEALTH_LABELS,
  HEALTH_STYLES,
  interpretDerivedSignals,
  STAGE3_DRIVER_CARD_STYLES,
  STAGE3_DRIVER_LEGEND,
} from '../../lib/signalInterpretation';

export function DerivedMetrics({ signals, postsAnalysed }: { signals: DerivedSignals; postsAnalysed?: number }) {
  const n = postsAnalysed ?? 0;
  const metrics = interpretDerivedSignals(signals, n);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <h3 className="mb-2 text-xl">Derived Signals</h3>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        Seven metrics computed deterministically from your fetched posts — not LLM guesses. Each value comes from
        caption text, timestamps, likes, and hashtags in the analysis window ({n} posts).
      </p>

      <div className="mb-4 rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5 px-3 py-2.5">
        <p className="text-xs font-medium text-[var(--color-text)]">Stage 3 projection inputs</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Four highlighted metrics below initialize the dynamical state model (posting rhythm, engagement trend, topic
          shift, emotional volatility).
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {STAGE3_DRIVER_LEGEND.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.swatch}`} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {n > 0 && n < 5 && (
        <div className="mb-4 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          Only {n} post{n === 1 ? '' : 's'} in window — temporal metrics are computed but marked &quot;Need more posts&quot;
          until you have at least 5.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => {
          const driverStyle = m.stage3Driver ? STAGE3_DRIVER_CARD_STYLES[m.stage3Driver] : null;
          return (
          <button
            key={m.label}
            type="button"
            onClick={() => setExpanded(expanded === m.label ? null : m.label)}
            className={`rounded-lg border p-4 text-left transition ${
              driverStyle
                ? driverStyle
                : expanded === m.label
                  ? 'border-[var(--color-accent)]/40 bg-[var(--color-bg-card)] ring-1 ring-[var(--color-accent)]/20'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent)]/30'
            } ${!driverStyle && expanded === m.label ? '' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                {m.label}
                {m.stage3Driver && (
                  <span className="ml-1.5 rounded bg-black/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--color-text)]">
                    Stage 3
                  </span>
                )}
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${HEALTH_STYLES[m.health]}`}>
                {HEALTH_LABELS[m.health]}
              </span>
            </div>
            <div className="mt-1 text-2xl text-[var(--color-accent)]">{m.formatted}</div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{m.meaning}</p>
            {expanded === m.label && (
              <div className="mt-3 space-y-1 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <p>
                  <strong className="text-[var(--color-text)]">Formula:</strong> {m.formula}
                </p>
                <p>
                  <strong className="text-[var(--color-text)]">Scale:</strong> {m.howToRead}
                </p>
              </div>
            )}
          </button>
          );
        })}
      </div>

      {signals.burst_events.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="mb-1 text-sm font-medium">Burst Events ({signals.burst_events.length})</h4>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Detected when posting frequency spiked well above the account&apos;s baseline rhythm.
          </p>
          <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
            {signals.burst_events.map((b, i) => (
              <li key={i}>
                {b.description} — {b.multiplier.toFixed(1)}× at posts {b.start_index}–{b.end_index}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
