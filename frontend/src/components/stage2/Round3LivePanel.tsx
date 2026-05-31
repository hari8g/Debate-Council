import { useMemo, useState } from 'react';
import type { AgentHypothesis, Challenge, PersonaModel, RevisedHypothesis } from '../../types/report';
import { buildConfidenceEvolution, synthesisClaimCards } from '../../lib/debateUtils';
import { confidenceColor, formatConfidence } from '../../lib/utils';
import { DebateConfidenceSpider } from './DebateConfidenceSpider';
import { DebateEvolutionViz } from './DebateEvolutionViz';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { chartPolarGrid, chartTickSm } from '../../lib/chartTheme';

export function Round3LivePanel({
  hypotheses,
  challenges,
  revised,
  persona,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised: RevisedHypothesis[];
  persona: PersonaModel;
}) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const evolution = useMemo(
    () => buildConfidenceEvolution(hypotheses, revised, persona),
    [hypotheses, revised, persona],
  );
  const claimCards = synthesisClaimCards(persona);

  const sectionSpiderData = useMemo(() => {
    const bySection = new Map<string, number[]>();
    for (const c of claimCards) {
      const list = bySection.get(c.section) ?? [];
      list.push(c.confidence);
      bySection.set(c.section, list);
    }
    return Array.from(bySection.entries()).map(([section, confs]) => ({
      section: section.slice(0, 14),
      confidence: confs.reduce((a, b) => a + b, 0) / confs.length,
    }));
  }, [claimCards]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-soft)]">
        <p className="section-eyebrow-accent">Complete</p>
        <h2 className="mt-1 text-2xl">Round 3 — Synthesis</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-muted)]">
          Six revised analyses unified into synthesis claim cards and trajectory charts. The full structured
          persona model lives in the separate &ldquo;Unified persona model&rdquo; tab.
        </p>
        {persona.key_insight && (
          <div className="mt-4 rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/8 p-3">
            <p className="text-xs font-medium text-[var(--color-accent)]">Key insight</p>
            <p className="mt-1 text-sm">{persona.key_insight}</p>
          </div>
        )}
      </div>

      <DebateConfidenceSpider
        evolution={evolution}
        rounds={['round1', 'round2', 'round3']}
        selectedAgent={selectedAgent}
        title="Full debate trajectory — R1 → R2 → R3"
        subtitle="Three-layer spider: initial hypotheses, post-defense revisions, and synthesis-aligned confidence."
      />

      <DebateEvolutionViz
        hypotheses={hypotheses}
        challenges={challenges}
        revised={revised}
        persona={persona}
        activeRound="round3"
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {sectionSpiderData.length >= 3 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="mb-1 text-sm font-medium">Synthesis claim confidence by section</h4>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            Average confidence across unified persona sections — the final output shape.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={sectionSpiderData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={chartPolarGrid} />
              <PolarAngleAxis dataKey="section" tick={chartTickSm} />
              <Radar
                name="Synthesis"
                dataKey="confidence"
                stroke="#5a7a9e"
                fill="#5a7a9e44"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-medium">Final claim cards</h4>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {claimCards.slice(0, 12).map((card, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-[var(--color-text-muted)]">{card.section}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${confidenceColor(card.confidence)}`}>
                  {formatConfidence(card.confidence)}
                </span>
              </div>
              <p className="text-sm">{card.claim}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
