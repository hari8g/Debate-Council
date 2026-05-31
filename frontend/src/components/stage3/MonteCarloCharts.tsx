import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { chartTick, chartTickSm, chartTooltipStyle, chartGridStroke, CHART_SERIES } from '../../lib/chartTheme';
import type { FutureStateDistribution } from '../../types/report';
import { STATE_LABELS } from '../../types/report';
import { formatPercent } from '../../lib/utils';

const PATH_COLORS = CHART_SERIES.slice(0, 3);

export function MonteCarloCharts({ future }: { future: FutureStateDistribution }) {
  const audit = future.simulation_audit;
  const horizons = useMemo(
    () => Object.keys(future.horizons).sort((a, b) => Number(a) - Number(b)),
    [future.horizons],
  );
  const pathChartData = buildPathChartData(audit?.sample_valence_paths ?? []);
  const fanData = future.fan_chart ?? [];
  const pq = future.projection_quality;

  return (
    <div>
      <h3 className="mb-2 text-xl">Monte Carlo Projections</h3>

      <div className="mb-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/50 p-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text)]">What is happening here?</p>
        <p className="mt-2">
          The pipeline runs <strong className="text-[var(--color-text)]">{audit?.n_simulations?.toLocaleString() ?? '10,000+'}</strong> independent
          stochastic simulations. Each path starts from the fused psychological state, applies a slightly different
          Ornstein–Uhlenbeck model (perturbed reversion rates, noise, and external inputs), and co-evolves narrative
          strain activations day-by-day for up to {audit?.calendar_integrated_days ?? 365} calendar days.
        </p>
        <p className="mt-2">
          <strong className="text-[var(--color-text)]">Why:</strong> one extrapolated line would falsely imply certainty.
          The ensemble produces median forecasts, uncertainty bands (p10/p90), and scenario probabilities that honestly
          reflect parameter and behavioural variability.
        </p>
      </div>

      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Overall projection confidence: {formatPercent(future.projection_confidence)}
        {audit?.paths_integrated != null && (
          <span className="ml-2">· {audit.paths_integrated.toLocaleString()} paths integrated</span>
        )}
        {audit?.total_timestep_updates != null && (
          <span className="ml-2">· {audit.total_timestep_updates.toLocaleString()} daily state updates</span>
        )}
        {pq && pq.state_agreement < 0.5 && (
          <span className="ml-2 text-[var(--color-warning)]">(measured vs LLM state diverge)</span>
        )}
        {audit && !audit.convergence_ok && (
          <span className="ml-2 text-[var(--color-warning)]">(convergence check: moderate batch drift)</span>
        )}
      </p>

      {pq && pq.notes.length > 0 && (
        <ul className="mb-4 space-y-1 text-xs text-[var(--color-text-muted)]">
          {pq.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}

      {audit && (
        <div className="mb-6 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <h4 className="mb-2 text-sm font-medium text-[var(--color-accent)]">Simulation audit — verified execution</h4>
          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <AuditItem label="Paths run" value={audit.n_simulations.toLocaleString()} />
            <AuditItem label="Compute time" value={`${audit.elapsed_ms.toFixed(0)} ms`} />
            <AuditItem label="Daily integrations" value={audit.total_timestep_updates.toLocaleString()} />
            <AuditItem label="Random seed" value={String(audit.random_seed)} />
            <AuditItem label="Calendar days / path" value={String(audit.calendar_integrated_days ?? '—')} />
            <AuditItem label="Mean valence spread" value={(audit.mean_valence_spread ?? 0).toFixed(3)} />
            <AuditItem label="OU fit" value={`${audit.ou_fit_method} (n=${audit.ou_n_observations})`} />
            <AuditItem label="Convergence" value={audit.convergence_ok ? 'OK' : 'Check'} />
          </div>
          {audit.entropy_sources && audit.entropy_sources.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Entropy injected per path
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {audit.entropy_sources.map((s) => (
                  <li key={s} className="flex items-start gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[10px] text-[var(--color-text-muted)]">{audit.model}</p>
        </div>
      )}

      {fanData.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="mb-2 text-sm font-medium">Valence fan chart (ensemble percentiles)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={fanData}>
              <XAxis dataKey="day" tick={chartTick} label={{ value: 'days', position: 'insideBottom', offset: -2, fill: 'var(--color-chart-tick)', fontSize: 10 }} />
              <YAxis domain={[-1, 1]} tick={chartTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="p90" stroke="none" fill="var(--color-accent)" fillOpacity={0.12} />
              <Area type="monotone" dataKey="p10" stroke="none" fill="var(--color-bg-card)" fillOpacity={1} />
              <Line type="monotone" dataKey="p50" stroke="var(--color-chart-1)" dot={false} strokeWidth={2} name="Median" />
              <Line type="monotone" dataKey="p10" stroke="var(--color-chart-6)" strokeDasharray="4 4" dot={false} strokeWidth={1} name="P10" />
              <Line type="monotone" dataKey="p90" stroke="var(--color-chart-6)" strokeDasharray="4 4" dot={false} strokeWidth={1} name="P90" />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {pathChartData.length > 0 && (
        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="mb-2 text-sm font-medium">Sample simulation paths (valence)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pathChartData}>
              <XAxis dataKey="day" tick={chartTick} />
              <YAxis domain={[-1, 1]} tick={chartTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              {audit!.sample_valence_paths.map((p, i) => (
                <Line
                  key={p.sim_index}
                  type="monotone"
                  dataKey={`sim_${p.sim_index}`}
                  name={`Sim #${p.sim_index}`}
                  stroke={PATH_COLORS[i % PATH_COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {horizons.map((h) => {
          const dist = future.horizons[h];
          if (!dist) return null;
          const hConf = dist.confidence ?? pq?.horizon_confidence?.[h] ?? future.projection_confidence;
          const data = STATE_LABELS.map((label, i) => ({
            label: label.slice(0, 4),
            median: dist.median[i],
            p10: dist.p10[i],
            p90: dist.p90[i],
            err: [(dist.median[i] - dist.p10[i]) * 100, (dist.p90[i] - dist.median[i]) * 100],
          }));

          return (
            <div key={h} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">T+{h} days</h4>
                <span className="text-[10px] text-[var(--color-accent)]">{formatPercent(hConf)} conf.</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="label" tick={chartTickSm} />
                  <YAxis tick={chartTickSm} domain={[-1, 1]} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="median" fill="var(--color-chart-1)">
                    <ErrorBar dataKey="err" width={4} strokeWidth={1} stroke={chartGridStroke} direction="y" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                <Chip label="P(+ valence)" value={dist.p_positive_valence} />
                <Chip label="P(high arousal)" value={dist.p_high_arousal} />
                <Chip label="P(low stability)" value={dist.p_low_stability} />
                <Chip label="P(high ideological)" value={dist.p_high_ideological} />
                {dist.p_valence_cross_zero != null && (
                  <Chip label="P(valence flip)" value={dist.p_valence_cross_zero} />
                )}
                {dist.p_regime_persistence != null && (
                  <Chip label="P(same regime)" value={dist.p_regime_persistence} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {future.scenario_paths.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium">Scenarios (clustered from simulation outcomes)</h4>
          <div className="grid gap-4 md:grid-cols-3">
            {future.scenario_paths.map((path) => (
              <div key={path.name} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-medium">{path.name}</h4>
                  <span className="text-[var(--color-accent)]">{formatPercent(path.probability)}</span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{path.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildPathChartData(paths: { sim_index: number; valence_every_30d: number[] }[]) {
  if (paths.length === 0) return [];
  const maxLen = Math.max(...paths.map((p) => p.valence_every_30d.length));
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const row: Record<string, number> = { day: i * 30 };
    for (const p of paths) {
      if (i < p.valence_every_30d.length) {
        row[`sim_${p.sim_index}`] = p.valence_every_30d[i];
      }
    }
    rows.push(row);
  }
  return rows;
}

function AuditItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[var(--color-bg-elevated)] p-2">
      <div className="text-[10px] text-[var(--color-text-muted)]">{label}</div>
      <div className="font-medium text-[var(--color-text)]">{value}</div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded bg-[var(--color-bg-elevated)] px-2 py-0.5">
      {label}: {formatPercent(value)}
    </span>
  );
}
