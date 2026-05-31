import type { DerivedSignals, FutureStateDistribution, FutureStateNarrative, OuParameters, PersonaModel } from '../../types/report';
import { formatPercent } from '../../lib/utils';

const PHASES = [
  {
    id: 's3_state',
    title: 'State vector estimation',
    explain: 'Each post is mapped to a 6-dimensional psychological state: valence, arousal, stability, connectivity, engagement, ideological — from caption emotion and engagement.',
  },
  {
    id: 's3_ou',
    title: 'OU parameter fitting',
    explain: 'An Ornstein-Uhlenbeck model learns how this person reverts to their baseline over time. R² tells you how well the model fits their actual post history.',
  },
  {
    id: 's3_portrait',
    title: 'Phase portrait',
    explain: 'Visualises valence × arousal dynamics — where their emotional state is pulled toward equilibrium and how historical posts trace through that landscape.',
  },
  {
    id: 's3_strains',
    title: 'Narrative theme tracker',
    explain: 'Themes are mined from THIS profile\'s hashtags and captions. Momentum (recent vs early posts) is the primary signal; R₀ is an optional dynamics model when the fit is good.',
  },
  {
    id: 's3_monte',
    title: 'Monte Carlo simulation',
    explain: 'Thousands of stochastic paths project the 6D state forward to T+30/90/180 days, perturbing OU parameters each run. Scenarios are derived from simulated outcomes.',
  },
  {
    id: 's3_narrative',
    title: 'Future narrative',
    explain: 'LLM synthesis grounded in this profile\'s posts, strains, Monte Carlo medians, and persona model — not generic templates.',
  },
];

export function ProjectionPhasePanel({
  ouParams,
  persona,
  derived,
  future,
  narrative,
  postsAnalysed,
  highlightPhase,
}: {
  ouParams?: OuParameters;
  persona?: PersonaModel;
  derived?: DerivedSignals;
  future?: FutureStateDistribution;
  narrative?: FutureStateNarrative;
  postsAnalysed?: number;
  highlightPhase?: string;
}) {
  const phases = highlightPhase ? PHASES.filter((p) => p.id === highlightPhase) : PHASES;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h3 className="mb-1 text-lg">
        {highlightPhase ? 'Pipeline context' : 'Stage 3 — What each phase does'}
      </h3>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Future projection for this profile ({postsAnalysed ?? '?'} posts). Numbers below are from your actual run.
      </p>
      <div className="space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`rounded-md p-3 ${
              highlightPhase === phase.id
                ? 'bg-[var(--color-accent)]/8 ring-1 ring-[var(--color-accent)]/25'
                : 'bg-[var(--color-bg-elevated)]'
            }`}
          >
            <h4 className="text-sm font-medium">{phase.title}</h4>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{phase.explain}</p>
            <PhaseMetrics
              id={phase.id}
              ouParams={ouParams}
              persona={persona}
              derived={derived}
              future={future}
              narrative={narrative}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseMetrics({
  id,
  ouParams,
  persona,
  derived,
  future,
  narrative,
}: {
  id: string;
  ouParams?: OuParameters;
  persona?: PersonaModel;
  derived?: DerivedSignals;
  future?: FutureStateDistribution;
  narrative?: FutureStateNarrative;
}) {
  if (id === 's3_state' && persona) {
    const s = persona.current_state;
    return (
      <p className="mt-2 text-xs text-[var(--color-accent)]">
        Current: valence {s.valence.toFixed(2)}, arousal {s.arousal.toFixed(2)}, stability {s.stability.toFixed(2)}
      </p>
    );
  }
  if (id === 's3_ou' && ouParams) {
    return (
      <p className="mt-2 text-xs text-[var(--color-accent)]">
        R² = {ouParams.r_squared.toFixed(3)} · {ouParams.fit_method} · {ouParams.n_observations} state points
      </p>
    );
  }
  if (id === 's3_strains' && derived) {
    return (
      <p className="mt-2 text-xs text-[var(--color-accent)]">
        Topic drift {derived.topic_drift_score.toFixed(2)} · engagement slope {derived.engagement_slope.toFixed(4)}
      </p>
    );
  }
  if (id === 's3_monte' && future) {
    const audit = future.simulation_audit;
    const h30 = future.horizons['30'];
    return (
      <p className="mt-2 text-xs text-[var(--color-accent)]">
        {audit?.n_simulations.toLocaleString()} sims · confidence {formatPercent(future.projection_confidence)}
        {h30 && ` · T+30 valence median ${h30.median[0]?.toFixed(2)}`}
      </p>
    );
  }
  if (id === 's3_narrative' && narrative?.profile_context) {
    return <p className="mt-2 text-xs text-[var(--color-accent)]">{narrative.profile_context.slice(0, 160)}…</p>;
  }
  return null;
}
