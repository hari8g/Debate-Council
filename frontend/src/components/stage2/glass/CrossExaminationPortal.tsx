import { useMemo } from 'react';
import type { Challenge } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { cn } from '../../../lib/utils';
import { DEBATE_AGENT_IDS } from './AgentOrbit';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

const TOTAL = 30;

const AGENT_ICON: Record<string, typeof Brain> = {
  psychographer: Brain,
  sociologist: Users,
  narrative_analyst: BookOpen,
  behavioural_economist: TrendingUp,
  temporal_analyst: Clock,
  cultural_analyst: Globe,
};

const AGENT_TINT: Record<string, string> = {
  psychographer: 'from-[var(--color-chart-2)]/70 to-[var(--color-chart-2)]/35',
  sociologist: 'from-[var(--color-chart-1)]/70 to-[var(--color-chart-1)]/35',
  narrative_analyst: 'from-[var(--color-chart-4)]/70 to-[var(--color-chart-4)]/35',
  behavioural_economist: 'from-[var(--color-chart-3)]/70 to-[var(--color-chart-3)]/35',
  temporal_analyst: 'from-[var(--color-chart-5)]/60 to-[var(--color-chart-5)]/30',
  cultural_analyst: 'from-[var(--color-chart-6)]/80 to-[var(--color-chart-6)]/40',
};

function shortLabel(id: string): string {
  const full = AGENT_LABELS[id] || id;
  return full.split(' ')[0];
}

export function CrossExaminationPortal({
  challenges,
  isLive,
  selectedPair,
  onSelectPair,
}: {
  challenges: Challenge[];
  isLive?: boolean;
  selectedPair?: { challenger: string; target: string } | null;
  onSelectPair?: (challenger: string, target: string) => void;
}) {
  const latest = challenges[challenges.length - 1];
  const matrix = useMemo(() => {
    const map = new Map<string, Challenge>();
    for (const c of challenges) {
      map.set(`${c.challenger}|${c.target}`, c);
    }
    return map;
  }, [challenges]);

  const fillPct = Math.round((matrix.size / TOTAL) * 100);

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow-accent">Cross-examination portal</p>
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight">Agent challenge matrix</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Rows challenge columns · click a filled cell to inspect
          </p>
        </div>
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
                strokeDasharray={`${fillPct} ${100 - fillPct}`}
                pathLength={100}
              />
            </svg>
            <span className="text-sm font-semibold tabular-nums text-[var(--color-accent)]">{fillPct}%</span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums leading-none text-[var(--color-text)]">
              {matrix.size}
              <span className="text-base font-normal text-[var(--color-text-muted)]">/{TOTAL}</span>
            </p>
            {isLive && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
                ● Live
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-br from-white/50 via-white/35 to-white/20 p-3 shadow-inner sm:p-4">
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="mx-auto w-full max-w-2xl border-separate border-spacing-1 sm:border-spacing-1.5">
            <thead>
              <tr>
                <th className="w-20 p-1" />
                {DEBATE_AGENT_IDS.map((id) => {
                  const Icon = AGENT_ICON[id] ?? Brain;
                  return (
                    <th key={id} className="p-1 text-center">
                      <div className="mx-auto flex max-w-[4.5rem] flex-col items-center gap-0.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-[var(--color-accent)] shadow-sm">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[9px] font-medium leading-tight text-[var(--color-text-muted)]">
                          {shortLabel(id)}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {DEBATE_AGENT_IDS.map((row) => {
                const RowIcon = AGENT_ICON[row] ?? Brain;
                return (
                  <tr key={row}>
                    <td className="p-1">
                      <div className="flex items-center gap-1.5 pr-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-[var(--color-text-muted)]">
                          <RowIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="hidden text-[10px] font-medium text-[var(--color-text-muted)] sm:inline">
                          {shortLabel(row)}
                        </span>
                      </div>
                    </td>
                    {DEBATE_AGENT_IDS.map((col) => {
                      if (row === col) {
                        return (
                          <td key={col} className="p-0.5">
                            <div className="mx-auto h-9 w-9 rounded-xl bg-[var(--color-border)]/15 sm:h-10 sm:w-10" />
                          </td>
                        );
                      }
                      const key = `${row}|${col}`;
                      const filled = matrix.has(key);
                      const isLatest = latest?.challenger === row && latest?.target === col;
                      const isSelected =
                        selectedPair?.challenger === row && selectedPair?.target === col;

                      return (
                        <td key={col} className="p-0.5">
                          <button
                            type="button"
                            disabled={!filled}
                            onClick={() => filled && onSelectPair?.(row, col)}
                            title={
                              filled
                                ? `${AGENT_LABELS[row]} challenges ${AGENT_LABELS[col]}`
                                : 'Not yet challenged'
                            }
                            className={cn(
                              'matrix-cell group relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 sm:h-10 sm:w-10',
                              !filled && 'bg-[var(--color-border)]/25 cursor-default',
                              filled &&
                                !isLatest &&
                                !isSelected &&
                                `bg-gradient-to-br ${AGENT_TINT[row] ?? 'from-[var(--color-accent)]/50 to-[var(--color-accent)]/25'} shadow-sm hover:scale-105 hover:shadow-md`,
                              isSelected && 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-white/50 scale-105',
                              isLatest &&
                                'matrix-cell-latest bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-chart-2)] shadow-lg shadow-[var(--color-accent)]/25',
                            )}
                          >
                            {filled && (
                              <span
                                className={cn(
                                  'text-[10px] font-bold',
                                  isLatest ? 'text-white' : 'text-white/90 opacity-0 group-hover:opacity-100 sm:opacity-90',
                                )}
                              >
                                ✓
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-white/40 pt-3 text-[10px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-[var(--color-border)]/35" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-gradient-to-br from-[var(--color-chart-1)]/60 to-[var(--color-chart-1)]/30" />{' '}
            Complete
          </span>
          <span className="flex items-center gap-1.5">
            <span className="matrix-cell-latest h-3 w-3 rounded-md" /> Latest
          </span>
        </div>
      </div>
    </div>
  );
}
