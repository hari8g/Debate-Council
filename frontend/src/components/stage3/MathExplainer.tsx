import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function MathExplainer({
  title,
  formula,
  steps,
  defaultOpen = true,
}: {
  title: string;
  formula?: string;
  steps: { label: string; detail: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-[var(--color-border)] px-4 py-3">
          {formula && (
            <p className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2 font-mono text-xs text-[var(--color-text-muted)]">
              {formula}
            </p>
          )}
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 text-xs font-medium text-[var(--color-accent)]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-[var(--color-text-muted)]">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export const STAGE3_MATH = {
  state: {
    title: 'How the 6D state vector is estimated',
    formula: 'x(t) = [valence, arousal, stability, connectivity, engagement, ideological]',
    steps: [
      { label: 'Per-post measurement', detail: 'Each caption yields valence/arousal via lexicon; rolling windows compute stability, connectivity, and engagement vs personal baseline.' },
      { label: 'Calendar time', detail: 'Posts are spaced by actual days between timestamps — not assumed one-post-per-day.' },
      { label: 'Fusion anchor', detail: 'Last measured state is blended with the LLM persona state (weight adapts to post count and OU fit) for simulation start point.' },
    ],
  },
  ou: {
    title: 'Ornstein–Uhlenbeck parameter fitting',
    formula: 'dx = −α(x − x*) dt + B·u dt + σ dW',
    steps: [
      { label: 'Diagonal AR(1)', detail: 'Each dimension fit with variable-interval autoregression → mean reversion rates α and baseline x*.' },
      { label: 'Coupling upgrade', detail: 'When enough posts exist, block or full 6×6 coupling captures valence↔arousal and stability↔engagement links.' },
      { label: 'External inputs B·u', detail: 'Engagement slope, topic drift, burst intensity, and emotional volatility push the system away from baseline.' },
    ],
  },
  portrait: {
    title: 'Phase portrait computation',
    formula: 'ẋ = −α(x − x*)  (projected onto 2D slices)',
    steps: [
      { label: 'Vector field', detail: 'OU pull toward equilibrium drawn on valence×arousal, stability×engagement, and connectivity×ideological planes.' },
      { label: 'Historical trace', detail: 'Actual post states overlaid to show where this profile has lived in phase space.' },
      { label: 'Half-lives', detail: 'Per-dimension recovery times derived from α — how fast each dimension reverts after a shock.' },
    ],
  },
  monte: {
    title: 'Monte Carlo simulation — why 10,000 paths?',
    formula: 'Each path: perturbed OU + SIR strains + daily diffusion over 365d',
    steps: [
      { label: 'Why simulate?', detail: 'A single forecast hides uncertainty. We run 10,000+ independent futures so medians, p10/p90 bands, and scenario probabilities reflect how wide the plausible range really is.' },
      { label: 'Entropy injection', detail: 'Every path perturbs α, σ, B·u inputs, initial state, baseline x*, and strain β/γ via lognormal/Gaussian noise — plus random engagement shocks (~2.5% of days).' },
      { label: 'What you see', detail: 'Fan charts = valence percentiles across all paths. Horizon bars = median ± spread at T+30/90/180/365. Scenarios = cluster of terminal outcomes.' },
    ],
  },
  strains: {
    title: 'Narrative theme discovery',
    formula: 'momentum = mean(recent) / mean(early); optional SIR fit for R₀',
    steps: [
      { label: 'Theme clustering', detail: 'Hashtag co-occurrence and caption keywords surface adaptive themes — not fixed templates.' },
      { label: 'Activation series', detail: 'Per-post keyword density × engagement weights an activation score in [0, 1].' },
      { label: 'Forward projection', detail: 'Themes with momentum expand or contract in Monte Carlo via SIR compartments.' },
    ],
  },
};
