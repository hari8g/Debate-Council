import type { SignalSummary } from '../../types/report';

export function PipelineProvenance({
  postsAnalysed,
  analysisPeriodDays,
  agentCount,
  challengeCount,
  defenseCount,
  monteCarloSims,
  monteCarloMs,
  ouR2,
}: {
  postsAnalysed?: number;
  analysisPeriodDays?: number;
  agentCount: number;
  challengeCount: number;
  defenseCount: number;
  monteCarloSims?: number;
  monteCarloMs?: number;
  ouR2?: number;
}) {
  const items = [
    {
      label: 'Posts analysed',
      value: postsAnalysed != null ? `${postsAnalysed} over ${analysisPeriodDays ?? '?'}d` : '—',
      detail: 'Real Instagram posts fetched into signal matrix',
    },
    {
      label: 'Stage 2 LLM calls',
      value: agentCount + challengeCount + defenseCount + (defenseCount > 0 ? 1 : 0) || '—',
      detail: `${agentCount} agents + ${challengeCount} challenges + ${defenseCount} defenses + synthesis`,
    },
    {
      label: 'Monte Carlo',
      value: monteCarloSims ? `${monteCarloSims.toLocaleString()} paths` : '—',
      detail: monteCarloMs ? `${monteCarloMs.toFixed(0)}ms compute · OU R² ${ouR2?.toFixed(3) ?? '—'}` : 'Pending',
    },
  ];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h3 className="mb-1 text-sm font-medium">Pipeline Provenance</h3>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">
        Audit trail — every number below is tied to a completed pipeline step, not placeholder UI.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-md bg-[var(--color-bg-elevated)] p-3">
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</div>
            <div className="mt-0.5 text-lg text-[var(--color-accent)]">{item.value}</div>
            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function provenanceFromSummary(summary?: SignalSummary) {
  return {
    postsAnalysed: summary?.posts_analysed,
    analysisPeriodDays: summary?.analysis_period_days,
  };
}
