import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Challenge, ChallengeEvaluation, RevisedHypothesis } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { cn } from '../../../lib/utils';
import { ArrowRight, Radio, Shield } from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';

const TRAIL = 3;

function challengeText(ch: Challenge): string {
  return typeof ch.challenge_text === 'string'
    ? ch.challenge_text
    : JSON.stringify(ch.challenge_text, null, 2);
}

function getEvaluation(rev: RevisedHypothesis | undefined, ch: Challenge): ChallengeEvaluation | undefined {
  const list = rev?.revised_analysis?.challenge_evaluations;
  if (!Array.isArray(list)) return undefined;
  return list.find(
    (e): e is ChallengeEvaluation =>
      typeof e === 'object' && e !== null && (e as ChallengeEvaluation).challenger === ch.challenger,
  );
}

export function DefenseFeed({
  activeRev,
  challenges,
  focused,
  onFocus,
  isLive,
}: {
  activeRev?: RevisedHypothesis;
  challenges: Challenge[];
  focused: Challenge | null;
  onFocus: (ch: Challenge) => void;
  isLive?: boolean;
}) {
  const display = focused;
  const eval_ = display && activeRev ? getEvaluation(activeRev, display) : undefined;

  const trail = useMemo(() => {
    if (!display || challenges.length <= 1) return [];
    const key = `${display.challenger}|${display.target}`;
    return challenges
      .filter((c) => `${c.challenger}|${c.target}` !== key)
      .slice(-TRAIL)
      .reverse();
  }, [challenges, display]);

  const idx = display ? challenges.findIndex(
    (c) => c.challenger === display.challenger && c.target === display.target,
  ) + 1 : 0;

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
            <Shield className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          )}
          <span className="text-xs font-semibold">Defense feed</span>
        </div>
        {activeRev && (
          <span className="rounded-full bg-white/55 px-2 py-0.5 text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {challenges.length} challenges
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        {!display || !activeRev ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Radio className="mb-2 h-6 w-6 text-[var(--color-text-tertiary)]" />
            <p className="text-xs text-[var(--color-text-muted)]">Select a challenge in the portal</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${display.challenger}-${display.target}-${idx}-${eval_?.verdict ?? 'pending'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.26 }}
                className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-accent)]/25 bg-gradient-to-br from-white/75 to-white/45 shadow-sm"
              >
                <div className="shrink-0 border-b border-white/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {eval_ ? 'Verdict' : isLive ? 'Reviewing' : 'Challenge'}
                    </span>
                    <span className="text-[10px] tabular-nums text-[var(--color-text-muted)]">#{idx}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-sm font-medium">
                    <span className="text-[var(--color-danger)]">
                      {(AGENT_LABELS[display.challenger] || display.challenger).split(' ')[0]}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                    <span className="text-[var(--color-text-muted)]">defends</span>
                  </div>
                  {eval_ && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <VerdictBadge verdict={eval_.verdict} />
                      {eval_.confidence_delta !== 0 && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          Δ {Math.round(eval_.confidence_delta * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">Objection</p>
                  <p className="mt-1 line-clamp-4 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                    {challengeText(display)}
                  </p>
                  {eval_ && (
                    <>
                      <p className="mt-3 text-[10px] font-medium uppercase text-[var(--color-text-tertiary)]">
                        Response
                      </p>
                      <p className="mt-1 line-clamp-5 text-[12px] leading-relaxed text-[var(--color-text)]">
                        {eval_.response || eval_.rationale}
                      </p>
                    </>
                  )}
                  {!eval_ && isLive && (
                    <p className="mt-4 text-xs text-[var(--color-accent)]">Evaluating this challenge…</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {trail.length > 0 && (
              <div className="mt-3 shrink-0 space-y-1">
                <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Other challenges
                </p>
                {trail.map((ch, i) => {
                  const ev = getEvaluation(activeRev, ch);
                  return (
                    <button
                      key={`${ch.challenger}-${i}`}
                      type="button"
                      onClick={() => onFocus(ch)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg bg-white/35 px-2 py-1.5 text-left hover:bg-white/55',
                        focused === ch && 'ring-1 ring-[var(--color-accent)]/30',
                      )}
                      style={{ opacity: 1 - i * 0.2 }}
                    >
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--color-text-muted)]">
                        {(AGENT_LABELS[ch.challenger] || ch.challenger).split(' ')[0]}
                        {ev && ` · ${ev.verdict}`}
                      </span>
                      {ev && <VerdictBadge verdict={ev.verdict} />}
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
