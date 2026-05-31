import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { chartPolarGrid, chartTickSm } from '../../lib/chartTheme';
import type { AgentHypothesis, RevisedHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { confidenceColor, formatConfidence, parseConfidence } from '../../lib/utils';
import { ArrowRight } from 'lucide-react';

export function AgentCompareGrid({
  hypotheses,
  revised,
  revisedRaw,
  selectedAgent,
  onSelectAgent,
}: {
  hypotheses: AgentHypothesis[];
  revised: AgentHypothesis[];
  revisedRaw: RevisedHypothesis[];
  selectedAgent: string | null;
  onSelectAgent: (id: string | null) => void;
}) {
  const agents = selectedAgent
    ? hypotheses.filter((h) => h.agent === selectedAgent)
    : hypotheses;

  return (
    <div>
      <h4 className="mb-1 text-sm font-medium">Agent-by-agent — Round 1 → Round 2</h4>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">
        Click a card to filter the spider chart. Psychographer shows Big Five trait overlay when available.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((orig) => {
          const rev = revised.find((r) => r.agent === orig.agent);
          const revRaw = revisedRaw.find((r) => r.agent === orig.agent);
          if (!rev) return null;
          const before = parseConfidence(orig.analysis?.confidence, 0.5);
          const after = parseConfidence(rev.analysis?.confidence, before);
          const delta = after - before;
          const traitData = buildTraitCompare(orig, rev);

          return (
            <button
              key={orig.agent}
              type="button"
              onClick={() => onSelectAgent(selectedAgent === orig.agent ? null : orig.agent)}
              className={`rounded-lg border bg-[var(--color-bg-card)] p-4 text-left transition hover:shadow-sm ${
                selectedAgent === orig.agent
                  ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30'
                  : 'border-[var(--color-border)]'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium">{AGENT_LABELS[orig.agent] || orig.agent}</span>
                <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />
                <span className={`rounded-full border px-2 py-0.5 text-xs ${confidenceColor(after)}`}>
                  {formatConfidence(after)}
                </span>
              </div>
              <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                {formatConfidence(before)} → {formatConfidence(after)}
                <span
                  className={
                    delta > 0.02
                      ? ' ml-1 text-[var(--color-success)]'
                      : delta < -0.02
                        ? ' ml-1 text-[var(--color-danger)]'
                        : ' ml-1'
                  }
                >
                  ({delta >= 0 ? '+' : ''}{(delta * 100).toFixed(0)}%)
                </span>
              </p>
              <p className="mb-2 line-clamp-3 text-sm text-[var(--color-text-muted)]">
                {String(rev.analysis?.key_hypothesis || rev.analysis?.revised_hypothesis || '')}
              </p>
              {traitData.length > 0 && (
                <ResponsiveContainer width="100%" height={120}>
                  <RadarChart data={traitData}>
                    <PolarGrid stroke={chartPolarGrid} />
                    <PolarAngleAxis dataKey="trait" tick={chartTickSm} />
                    <Radar name="R1" dataKey="round1" stroke="var(--color-chart-1)" fill="color-mix(in srgb, var(--color-chart-1) 22%, transparent)" strokeWidth={1.5} />
                    <Radar name="R2" dataKey="round2" stroke="var(--color-chart-2)" fill="color-mix(in srgb, var(--color-chart-2) 22%, transparent)" strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              {revRaw && (
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  Addressed {revRaw.challenges_received?.length ?? 0} challenges
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildTraitCompare(orig: AgentHypothesis, rev: AgentHypothesis) {
  const b1 = orig.analysis?.big_five as Record<string, number> | undefined;
  const b2 = rev.analysis?.big_five as Record<string, number> | undefined;
  if (!b1 && !b2) return [];
  const keys = new Set([...Object.keys(b1 ?? {}), ...Object.keys(b2 ?? {})]);
  return Array.from(keys).map((trait) => ({
    trait: trait.charAt(0).toUpperCase() + trait.slice(1),
    round1: Number(b1?.[trait] ?? b2?.[trait] ?? 0),
    round2: Number(b2?.[trait] ?? b1?.[trait] ?? 0),
  }));
}
