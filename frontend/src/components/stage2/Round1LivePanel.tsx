import { useEffect, useMemo, useState } from 'react';
import type { AgentHypothesis, Challenge, SubstepState } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { GlassPanel } from './glass/GlassPanel';
import { DebateLiveHeader } from './glass/DebateLiveHeader';
import { CrossExaminationPortal } from './glass/CrossExaminationPortal';
import { CrossExaminationFeed } from './glass/CrossExaminationFeed';
import { AgentCouncil } from './AgentCouncil';

const TOTAL_CHALLENGES = 30;

export function Round1LivePanel({
  hypotheses,
  challenges,
  challengeSubstep,
  compactHeader,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  challengeSubstep?: SubstepState;
  compactHeader?: boolean;
}) {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(challenges.length - 1);

  const isLive = challengeSubstep?.status === 'running';
  const progress = challengeSubstep?.percent ?? (challenges.length / TOTAL_CHALLENGES) * 100;
  const latest = challenges[challenges.length - 1];

  useEffect(() => {
    if (challenges.length > 0) {
      setHighlightIdx(challenges.length - 1);
      setSelectedChallenge(challenges[challenges.length - 1]);
    }
  }, [challenges.length]);

  const liveMessage = useMemo(() => {
    if (challengeSubstep?.message) return challengeSubstep.message;
    if (latest) {
      return `Latest · ${AGENT_LABELS[latest.challenger] || latest.challenger} → ${AGENT_LABELS[latest.target] || latest.target}`;
    }
    return undefined;
  }, [challengeSubstep?.message, latest]);

  const selectedPair = selectedChallenge
    ? { challenger: selectedChallenge.challenger, target: selectedChallenge.target }
    : null;

  const handleMatrixSelect = (challenger: string, target: string) => {
    const ch = challenges.find((c) => c.challenger === challenger && c.target === target);
    if (ch) {
      setSelectedChallenge(ch);
      setHighlightIdx(challenges.indexOf(ch));
    }
  };

  return (
    <div className="debate-stage-root space-y-4">
      {!compactHeader && (
        <GlassPanel live={isLive}>
          <DebateLiveHeader
            live={isLive}
            complete={challenges.length >= TOTAL_CHALLENGES}
            title="Round 1 — Cross-examination"
            subtitle="Six agents challenge every other lens. Watch the matrix fill and follow the live feed."
            count={challenges.length}
            total={TOTAL_CHALLENGES}
            message={liveMessage}
            progress={progress}
          />
        </GlassPanel>
      )}

      <div className="grid h-[min(520px,58vh)] min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(300px,360px)]">
        <GlassPanel className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden" live={isLive && challenges.length > 0}>
          <CrossExaminationPortal
            challenges={challenges}
            isLive={isLive}
            selectedPair={selectedPair}
            onSelectPair={handleMatrixSelect}
          />
        </GlassPanel>

        <GlassPanel
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden"
          live={isLive && highlightIdx === challenges.length - 1}
        >
          <CrossExaminationFeed
            challenges={challenges}
            focused={selectedChallenge}
            onFocus={(ch) => {
              setSelectedChallenge(ch);
              setHighlightIdx(challenges.indexOf(ch));
            }}
            isLive={isLive}
            total={TOTAL_CHALLENGES}
          />
        </GlassPanel>
      </div>

      {hypotheses.length > 0 && (
        <GlassPanel>
          <div className="p-4 sm:p-5">
            <AgentCouncil hypotheses={hypotheses} roundLabel="Agent hypotheses" compact />
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
