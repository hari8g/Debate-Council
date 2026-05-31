import type { DerivedSignals, FutureStateDistribution, FutureStateNarrative, OuParameters, PersonaModel, PersonalR0Estimate, PhasePortrait } from '../../types/report';
import { explainSubstep } from '../../lib/substepExplain';
import { formatPercent } from '../../lib/utils';
import { MetricHelp } from '../shared/MetricHelp';
import { StateVector } from './StateVector';
import { PhasePortraitCanvas } from './PhasePortraitCanvas';
import { StrainCards } from './StrainCards';
import { MonteCarloCharts } from './MonteCarloCharts';
import { FutureNarrative } from './FutureNarrative';
import { ProjectionPhasePanel } from './ProjectionPhasePanel';
import { MathExplainer, STAGE3_MATH } from './MathExplainer';

const STATE_DIMS = [
  { name: 'Valence', desc: 'Positive vs negative emotional tone in captions' },
  { name: 'Arousal', desc: 'Energy and activation level of expression' },
  { name: 'Stability', desc: 'Cross-post caption and engagement consistency' },
  { name: 'Connectivity', desc: 'Hashtag diversity and posting cadence' },
  { name: 'Engagement', desc: 'Audience response vs personal baseline' },
  { name: 'Ideological', desc: 'Moral framing and conviction intensity in captions' },
];

