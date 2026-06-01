import { useMemo } from 'react';
import type { Challenge, ChallengeEvaluation, RevisedHypothesis } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { cn, formatConfidence, parseConfidence } from '../../../lib/utils';
import { VerdictBadge } from './VerdictBadge';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

const AGENT_ICON: Record<string, typeof Brain> = {
  psychographer: Brain,
  sociologist: Users,
  narrative_analyst: BookOpen,
  behavioural_economist: TrendingUp,
  temporal_analyst: Clock,
  cultural_analyst: Globe,
};

function getEvaluation(rev: RevisedHypothesis | undefined, ch: Challenge): ChallengeEvaluation | undefined {
  const list = rev?.revised_analysis?.challenge_evaluations;
  if (!Array.isArray(list)) return undefined;
  return list.find(
    (e): e is ChallengeEvaluation =>
      typeof e === 'object' && e !== null && (e as ChallengeEvaluation).challenger === ch.challenger,
  );
}

export function DefensePortal({
  activeRev,
  selectedChallenge,
  onSelectChallenge,
  isLive,
}: {
  activeRev?: RevisedHypothesis;
  selectedChallenge: Challenge | null;
  onSelectChallenge: (ch: Challenge) => void;
  isLive?: boolean;
}) {
  const challenges = activeRev?.challenges_received ?? [];
  const agent = activeRev?.agent;

  const stats = useMemo(() => {
    let accept = 0;
    let partial = 0;
    let reject = 0;
    let evaluated = 0;
    for (const ch of challenges) {
      const v = getEvaluation(activeRev, ch)?.verdict;
      if (!v) continue;
      evaluated += 1;
      if (v === 'accept') accept += 1;
      else if (v === 'partial') partial += 1;
      else reject += 1;
    }
    return { accept, partial, reject, evaluated };
  }, [activeRev, challenges]);

  const before = activeRev ? parseConfidence(activeRev.original?.analysis?.confidence, 0.5) : 0.5;
  const after = activeRev ? parseConfidence(activeRev.revised_analysis?.confidence, before) : before;
  const evalPct = challenges.length ? Math.round((stats.evaluated / challenges.length) * 100) : 0;

  const Icon = agent ? AGENT_ICON[agent] ?? Brain : Brain;

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow-accent">Defense portal</p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight">
            {agent ? AGENT_LABELS[agent] || agent : 'Select an agent'}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Per-challenge verdicts · click a cell to inspect
          </p>
        </div>
        {activeRev && (
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border)" strokeWidth="2" opacity="0.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${evalPct} ${100 - evalPct}`}
                  pathLength={100}
                />
              </svg>
              <span className="text-sm font-semibold tabular-nums text-[var(--color-accent)]">{evalPct}%</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums text-[var(--color-accent)]">
                {formatConfidence(before)} → {formatConfidence(after)}
              </p>
              {isLive && (
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
                  ● Evaluating
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {!activeRev ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/55 bg-white/25 p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Choose an agent from the orbit above</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-br from-white/50 via-white/35 to-white/20 p-4 shadow-inner">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-[var(--color-accent)] shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[var(--color-success)]">
                {stats.reject} rejected
              </span>
              <span className="rounded-full bg-[var(--color-warning)]/15 px-2 py-0.5 text-[var(--color-warning)]">
                {stats.partial} partial
              </span>
              <span className="rounded-full bg-[var(--color-danger)]/15 px-2 py-0.5 text-[var(--color-danger)]">
                {stats.accept} accepted
              </span>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 content-start sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {challenges.map((ch, i) => {
              const ev = getEvaluation(activeRev, ch);
              const selected =
                selectedChallenge?.challenger === ch.challenger &&
                selectedChallenge?.target === ch.target;
              const ChallengerIcon = AGENT_ICON[ch.challenger] ?? Brain;
              return (
                <button
                  key={`${ch.challenger}-${i}`}
                  type="button"
                  onClick={() => onSelectChallenge(ch)}
                  className={cn(
                    'flex flex-col rounded-xl border p-3 text-left transition-all duration-200',
                    selected
                      ? 'border-[var(--color-accent)]/50 bg-white/80 ring-2 ring-[var(--color-accent)]/20 scale-[1.02]'
                      : 'border-white/50 bg-white/40 hover:bg-white/65',
                    !ev && isLive && 'glass-live-pulse',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <ChallengerIcon className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                    {ev ? (
                      <VerdictBadge verdict={ev.verdict} />
                    ) : (
                      <span className="text-[9px] text-[var(--color-text-muted)]">…</span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-danger)]">
                    {(AGENT_LABELS[ch.challenger] || ch.challenger).split(' ')[0]}
                  </span>
                  <span className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">challenges you</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 shrink-0 border-t border-white/40 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Revised position
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--color-text)]">
              {String(
                activeRev.revised_analysis?.revised_hypothesis ||
                  activeRev.revised_analysis?.key_claim ||
                  '—',
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
