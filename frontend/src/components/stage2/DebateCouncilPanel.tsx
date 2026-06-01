import { useState } from 'react';
import type { AgentHypothesis, Challenge, PersonaModel, RevisedHypothesis } from '../../types/report';
import { cn } from '../../lib/utils';
import { GlassPanel } from './glass/GlassPanel';
import { Round1LivePanel } from './Round1LivePanel';
import { Round2LivePanel } from './Round2LivePanel';
import { Round3LivePanel } from './Round3LivePanel';
import { UnifiedPersonaView } from './UnifiedPersonaView';

type Tab = 'round1' | 'round2' | 'round3' | 'persona';

export function DebateCouncilPanel({
  hypotheses,
  challenges,
  revised,
  persona,
}: {
  hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised: RevisedHypothesis[];
  persona?: PersonaModel;
}) {
  const [tab, setTab] = useState<Tab>('round1');

  const tabs: { id: Tab; label: string; ready: boolean }[] = [
    { id: 'round1', label: 'Cross-examination', ready: hypotheses.length > 0 },
    { id: 'round2', label: 'Defenses', ready: revised.length > 0 },
    { id: 'round3', label: 'Synthesis', ready: Boolean(persona) },
    { id: 'persona', label: 'Persona', ready: Boolean(persona) },
  ];

  return (
    <div className="debate-stage-root space-y-4">
      <GlassPanel>
        <div className="flex flex-wrap gap-1 p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={!t.ready}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                tab === t.id
                  ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
                  : t.ready
                    ? 'text-[var(--color-text-muted)] hover:bg-white/60'
                    : 'cursor-not-allowed opacity-40',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </GlassPanel>

      {tab === 'round1' && (
        <Round1LivePanel hypotheses={hypotheses} challenges={challenges} compactHeader />
      )}
      {tab === 'round2' && (
        <Round2LivePanel hypotheses={hypotheses} challenges={challenges} revised={revised} />
      )}
      {tab === 'round3' && persona && (
        <Round3LivePanel hypotheses={hypotheses} challenges={challenges} revised={revised} persona={persona} />
      )}
      {tab === 'persona' && persona && <UnifiedPersonaView persona={persona} />}
    </div>
  );
}
