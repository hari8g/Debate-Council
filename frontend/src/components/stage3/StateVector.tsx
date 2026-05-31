import type { BehavioralStateModel, PsychologicalState } from '../../types/report';
import { STATE_LABELS } from '../../types/report';

function toValues(s: PsychologicalState): number[] {
  return [s.valence, s.arousal, s.stability, s.connectivity, s.engagement, s.ideological];
}

export function StateVector({
  state,
  behavioralState,
  title = 'Current Psychological State Vector',
}: {
  state: PsychologicalState;
  behavioralState?: BehavioralStateModel;
  title?: string;
}) {
  const display = behavioralState?.fused_state ?? state;
  const values = toValues(display);
  const measuredVals = behavioralState ? toValues(behavioralState.measured_state) : null;
  const inferredVals = behavioralState ? toValues(behavioralState.inferred_state) : null;

  return (
    <div>
      <h3 className="mb-2 text-xl">{title}</h3>
      {behavioralState && (
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Simulation anchor: {Math.round(behavioralState.fusion_weight_measured * 100)}% measured posts +{' '}
          {Math.round((1 - behavioralState.fusion_weight_measured) * 100)}% LLM persona synthesis.
        </p>
      )}
      {behavioralState?.behavioral_profile && (
        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 text-xs">
          <span className="font-medium text-[var(--color-text)]">Behavioral profile: </span>
          <span className="text-[var(--color-text-muted)]">{behavioralState.behavioral_profile.summary}</span>
        </div>
      )}
      <div className="space-y-3">
        {STATE_LABELS.map((label, i) => {
          const v = values[i];
          const normalized = label === 'Valence' ? (v + 1) / 2 : v;
          return (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{label}</span>
                <span className="text-[var(--color-accent)]">{v.toFixed(2)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, normalized * 100))}%` }}
                />
              </div>
              {measuredVals && inferredVals && (
                <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                  measured {measuredVals[i].toFixed(2)} · LLM {inferredVals[i].toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
