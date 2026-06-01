import { useMemo } from 'react';
import type { AgentConfidencePoint } from '../../../lib/debateUtils';
import { AGENT_LABELS } from '../../../types/report';
import { cn, formatConfidence } from '../../../lib/utils';
import { CHART_SERIES } from '../../../lib/chartTheme';
import { DEBATE_AGENT_IDS } from './AgentOrbit';
import { SynthesisConfidenceChart } from './SynthesisConfidenceChart';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

const AGENT_ICON: Record<string, typeof Brain> = {
  psychographer: Brain,
  sociologist: Users,
  narrative_analyst: BookOpen,
  behavioural_economist: TrendingUp,
  temporal_analyst: Clock,
  cultural_analyst: Globe,
};

/** Always six council agents, merging streamed evolution data when present */
function normalizeEvolution(evolution: AgentConfidencePoint[]): AgentConfidencePoint[] {
  const byAgent = new Map(evolution.map((e) => [e.agent, e]));
  return DEBATE_AGENT_IDS.map((id) => {
    const existing = byAgent.get(id);
    if (existing) return existing;
    return {
      agent: id,
      label: AGENT_LABELS[id] || id,
      round1: 0.5,
      round2: null,
      round3: null,
      synthesisClaims: [],
    };
  });
}

export function SynthesisPortal({
  evolution,
  selectedAgent,
  onSelectAgent,
}: {
  evolution: AgentConfidencePoint[];
  selectedAgent: string | null;
  onSelectAgent: (id: string | null) => void;
}) {
  const council = useMemo(() => normalizeEvolution(evolution), [evolution]);

  const seriesMeta = useMemo(
    () =>
      council.map((e, i) => {
        const r1 = e.round1;
        const r3 = e.round3 ?? e.round2 ?? r1;
        return {
          id: e.agent,
          short: (AGENT_LABELS[e.agent] || e.label).split(' ')[0],
          color: CHART_SERIES[i % CHART_SERIES.length],
          r1,
          r3,
          delta: r3 - r1,
        };
      }),
    [council],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-4 pb-2 pt-1 sm:px-5">
        <p className="section-eyebrow-accent">Synthesis portal</p>
        <h3 className="mt-0.5 text-lg font-semibold tracking-tight">Confidence evolution</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Dashed line = council mean · scroll the roster to reach all six agents
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-br from-white/55 via-white/40 to-white/25 shadow-inner mx-3 mb-3 sm:mx-4 sm:mb-4">
        <div className="shrink-0 border-b border-white/40 px-3 pt-3 sm:px-4">
          <div className="h-[min(180px,22vh)] w-full min-h-[150px] sm:h-[190px]">
            <SynthesisConfidenceChart evolution={council} selectedAgent={selectedAgent} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-[9px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-[var(--color-text-muted)]" />
              Council mean
            </span>
            <span>Tap an agent to highlight</span>
          </div>
        </div>

        <div
          className="synthesis-portal-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain border-t border-white/35"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="px-3 py-3 sm:px-4">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                All agents ({seriesMeta.length})
              </p>
              <p className="text-[9px] text-[var(--color-text-muted)]">Scroll ↓</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {seriesMeta.map((s) => {
                const Icon = AGENT_ICON[s.id] ?? Brain;
                const selected = selectedAgent === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectAgent(selected ? null : s.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                      selected
                        ? 'border-[var(--color-accent)]/40 bg-white/85 shadow-sm ring-1 ring-[var(--color-accent)]/15'
                        : 'border-white/45 bg-white/35 hover:bg-white/60',
                    )}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80"
                      style={{ boxShadow: `inset 0 0 0 2px ${s.color}` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium">{s.short}</span>
                      <span className="mt-0.5 block text-[10px] tabular-nums text-[var(--color-text-muted)]">
                        {formatConfidence(s.r1)} → {formatConfidence(s.r3)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-semibold tabular-nums',
                        s.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]',
                      )}
                    >
                      {s.delta >= 0 ? '+' : ''}
                      {Math.round(s.delta * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 pb-1 text-center text-[10px] text-[var(--color-text-muted)]">
              End of roster · {DEBATE_AGENT_IDS.length} agents on council
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
