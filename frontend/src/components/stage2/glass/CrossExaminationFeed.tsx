import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Challenge } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { cn } from '../../../lib/utils';
import { ArrowRight, Radio } from 'lucide-react';

const VISIBLE_TRAIL = 3;

function challengeExcerpt(ch: Challenge, max = 88): string {
  const raw =
    typeof ch.challenge_text === 'string'
      ? ch.challenge_text
      : JSON.stringify(ch.challenge_text);
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

function challengeBody(ch: Challenge): string {
  return typeof ch.challenge_text === 'string'
    ? ch.challenge_text
    : JSON.stringify(ch.challenge_text, null, 2);
}

function AgentPair({ ch, size = 'sm' }: { ch: Challenge; size?: 'sm' | 'md' }) {
  const text = size === 'md' ? 'text-sm' : 'text-[11px]';
  return (
    <div className={cn('flex flex-wrap items-center gap-1 font-medium', text)}>
      <span className="text-[var(--color-danger)]">
        {AGENT_LABELS[ch.challenger]?.split(' ')[0] || ch.challenger}
      </span>
      <ArrowRight className="h-3 w-3 shrink-0 text-[var(--color-text-tertiary)]" />
      <span className="text-[var(--color-text)]">
        {AGENT_LABELS[ch.target]?.split(' ')[0] || ch.target}
      </span>
    </div>
  );
}

export function CrossExaminationFeed({
  challenges,
  focused,
  onFocus,
  isLive,
  total = 30,
}: {
  challenges: Challenge[];
  focused: Challenge | null;
  onFocus: (ch: Challenge) => void;
  isLive?: boolean;
  total?: number;
}) {
  const latest = challenges[challenges.length - 1];
  const display = focused ?? latest;

  const trail = useMemo(() => {
    if (challenges.length <= 1 || !display) return [];
    const key = `${display.challenger}|${display.target}`;
    const withoutDisplay = challenges.filter((c) => `${c.challenger}|${c.target}` !== key);
    return withoutDisplay.slice(-VISIBLE_TRAIL).reverse();
  }, [challenges, display]);

  const focusIndex = display ? challenges.indexOf(display) + 1 : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/45 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
            </span>
          ) : (
            <Radio className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          )}
          <span className="text-xs font-semibold">Live feed</span>
        </div>
        <span className="rounded-full bg-white/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--color-text-muted)]">
          {challenges.length}/{total}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        {!display ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Radio className="mb-2 h-6 w-6 text-[var(--color-text-tertiary)]" />
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Waiting for challenges</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${display.challenger}-${display.target}-${focusIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="feed-card-new flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-accent)]/30 bg-gradient-to-br from-white/75 to-white/45 shadow-sm"
              >
                <div className="shrink-0 border-b border-white/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {display === latest && isLive ? 'Just in' : 'In focus'}
                    </span>
                    <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">
                      #{focusIndex}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <AgentPair ch={display} size="md" />
                  </div>
                </div>
                <p className="min-h-0 flex-1 overflow-hidden px-3 py-2.5 text-[12px] leading-relaxed text-[var(--color-text)] line-clamp-[8] sm:line-clamp-[10]">
                  {challengeBody(display)}
                </p>
              </motion.div>
            </AnimatePresence>

            {trail.length > 0 && (
              <div className="mt-3 shrink-0 space-y-1">
                <p className="px-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Recent
                </p>
                {trail.map((ch, i) => {
                  const num = challenges.indexOf(ch) + 1;
                  return (
                    <button
                      key={`${ch.challenger}-${ch.target}-${num}`}
                      type="button"
                      onClick={() => onFocus(ch)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg border border-transparent bg-white/35 px-2 py-1.5 text-left transition hover:bg-white/55',
                        focused === ch && 'border-[var(--color-accent)]/25 bg-white/60',
                      )}
                      style={{ opacity: 1 - i * 0.22 }}
                    >
                      <span className="w-5 shrink-0 text-[9px] tabular-nums text-[var(--color-text-tertiary)]">
                        {num}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--color-text-muted)]">
                        {challengeExcerpt(ch, 56)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
