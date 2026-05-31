/** Shared Recharts styling — Apple-inspired light theme tokens. */
export const chartTick = { fill: 'var(--color-chart-tick)', fontSize: 10 };
export const chartTickSm = { fill: 'var(--color-chart-tick)', fontSize: 9 };
export const chartTooltipStyle = {
  background: 'var(--color-chart-tooltip-bg)',
  border: '1px solid var(--color-chart-tooltip-border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-soft)',
  fontSize: 11,
};
export const chartGridStroke = 'var(--color-chart-grid)';
export const chartPolarGrid = 'var(--color-chart-grid)';

export const CHART_SERIES = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
] as const;

export const ROUND_CHART_COLORS = {
  round1: 'var(--color-chart-1)',
  round2: 'var(--color-chart-2)',
  round3: 'var(--color-chart-6)',
} as const;