export function Stage3SubstepView({
  substepId,
  personaModel,
  ouParams,
  phasePortrait,
  beliefStrains,
  futureState,
  futureNarrative,
  derivedSignals,
  postsAnalysed,
  payload,
}: {
  substepId: string;
  personaModel?: PersonaModel;
  ouParams?: OuParameters;
  phasePortrait?: PhasePortrait;
  beliefStrains: PersonalR0Estimate[];
  futureState?: FutureStateDistribution;
  futureNarrative?: FutureStateNarrative;
  derivedSignals?: DerivedSignals;
  postsAnalysed?: number;
  payload?: Record<string, unknown>;
}) {
  const meta = explainSubstep(substepId);

  return (
    <div className="space-y-5">
      <PhaseContextBanner substepId={substepId} meta={meta} />

      {substepId === 's3_state' && (
        <div className="space-y-4">
          <MathExplainer {...STAGE3_MATH.state} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="State dimensions" value={String(payload?.dimensions ?? 6)} />
            <Metric label="History points" value={String(payload?.points ?? '—')} />
            <Metric label="Calendar span" value={payload?.calendar_span_days != null ? `${Math.round(Number(payload.calendar_span_days))}d` : '—'} />
            <Metric
              label="Fusion (measured)"
              value={payload?.fusion_weight_measured != null ? `${Math.round(Number(payload.fusion_weight_measured) * 100)}%` : '—'}
              help="Share of the simulation anchor drawn from measured post states vs LLM persona state"
            />
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <h4 className="mb-2 text-sm font-medium">What each dimension means</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {STATE_DIMS.map((d) => (
                <div key={d.name} className="rounded bg-[var(--color-bg-muted)] px-3 py-2 text-xs">
                  <span className="font-medium">{d.name}</span>
                  <p className="mt-0.5 text-[var(--color-text-muted)]">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
          {personaModel && (
            <StateVector
              state={personaModel.current_state}
              behavioralState={futureState?.behavioral_state}
              title="Fused simulation state vector"
            />
          )}
        </div>
      )}

      {substepId === 's3_ou' && (
        <div className="space-y-4">
          <MathExplainer {...STAGE3_MATH.ou} />
          {ouParams ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="R² fit" value={ouParams.r_squared.toFixed(4)} help="How well post history follows the mean-reverting OU model (1 = perfect)" />
                <Metric label="Method" value={ouParams.fit_method ?? '—'} help="diagonal_ar1 → block → full 6×6 as post count allows" />
                <Metric label="Mean Δt" value={ouParams.mean_dt_days != null ? `${ouParams.mean_dt_days.toFixed(1)}d` : '—'} help="Average calendar days between consecutive posts" />
                <Metric label="Observations" value={String(ouParams.n_observations ?? '—')} help="Number of post-to-post transitions used in fit" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ouParams.x_star.map((v, i) => (
                  <div key={i} className="rounded-lg bg-[var(--color-bg-muted)] p-3 text-sm">
                    <span className="text-[10px] uppercase text-[var(--color-text-muted)]">
                      Baseline x* · {STATE_DIMS[i]?.name ?? `Dim ${i}`}
                    </span>
                    <div className="mt-1 font-medium text-[var(--color-accent)]">{v.toFixed(3)}</div>
                    {ouParams.half_lives_days?.[i] != null && (
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                        Half-life {ouParams.half_lives_days[i].toFixed(0)}d
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <WaitingNote text="OU parameters appear when the model finishes fitting to post history." />
          )}
        </div>
      )}

      {substepId === 's3_portrait' && (
        <div className="space-y-3">
          <MathExplainer {...STAGE3_MATH.portrait} />
          {phasePortrait ? (
            <PhasePortraitCanvas portrait={phasePortrait} />
          ) : (
            <WaitingNote text="Phase portrait renders after state vectors and OU fit are complete." />
          )}
        </div>
      )}

      {substepId === 's3_strains' && (
        <div className="space-y-3">
          <MathExplainer {...STAGE3_MATH.strains} />
          {beliefStrains.length > 0 ? (
            <StrainCards strains={beliefStrains} />
          ) : (
            <WaitingNote text="Narrative themes appear as each theme profile completes." />
          )}
        </div>
      )}

      {substepId === 's3_monte' && (
        <div className="space-y-3">
          <MathExplainer {...STAGE3_MATH.monte} />
          {futureState ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Simulations" value={String(futureState.simulation_audit?.n_simulations ?? '—')} help="Independent Monte Carlo paths actually executed (minimum 10,000) — each integrates OU + strain dynamics daily" />
                <Metric label="Runtime" value={futureState.simulation_audit?.elapsed_ms ? `${futureState.simulation_audit.elapsed_ms}ms` : '—'} />
                <Metric label="OU R²" value={futureState.simulation_audit?.ou_r_squared?.toFixed(3) ?? '—'} help="OU model fit quality fed into projection confidence" />
                <Metric
                  label="Quality"
                  value={futureState.projection_quality ? `${Math.round(futureState.projection_quality.overall * 100)}%` : formatPercent(futureState.projection_confidence)}
                  help="Overall projection reliability from data coverage, OU fit, strain stability, and measured/LLM agreement"
                />
              </div>
              <MonteCarloCharts future={futureState} />
            </>
          ) : (
            <WaitingNote text="Monte Carlo simulation runs after OU parameters and narrative themes are ready." />
          )}
        </div>
      )}

      {substepId === 's3_narrative' && (
        <div className="space-y-3">
          {futureNarrative ? (
            <FutureNarrative narrative={futureNarrative} futureState={futureState} />
          ) : (
            <WaitingNote text="Future narrative synthesises after Monte Carlo completes." />
          )}
        </div>
      )}

      <ProjectionPhasePanel
        ouParams={ouParams}
        persona={personaModel}
        derived={derivedSignals}
        future={futureState}
        narrative={futureNarrative}
        postsAnalysed={postsAnalysed}
        highlightPhase={substepId}
      />
    </div>
  );
}

function PhaseContextBanner({
  substepId,
  meta,
}: {
  substepId: string;
  meta: { title: string; did: string };
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/50 p-4">
      <p className="section-eyebrow-accent">Stage 3 · Future projection</p>
      <h2 className="mt-1 text-xl">{meta.title}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{meta.did}</p>
      {substepId === 's3_strains' && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Tip: themes with strong momentum and clear hashtag evidence are the most actionable signals.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, help }: { label: string; value: string; help?: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2">
      <div className="flex items-center text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
        {help && <MetricHelp title={label}>{help}</MetricHelp>}
      </div>
      <div className="mt-0.5 font-medium text-[var(--color-accent)]">{value}</div>
    </div>
  );
}

function WaitingNote({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-muted)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
      {text}
    </p>
  );
}
