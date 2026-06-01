import { useEffect, useMemo, useState } from 'react';
import type { AgentHypothesis, Challenge, RevisedHypothesis, SubstepState } from '../../types/report';
import { parseConfidence } from '../../lib/utils';
import { GlassPanel } from './glass/GlassPanel';
import { DebateLiveHeader } from './glass/DebateLiveHeader';
import { AgentOrbit, buildAgentStatus, DEBATE_AGENT_IDS } from './glass/AgentOrbit';
import { DefensePortal } from './glass/DefensePortal';
import { DefenseFeed } from './glass/DefenseFeed';

const TOTAL_DEFENSES = 6;

export function Round2LivePanel({
  hypotheses: _hypotheses,
  challenges: _challenges,
  revised,
  defenseSubstep,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised: RevisedHypothesis[];
  defenseSubstep?: SubstepState;
}) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const isLive = defenseSubstep?.status === 'running';
  const progress = defenseSubstep?.percent ?? (revised.length / TOTAL_DEFENSES) * 100;
  const latestRev = revised[revised.length - 1];

  useEffect(() => {
    if (revised.length > 0) {
      const agent = latestRev?.agent;
      if (agent) {
        setSelectedAgent(agent);
        const first = latestRev.challenges_received?.[0];
        if (first) setSelectedChallenge(first);
      }
    }
  }, [revised.length, latestRev?.agent, latestRev]);

  const liveAgent = isLive && latestRev ? latestRev.agent : null;
  const completedAgents = revised.map((r) => r.agent);
  const statusByAgent = buildAgentStatus(DEBATE_AGENT_IDS, completedAgents, liveAgent);

  const confidenceByAgent = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of revised) {
      m[r.agent] = parseConfidence(r.revised_analysis?.confidence, 0.5);
    }
    return m;
  }, [revised]);

  const activeRev = selectedAgent ? revised.find((r) => r.agent === selectedAgent) : latestRev;
  const challengesForAgent = activeRev?.challenges_received ?? [];

  useEffect(() => {
    const list = activeRev?.challenges_received;
    if (!list?.length) {
      setSelectedChallenge(null);
      return;
    }
    setSelectedChallenge((prev) => {
      if (
        prev &&
        list.some((c) => c.challenger === prev.challenger && c.target === prev.target)
      ) {
        return prev;
      }
      return list[0];
    });
  }, [selectedAgent, activeRev?.agent, activeRev?.challenges_received?.length]);

  return (
    <div className="debate-stage-root space-y-4">
      <GlassPanel live={isLive}>
        <DebateLiveHeader
          live={isLive}
          complete={revised.length >= TOTAL_DEFENSES}
          title="Round 2 — Defenses"
          subtitle="Each agent responds to every challenge individually. Watch the portal fill with verdicts and follow the defense feed."
          count={revised.length}
          total={TOTAL_DEFENSES}
          message={defenseSubstep?.message}
          progress={progress}
        />
        <AgentOrbit
          selected={selectedAgent}
          onSelect={setSelectedAgent}
          statusByAgent={statusByAgent}
          confidenceByAgent={confidenceByAgent}
          liveAgent={liveAgent}
        />
      </GlassPanel>

      <div className="grid h-[min(520px,58vh)] min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(300px,360px)]">
        <GlassPanel
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          live={isLive && Boolean(latestRev)}
        >
          <DefensePortal
            activeRev={activeRev}
            selectedChallenge={selectedChallenge}
            onSelectChallenge={setSelectedChallenge}
            isLive={isLive && activeRev?.agent === liveAgent}
          />
        </GlassPanel>

        <GlassPanel
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          live={isLive && selectedChallenge !== null}
        >
          <DefenseFeed
            activeRev={activeRev}
            challenges={challengesForAgent}
            focused={selectedChallenge}
            onFocus={setSelectedChallenge}
            isLive={isLive && activeRev?.agent === liveAgent}
          />
        </GlassPanel>
      </div>

      {revised.length === 0 && isLive && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Defenses stream in one agent at a time — watch the orbit light up.
        </p>
      )}
    </div>
  );
}
