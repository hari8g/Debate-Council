import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { chartTickSm, chartTooltipStyle } from '../../lib/chartTheme';
import type { PersonalR0Estimate } from '../../types/report';
import { TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export function StrainCards({ strains }: { strains: PersonalR0Estimate[] }) {
  const hasLegacyLabels = strains.some((s) =>
    ['institutional failure', 'political mobilisation', 'aspiration shift', 'celebration'].includes(
      (s.label || s.strain_type.replace(/_/g, ' ')).toLowerCase(),
    ),
  );

  const avgRelevance =
    strains.reduce((sum, s) => sum + (s.relevance_score ?? 0), 0) / Math.max(strains.length, 1);

  return (
    <div>
      <h3 className="mb-1 text-xl">Narrative Themes</h3>
      <p className="mb-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Recurring threads drawn from this profile&apos;s own hashtags and captions.
        Each card shows how often a theme appears — and whether it is gaining or losing presence over time.
      </p>

      {hasLegacyLabels && (
        <div className="mb-4 flex gap-2 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
          <p>
            These labels look like an <strong>older template run</strong> (institutional failure, political mobilisation, etc.).
            Re-run analysis to discover themes from this account&apos;s actual hashtags and captions.
          </p>
        </div>
      )}

      {strains.length > 0 && (
        <div className="mb-4 rounded-lg bg-[var(--color-bg-elevated)] p-3 text-xs text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text)]">How to read this:</strong>{' '}
          <span className="text-[var(--color-success)]">Growing</span> = theme appears more in recent posts;{' '}
          <span className="text-[var(--color-danger)]">Fading</span> = less frequent lately;{' '}
          <span>Steady</span> = consistent presence.
          Prevalence = share of posts touching this theme.
          {avgRelevance < 0.3 && (
            <span className="mt-1 block text-[var(--color-warning)]">
              Low overall signal — few posts or weak theme separation. Treat as exploratory.
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {strains.map((s) => (
          <StrainCard key={s.strain_type} strain={s} />
        ))}
      </div>

      {strains.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          No distinct themes found — profile may have too few posts or sparse captions/hashtags.
        </p>
      )}
    </div>
  );
}

function StrainCard({ strain: s }: { strain: PersonalR0Estimate }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const history = s.activation_history || [];
  const chartData = history.map((v, i) => ({ i: i + 1, activation: v }));
  const trend = s.trend_label || s.trajectory;
  const summary = s.plain_summary || s.interpretation;
  const confidence = s.metric_confidence || s.data_quality;

  const trendLabel =
    trend === 'growing' || s.trajectory === 'expanding'
      ? 'Growing'
      : trend === 'fading' || s.trajectory === 'contracting'
        ? 'Fading'
        : 'Steady';

  const trendColor =
    trendLabel === 'Growing'
      ? 'text-[var(--color-danger)]'
      : trendLabel === 'Fading'
        ? 'text-[var(--color-success)]'
        : 'text-[var(--color-text-muted)]';

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-medium">{s.label || s.strain_type.replace(/_/g, ' ')}</span>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className={`font-medium ${trendColor}`}>{trendLabel}</span>
            {s.momentum_ratio != null && s.momentum_ratio !== 1 && (
              <span className="text-[var(--color-text-muted)]">
                {s.momentum_ratio > 1 ? '↑' : '↓'} {s.momentum_ratio.toFixed(1)}× recent vs early
              </span>
            )}
            {s.prevalence_pct != null && (
              <span className="text-[var(--color-text-muted)]">{s.prevalence_pct}% of posts</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <TrajectoryIcon trend={trendLabel} />
          {confidence && (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] uppercase ${
                confidence === 'high'
                  ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                  : confidence === 'moderate'
                    ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}
            >
              {confidence} signal
            </span>
          )}
        </div>
      </div>

      {summary && (
        <p className="mb-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{summary}</p>
      )}

      {s.keywords && s.keywords.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {s.keywords.slice(0, 10).map((kw) => (
            <span key={kw} className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5 text-[10px]">
              {kw.startsWith('#') ? kw : `#${kw}`}
            </span>
          ))}
        </div>
      )}

      {chartData.length > 2 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">
            Theme presence over post timeline (older → newer)
          </p>
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={chartData}>
              <XAxis dataKey="i" tick={chartTickSm} tickFormatter={(v) => `#${v}`} />
              <YAxis domain={[0, 1]} hide />
              <Tooltip
                formatter={(v) => [`${(Number(v) * 100).toFixed(0)}%`, 'presence']}
                labelFormatter={(l) => `Post ${l}`}
                contentStyle={chartTooltipStyle}
              />
              {s.peak_post_index != null && s.peak_post_index >= 0 && (
                <ReferenceLine
                  x={s.peak_post_index + 1}
                  stroke="#0071e3"
                  strokeDasharray="2 2"
                  strokeOpacity={0.5}
                />
              )}
              <Line type="monotone" dataKey="activation" stroke="var(--color-chart-1)" dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {s.evidence_captions && s.evidence_captions.length > 0 && (
        <div className="mb-3 border-t border-[var(--color-border)] pt-2">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)]">Example posts</p>
          <ul className="mt-1 space-y-1.5 text-xs text-[var(--color-text-muted)]">
            {s.evidence_captions.map((c, i) => (
              <li key={i} className="border-l-2 border-[var(--color-accent)]/30 pl-2 leading-snug">
                {c || '(no caption)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showAdvanced ? 'Hide' : 'Show'} dynamics model (R₀, β, γ)
      </button>

      {showAdvanced && !s.sir_reliable && (
        <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
          SIR dynamics hidden — fit R² below threshold. Momentum and prevalence drive projections.
        </p>
      )}

      {(s.projected_activation_30d != null || s.projected_activation_90d != null) && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[var(--color-text-muted)]">
          {s.projected_activation_30d != null && <span>T+30 proj: {(s.projected_activation_30d * 100).toFixed(0)}%</span>}
          {s.projected_activation_90d != null && <span>T+90 proj: {(s.projected_activation_90d * 100).toFixed(0)}%</span>}
          {s.projected_activation_180d != null && <span>T+180 proj: {(s.projected_activation_180d * 100).toFixed(0)}%</span>}
        </div>
      )}

      {s.changepoint_indices && s.changepoint_indices.length > 0 && (
        <p className="mt-1 text-[10px] text-[var(--color-accent)]">
          Theme shift detected around post #{s.changepoint_indices[0] + 1}
        </p>
      )}

      {showAdvanced && s.sir_reliable && (
        <div className="mt-2 grid grid-cols-3 gap-2 rounded bg-[var(--color-bg-elevated)] p-2 text-center text-xs">
          <div>
            <div className="text-[var(--color-text-muted)]">β spread</div>
            <div>{s.beta.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">γ decay</div>
            <div>{s.gamma.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-muted)]">R₀</div>
            <div className={s.r0 > 1 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
              {s.r0.toFixed(2)}
            </div>
          </div>
          {s.sir_fit_r2 != null && (
            <p className="col-span-3 text-[10px] text-[var(--color-text-muted)]">
              SIR model fit R² = {s.sir_fit_r2.toFixed(2)}
              {(s.sir_fit_r2 ?? 0) < 0.15 && ' — poor fit; prefer momentum & prevalence above'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TrajectoryIcon({ trend }: { trend: string }) {
  if (trend === 'Growing') return <TrendingUp className="h-4 w-4 text-[var(--color-danger)]" />;
  if (trend === 'Fading') return <TrendingDown className="h-4 w-4 text-[var(--color-success)]" />;
  return <Minus className="h-4 w-4 text-[var(--color-text-muted)]" />;
}
