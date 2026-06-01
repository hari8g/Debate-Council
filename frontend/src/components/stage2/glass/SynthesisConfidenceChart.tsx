import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AgentConfidencePoint } from '../../../lib/debateUtils';
import { AGENT_LABELS } from '../../../types/report';
import { formatConfidence } from '../../../lib/utils';
import { chartGridStroke, chartTick, chartTooltipStyle, CHART_SERIES } from '../../../lib/chartTheme';

type ChartRow = {
  round: string;
  _avg: number;
  [agentId: string]: string | number;
};

function buildChartRows(evolution: AgentConfidencePoint[]): ChartRow[] {
  const specs = [
    { round: 'Round 1', pick: (e: AgentConfidencePoint) => e.round1 },
    { round: 'Round 2', pick: (e: AgentConfidencePoint) => e.round2 ?? e.round1 },
    { round: 'Round 3', pick: (e: AgentConfidencePoint) => e.round3 ?? e.round2 ?? e.round1 },
  ];
  return specs.map(({ round, pick }) => {
    const row: ChartRow = { round, _avg: 0 };
    const vals: number[] = [];
    for (const e of evolution) {
      const v = pick(e);
      row[e.agent] = v;
      vals.push(v);
    }
    row._avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return row;
  });
}

function SynthesisTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((p) => p.dataKey !== '_avg' && typeof p.value === 'number')
    .sort((a, b) => b.value - a.value);
  const avg = payload.find((p) => p.dataKey === '_avg')?.value;

  return (
    <div
      className="rounded-xl border border-[var(--color-border-subtle)] bg-white/95 px-3 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-md"
      style={{ ...chartTooltipStyle, background: undefined, border: undefined, boxShadow: undefined }}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[var(--color-text)]">
                {(AGENT_LABELS[p.dataKey] || p.dataKey).split(' ')[0]}
              </span>
            </span>
            <span className="tabular-nums font-medium text-[var(--color-accent)]">
              {formatConfidence(p.value)}
            </span>
          </div>
        ))}
      </div>
      {avg != null && (
        <p className="mt-2 border-t border-[var(--color-border-subtle)] pt-2 text-[10px] text-[var(--color-text-muted)]">
          Council mean · <span className="font-medium text-[var(--color-text)]">{formatConfidence(avg)}</span>
        </p>
      )}
    </div>
  );
}

export function SynthesisConfidenceChart({
  evolution,
  selectedAgent,
}: {
  evolution: AgentConfidencePoint[];
  selectedAgent: string | null;
}) {
  const chartData = useMemo(() => buildChartRows(evolution), [evolution]);

  const series = useMemo(
    () =>
      evolution.map((e, i) => ({
        id: e.agent,
        color: CHART_SERIES[i % CHART_SERIES.length],
      })),
    [evolution],
  );

  const yDomain = useMemo(() => {
    const vals = evolution.flatMap((e) => [e.round1, e.round2 ?? e.round1, e.round3 ?? e.round2 ?? e.round1]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 0.06;
    return [Math.max(0, min - pad), Math.min(1, max + pad)] as [number, number];
  }, [evolution]);

  if (evolution.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
        No confidence data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 16, right: 20, left: 4, bottom: 4 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`synth-line-${s.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={chartGridStroke} strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="round"
          tick={chartTick}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          domain={yDomain}
          tick={chartTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
          width={36}
        />
        <Tooltip content={<SynthesisTooltip />} cursor={{ stroke: 'var(--color-border)', strokeDasharray: '4 4' }} />
        <Line
          type="monotone"
          dataKey="_avg"
          stroke="var(--color-text-muted)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={{ r: 3, fill: 'var(--color-bg)', stroke: 'var(--color-text-muted)', strokeWidth: 1.5 }}
          activeDot={false}
          isAnimationActive
          animationDuration={600}
        />
        {series.map((s) => {
          const active = !selectedAgent || selectedAgent === s.id;
          return (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              stroke={`url(#synth-line-${s.id})`}
              strokeWidth={selectedAgent === s.id ? 3 : active ? 2 : 1.5}
              strokeOpacity={active ? 1 : 0.12}
              dot={{
                r: selectedAgent === s.id ? 5 : 3.5,
                fill: '#ffffff',
                stroke: s.color,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: s.color,
                stroke: '#fff',
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
