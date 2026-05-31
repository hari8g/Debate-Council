import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { chartPolarGrid, chartTooltipStyle, ROUND_CHART_COLORS } from '../../lib/chartTheme';
import type { AgentConfidencePoint } from '../../lib/debateUtils';
import { formatConfidence } from '../../lib/utils';
import { cn } from '../../lib/utils';

const ROUND_STYLES = {
  round1: { stroke: ROUND_CHART_COLORS.round1, fill: 'color-mix(in srgb, var(--color-chart-1) 28%, transparent)', label: 'Round 1' },
  round2: { stroke: ROUND_CHART_COLORS.round2, fill: 'color-mix(in srgb, var(--color-chart-2) 28%, transparent)', label: 'Round 2' },
  round3: { stroke: ROUND_CHART_COLORS.round3, fill: 'color-mix(in srgb, var(--color-chart-6) 28%, transparent)', label: 'Round 3' },
};

type RoundKey = keyof typeof ROUND_STYLES;

export function DebateConfidenceSpider({
  evolution,
  rounds,
  selectedAgent,
  title,
  subtitle,
}: {
  evolution: AgentConfidencePoint[];
  rounds: RoundKey[];
  selectedAgent?: string | null;
  title?: string;
  subtitle?: string;
}) {
  const data = evolution.map((e) => ({
    agent: e.label.split(' ').slice(0, 2).join(' '),
    agentId: e.agent,
    round1: e.round1,
    round2: e.round2 ?? e.round1,
    round3: e.round3 ?? e.round2 ?? e.round1,
  }));

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium">{title ?? 'Agent confidence spider'}</h4>
        {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke={chartPolarGrid} />
          <PolarAngleAxis
            dataKey="agent"
            tick={(props) => {
              const { x, y, payload } = props;
              const row = data.find((d) => d.agent === payload.value);
              const active = selectedAgent && row?.agentId === selectedAgent;
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fill={active ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                  fontSize={10}
                  fontWeight={active ? 600 : 400}
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <Tooltip
            formatter={(v) => formatConfidence(Number(v))}
            contentStyle={chartTooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {rounds.map((r) => (
            <Radar
              key={r}
              name={ROUND_STYLES[r].label}
              dataKey={r}
              stroke={ROUND_STYLES[r].stroke}
              fill={ROUND_STYLES[r].fill}
              strokeWidth={2}
              animationDuration={800}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>

      <ConfidenceDeltaStrip evolution={evolution} rounds={rounds} selectedAgent={selectedAgent} />
    </div>
  );
}

function ConfidenceDeltaStrip({
  evolution,
  rounds,
  selectedAgent,
}: {
  evolution: AgentConfidencePoint[];
  rounds: RoundKey[];
  selectedAgent?: string | null;
}) {
  if (rounds.length < 2) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {evolution
        .filter((e) => !selectedAgent || e.agent === selectedAgent)
        .map((e) => {
          const r1 = e.round1;
          const r2 = e.round2 ?? r1;
          const r3 = e.round3 ?? r2;
          const end = rounds.includes('round3') ? r3 : rounds.includes('round2') ? r2 : r1;
          const delta = end - r1;
          return (
            <div
              key={e.agent}
              className={cn(
                'rounded-md bg-[var(--color-bg-muted)] px-3 py-2 text-xs',
                selectedAgent === e.agent && 'ring-1 ring-[var(--color-accent)]/40',
              )}
            >
              <span className="font-medium">{e.label.split(' ')[0]}</span>
              <span className="ml-2 text-[var(--color-text-muted)]">
                {formatConfidence(r1)} → {formatConfidence(end)}
              </span>
              <span
                className={cn(
                  'ml-1 font-medium',
                  delta > 0.02 && 'text-[var(--color-success)]',
                  delta < -0.02 && 'text-[var(--color-danger)]',
                  Math.abs(delta) <= 0.02 && 'text-[var(--color-text-muted)]',
                )}
              >
                ({delta >= 0 ? '+' : ''}{(delta * 100).toFixed(0)}%)
              </span>
            </div>
          );
        })}
    </div>
  );
}
