import { useMemo, useState } from 'react';
import type { FutureStateDistribution, FutureStateNarrative } from '../../types/report';
import { formatConfidence, formatPercent } from '../../lib/utils';
import { MetricHelp } from '../shared/MetricHelp';
import { Target, Compass, Instagram, Brain, ChevronDown, ChevronRight } from 'lucide-react';

const SECTIONS = [
  { key: 'next_30_days' as const, title: 'The Next 30 Days', subtitle: 'Highest confidence — grounded in recent posting rhythm', confidence: 'high' },
  { key: 'next_90_days' as const, title: 'The Next 90 Days', subtitle: 'Medium confidence — trend continuation with strain dynamics', confidence: 'medium' },
  { key: 'six_month_horizon' as const, title: '6-Month Horizon', subtitle: 'Scenario-weighted — multiple futures remain plausible', confidence: 'lower' },
  { key: 'long_horizon' as const, title: 'Long Horizon (T+365+)', subtitle: 'Extrapolation only — treat as directional', confidence: 'low' },
  { key: 'epistemic_limits' as const, title: 'Epistemic Limits', subtitle: 'What cannot be determined from public data', confidence: 'n/a' },
];

export function FutureNarrative({
  narrative,
  futureState,
}: {
  narrative: FutureStateNarrative;
  futureState?: FutureStateDistribution;
}) {
  const [openSection, setOpenSection] = useState<string | null>('next_30_days');
  const [showReasoning, setShowReasoning] = useState(true);
  const goals = narrative.goals_outlook;

  const horizonConf = useMemo(() => {
    const pq = futureState?.projection_quality;
    if (!pq?.horizon_confidence) return {};
    return pq.horizon_confidence;
  }, [futureState]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5">
        <p className="section-eyebrow-accent">Future narrative + strategic outlook</p>
        <h3 className="mt-1 text-xl">Where this profile is likely headed</h3>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Two reasoning layers: temporal narrative (grounded in Monte Carlo medians) and a strategic agent
          inferring focus areas and likely goals from persona + simulation + strains.
        </p>
        {futureState?.simulation_audit && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Based on {futureState.simulation_audit.n_simulations?.toLocaleString()} Monte Carlo paths · OU R²{' '}
            {futureState.simulation_audit.ou_r_squared?.toFixed(3) ?? '—'}
          </p>
        )}
      </div>

      {narrative.profile_context && (
        <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
          <h4 className="text-sm font-medium text-[var(--color-accent)]">Profile context</h4>
          <p className="mt-2 text-sm leading-relaxed">{narrative.profile_context}</p>
        </div>
      )}

      {goals && (
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[var(--color-accent)]" />
            <h4 className="text-lg font-medium">Strategic future orientation</h4>
          </div>

          {goals.strategic_summary && (
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{goals.strategic_summary}</p>
          )}

          {goals.instagram_trajectory && (
            <div className="rounded-lg bg-[var(--color-bg-muted)] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Instagram className="h-4 w-4 text-[var(--color-accent)]" />
                Instagram trajectory
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{goals.instagram_trajectory}</p>
            </div>
          )}

          {goals.focus_areas?.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Compass className="h-4 w-4" />
                Focus areas
                <MetricHelp title="Focus area confidence">
                  How strongly the strategic agent believes this focus is emerging from observed signals (0–100%).
                </MetricHelp>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {goals.focus_areas.map((fa, i) => (
                  <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm">{fa.area}</span>
                      {fa.confidence != null && (
                        <span className="text-xs text-[var(--color-accent)]">{formatConfidence(fa.confidence)}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{fa.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goals.likely_goals?.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4" />
                Likely goals
              </div>
              <div className="space-y-2">
                {goals.likely_goals.map((g, i) => (
                  <details key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)]">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                      {g.goal}
                      {g.timeframe && (
                        <span className="ml-2 rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] text-[var(--color-accent)]">
                          {g.timeframe}
                        </span>
                      )}
                    </summary>
                    <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      {g.reasoning}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {goals.reasoning_trace && (
            <div>
              <button
                type="button"
                onClick={() => setShowReasoning((v) => !v)}
                className="flex items-center gap-1 text-sm text-[var(--color-accent)]"
              >
                {showReasoning ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Agent reasoning trace
              </button>
              {showReasoning && (
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--color-bg-muted)] p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {goals.reasoning_trace}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {narrative.strain_outlook && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="text-sm font-medium">Belief strain outlook</h4>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{narrative.strain_outlook}</p>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Time-horizon narrative</h4>
        {SECTIONS.filter(({ key }) => key !== 'long_horizon' || narrative.long_horizon).map(({ key, title, subtitle }) => {
          const confKey = key === 'next_30_days' ? '30' : key === 'next_90_days' ? '90' : key === 'six_month_horizon' ? '180' : null;
          const conf = confKey ? horizonConf[confKey] : undefined;
          const isOpen = openSection === key;
          return (
            <div key={key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : key)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {conf != null && (
                    <span className="text-xs text-[var(--color-accent)]" title="Monte Carlo projection confidence at this horizon">
                      {formatPercent(conf)} conf.
                    </span>
                  )}
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>
              {isOpen && narrative[key] && (
                <p className="border-t border-[var(--color-border)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {narrative[key]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
