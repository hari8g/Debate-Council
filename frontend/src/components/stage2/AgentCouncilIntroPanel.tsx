import type { AgentHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { AgentCouncil } from './AgentCouncil';
import { formatConfidence, parseConfidence } from '../../lib/utils';
import { Brain, BookOpen, Users, TrendingUp, Clock, Globe } from 'lucide-react';
import { GlassPanel } from './glass/GlassPanel';
import { AgentOrbit, buildAgentStatus, DEBATE_AGENT_IDS } from './glass/AgentOrbit';

const AGENTS = [
  { id: 'psychographer', icon: Brain, lens: 'Big Five · attachment · identity' },
  { id: 'sociologist', icon: Users, lens: 'Bourdieu · Goffman · capital' },
  { id: 'narrative_analyst', icon: BookOpen, lens: 'McAdams · narrative frames' },
  { id: 'behavioural_economist', icon: TrendingUp, lens: 'Revealed preferences' },
  { id: 'temporal_analyst', icon: Clock, lens: 'Change points · trajectories' },
  { id: 'cultural_analyst', icon: Globe, lens: 'Semiotics · affiliation' },
];

export function AgentCouncilIntroPanel({ hypotheses }: { hypotheses: AgentHypothesis[] }) {
  const complete = hypotheses.length;
  const isRunning = complete > 0 && complete < 6;
  const completedIds = hypotheses.map((h) => h.agent);
  const nextPending = DEBATE_AGENT_IDS.find((id) => !completedIds.includes(id));
  const statusByAgent = buildAgentStatus(
    DEBATE_AGENT_IDS,
    completedIds,
    isRunning ? nextPending ?? null : null,
  );
  const confidenceByAgent = Object.fromEntries(
    hypotheses.map((h) => [h.agent, parseConfidence(h.analysis?.confidence, 0.5)]),
  );

  return (
    <div className="debate-stage-root space-y-4">
      <GlassPanel live={isRunning}>
        <div className="p-6 sm:p-8">
          <p className={isRunning ? 'section-eyebrow-accent' : 'section-eyebrow'}>
            {isRunning ? '● Forming hypotheses' : complete === 6 ? 'Council ready' : 'Starting'}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl">The debate council</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
            Six specialists read the same signals through different disciplines, then cross-examine each other.
            Disagreement surfaces blind spots before synthesis.
          </p>
        </div>
        <AgentOrbit
          selected={null}
          onSelect={() => {}}
          statusByAgent={statusByAgent}
          confidenceByAgent={confidenceByAgent}
        />
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map(({ id, icon: Icon, lens }) => {
          const hyp = hypotheses.find((h) => h.agent === id);
          const conf = hyp ? parseConfidence(hyp.analysis?.confidence, 0.5) : null;
          return (
            <GlassPanel key={id} className={hyp ? 'ring-1 ring-[var(--color-accent)]/20' : 'opacity-60'}>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                    <span className="text-sm font-medium">{AGENT_LABELS[id] || id}</span>
                  </div>
                  {conf != null && (
                    <span className="text-xs tabular-nums text-[var(--color-accent)]">{formatConfidence(conf)}</span>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{lens}</p>
                {hyp?.analysis?.key_claim && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {String(hyp.analysis.key_claim)}
                  </p>
                )}
                {!hyp && isRunning && (
                  <p className="mt-2 text-xs text-[var(--color-accent)]">Analyzing…</p>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {hypotheses.length > 0 && (
        <GlassPanel>
          <div className="p-4 sm:p-5">
            <AgentCouncil hypotheses={hypotheses} compact />
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
