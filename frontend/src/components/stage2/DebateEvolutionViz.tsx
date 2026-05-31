import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import { chartTick, chartTickSm, chartTooltipStyle, CHART_SERIES, ROUND_CHART_COLORS } from '../../lib/chartTheme';
import type { AgentHypothesis, Challenge, PersonaModel, RevisedHypothesis } from '../../types/report';
import { buildConfidenceEvolution, synthesisClaimCards } from '../../lib/debateUtils';
import { formatConfidence } from '../../lib/utils';
import { AnimatedChallengeNetwork } from './AnimatedChallengeNetwork';

type ActiveRound = 'round1' | 'round2' | 'round3';

const ROUND_COLORS = ROUND_CHART_COLORS;
const AGENT_COLORS = [...CHART_SERIES];

export function DebateEvolutionViz({
  hypotheses,
  challenges,
  revised,
  persona,
  activeRound,
  selectedAgent,
  onSelectAgent,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised: RevisedHypothesis[];
  persona?: PersonaModel;
  activeRound: ActiveRound;
  selectedAgent: string | null;
  onSelectAgent: (agent: string | null) => void;
}) {
  const evolution = useMemo(
    () => buildConfidenceEvolution(hypotheses, revised, persona),
    [hypotheses, revised, persona],
  );

  const lineData = useMemo(() => {
    const rows: Record<string, string | number>[] = [
      { round: 'Round 1', ...Object.fromEntries(evolution.map((e) => [e.agent, e.round1])) },
      {
        round: 'Round 2',
        ...Object.fromEntries(evolution.map((e) => [e.agent, e.round2 ?? e.round1])),
      },
    ];
    if (persona) {
      rows.push({
        round: 'Round 3',
        ...Object.fromEntries(
          evolution.map((e) => [e.agent, e.round3 ?? e.round2 ?? e.round1]),
        ),
      });
    }
    return rows;
  }, [evolution, persona]);

  const claimData = useMemo(() => {
    if (!persona) return [];
    return synthesisClaimCards(persona)
      .slice(0, 10)
      .map((c) => ({ name: c.section.slice(0, 12), confidence: c.confidence }));
  }, [persona]);

  const round2Edges = useMemo(
    () => revised.flatMap((r) => r.challenges_received || []),
    [revised],
  );

  const activeRoundIndex = activeRound === 'round1' ? 0 : activeRound === 'round2' ? 1 : 2;

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div>
        <h4 className="text-sm font-medium">Debate evolution — confidence & flow</h4>
        <p className="text-xs text-[var(--color-text-muted)]">
          Three-point trajectory (R1 → R2 → R3 synthesis). Network animates as you switch rounds — click nodes to filter.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-[var(--color-text-muted)]">
            Confidence trajectory
            {persona && (
              <span className="ml-1 text-[var(--color-accent)]">· Round 3 = avg claim confidence in agent&apos;s persona sections</span>
            )}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="round" tick={chartTick} />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
                tick={chartTick}
              />
              <Tooltip formatter={(v) => formatConfidence(Number(v))} contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {lineData[activeRoundIndex] && (
                <ReferenceLine
                  x={lineData[activeRoundIndex].round as string}
                  stroke={ROUND_COLORS[activeRound]}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
              )}
              {evolution.map((e, i) => (
                <Line
                  key={e.agent}
                  type="monotone"
                  dataKey={e.agent}
                  name={e.label}
                  stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                  strokeWidth={selectedAgent === e.agent ? 3 : 1.5}
                  strokeOpacity={selectedAgent && selectedAgent !== e.agent ? 0.25 : 1}
                  dot={(props) => {
                    const { cx, cy, index } = props;
                    if (cx == null || cy == null) return null;
                    const isActiveRound = index === activeRoundIndex;
                    const isSelected = selectedAgent === e.agent;
                    const r = isActiveRound && isSelected ? 6 : isActiveRound ? 5 : isSelected ? 4 : 3;
                    return (
                      <circle
                        key={index}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                        stroke={isActiveRound ? 'var(--color-bg-elevated)' : 'none'}
                        strokeWidth={isActiveRound ? 1 : 0}
                        className={isActiveRound ? 'debate-dot-pulse' : undefined}
                      />
                    );
                  }}
                  connectNulls
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <AnimatedChallengeNetwork
          round1Edges={challenges}
          round2Edges={round2Edges}
          activeRound={activeRound}
          evolution={evolution}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          hasSynthesis={Boolean(persona)}
        />
      </div>

      {activeRound === 'round3' && claimData.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-[var(--color-text-muted)]">Synthesis claim confidence by section</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={claimData} layout="vertical" margin={{ left: 70 }}>
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
                tick={chartTickSm}
              />
              <YAxis type="category" dataKey="name" tick={chartTickSm} width={65} />
              <Tooltip formatter={(v) => formatConfidence(Number(v))} contentStyle={chartTooltipStyle} />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]} animationDuration={700}>
                {claimData.map((_, i) => (
                  <Cell key={i} fill={ROUND_COLORS.round3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
