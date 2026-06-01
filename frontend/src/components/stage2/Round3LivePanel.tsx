import { useMemo, useState } from 'react';
import type { AgentHypothesis, Challenge, PersonaModel, RevisedHypothesis, SubstepState } from '../../types/report';
import { buildConfidenceEvolution } from '../../lib/debateUtils';
import { GlassPanel } from './glass/GlassPanel';
import { DebateLiveHeader } from './glass/DebateLiveHeader';
import { AgentOrbit, DEBATE_AGENT_IDS } from './glass/AgentOrbit';
import { SynthesisPortal } from './glass/SynthesisPortal';
import { SynthesisFeed } from './glass/SynthesisFeed';
export function Round3LivePanel({
  hypotheses,
  challenges: _challenges,
  revised,
  persona,
  synthesisSubstep,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised: RevisedHypothesis[];
  persona?: PersonaModel | null;
  synthesisSubstep?: SubstepState;
}) {
  const isLive = synthesisSubstep?.status === 'running' && !persona;
  const progress =
    synthesisSubstep?.percent ??
    (persona ? 100 : revised.length > 0 ? Math.min(90, 20 + (revised.length / 6) * 70) : 8);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const evolution = useMemo(
    () => buildConfidenceEvolution(hypotheses, revised, persona ?? undefined),
    [hypotheses, revised, persona],
  );

  const confidenceByAgent = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of evolution) {
      m[e.agent] = e.round3 ?? e.round2 ?? e.round1;
    }
    return m;
  }, [evolution]);

  const statusByAgent = useMemo(() => {
    const out: Record<string, 'pending' | 'active' | 'done'> = {};
    for (const id of DEBATE_AGENT_IDS) {
      out[id] = confidenceByAgent[id] != null ? 'done' : 'pending';
    }
    return out;
  }, [confidenceByAgent]);

  const avgSynthesis = useMemo(() => {
    const vals = evolution.map((e) => e.round3 ?? e.round2 ?? e.round1);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [evolution]);

  return (
    <div className="debate-stage-root space-y-4">
      <GlassPanel strong>
        <DebateLiveHeader
          live={isLive}
          complete={!!persona}
          title="Round 3 — Synthesis"
          subtitle={
            persona
              ? 'Six revised readings merged into one council model. Explore confidence arcs and open the unified persona tab for the full profile.'
              : 'Council is merging revised hypotheses into synthesis claim cards — Round 2 confidence arcs update live below.'
          }
          count={persona ? evolution.filter((e) => e.round3 != null).length : revised.length}
          total={6}
          message={
            synthesisSubstep?.message ??
            (persona
              ? `Council mean confidence ${Math.round(avgSynthesis * 100)}%`
              : revised.length
                ? `Awaiting synthesis · ${revised.length}/6 defenses in`
                : 'Waiting for revised hypotheses…')
          }
          progress={progress}
        />
        <AgentOrbit
          selected={selectedAgent}
          onSelect={setSelectedAgent}
          statusByAgent={statusByAgent}
          confidenceByAgent={confidenceByAgent}
        />
      </GlassPanel>

      <div className="grid h-[min(520px,58vh)] min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(300px,360px)]">
        <GlassPanel fill className="overflow-hidden">
          <SynthesisPortal
            evolution={evolution}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        </GlassPanel>

        <GlassPanel fill className="overflow-hidden">
          <SynthesisFeed
            persona={persona ?? null}
            evolution={evolution}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            isLive={isLive}
          />
        </GlassPanel>
      </div>
    </div>
  );
}
