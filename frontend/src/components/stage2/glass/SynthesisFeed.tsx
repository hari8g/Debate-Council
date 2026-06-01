import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AgentConfidencePoint } from '../../../lib/debateUtils';
import { AGENT_PERSONA_SECTIONS } from '../../../lib/debateUtils';
import type { PersonaModel, PersonaSection } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { formatConfidence, parseConfidence } from '../../../lib/utils';
import { Loader2, Sparkles } from 'lucide-react';

const TRAIL = 3;

function primaryClaimForAgent(persona: PersonaModel, agent: string): { section: string; claim: string; confidence: number } | null {
  const keys = AGENT_PERSONA_SECTIONS[agent];
  if (!keys?.length) return null;
  for (const key of keys) {
    const section = persona[key] as PersonaSection | undefined;
    if (!section) continue;
    if (section.claims?.length) {
      const c = section.claims[0];
      return {
        section: key.replace(/_/g, ' '),
        claim: c.claim,
        confidence: parseConfidence(c.confidence, 0.5),
      };
    }
    if (section.summary) {
      return { section: key.replace(/_/g, ' '), claim: section.summary, confidence: 0.55 };
    }
  }
  return null;
}

export function SynthesisFeed({
  persona,
  evolution,
  selectedAgent,
  onSelectAgent,
  isLive = false,
}: {
  persona: PersonaModel | null;
  evolution: AgentConfidencePoint[];
  selectedAgent: string | null;
  onSelectAgent: (id: string) => void;
  isLive?: boolean;
}) {
  const agentPoint = selectedAgent ? evolution.find((e) => e.agent === selectedAgent) : null;
  const displayClaim = persona && selectedAgent ? primaryClaimForAgent(persona, selectedAgent) : null;

  const trail = useMemo(() => {
    if (!selectedAgent) return evolution.slice(0, TRAIL);
    return evolution.filter((e) => e.agent !== selectedAgent).slice(-TRAIL).reverse();
  }, [evolution, selectedAgent]);

  const showCouncil = !selectedAgent;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/45 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
          <span className="text-xs font-semibold">Synthesis feed</span>
        </div>
        <span className="rounded-full bg-white/55 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          {isLive ? 'Live' : persona ? 'Unified' : 'Pending'}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={showCouncil ? 'council' : selectedAgent ?? 'none'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-accent)]/25 bg-gradient-to-br from-white/75 to-white/45 shadow-sm"
          >
            {showCouncil ? (
              <>
                <div className="shrink-0 border-b border-white/50 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    {persona ? 'Council output' : 'Synthesis in progress'}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5">
                  {persona ? (
                    <>
                      {persona.key_insight && (
                        <p className="mb-3 text-[12px] font-medium leading-relaxed text-[var(--color-text)]">
                          {persona.key_insight}
                        </p>
                      )}
                      <p className="line-clamp-[10] text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        {persona.summary}
                      </p>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
                      {isLive && <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />}
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        Merging six revised analyses into synthesis claim cards. Confidence arcs update as defenses
                        complete; unified summary appears when the LLM returns.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : agentPoint && displayClaim ? (
              <>
                <div className="shrink-0 border-b border-white/50 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    {AGENT_LABELS[selectedAgent!] || selectedAgent}
                  </span>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-accent)]">
                    {formatConfidence(agentPoint.round3 ?? agentPoint.round2 ?? agentPoint.round1)}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    R1 {formatConfidence(agentPoint.round1)} → R3{' '}
                    {formatConfidence(agentPoint.round3 ?? agentPoint.round2 ?? agentPoint.round1)}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5">
                  <p className="text-[10px] uppercase text-[var(--color-text-tertiary)]">{displayClaim.section}</p>
                  <p className="mt-1 line-clamp-6 text-[12px] leading-relaxed">{displayClaim.claim}</p>
                </div>
              </>
            ) : agentPoint && !persona ? (
              <div className="flex min-h-0 flex-1 flex-col justify-center px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                  {AGENT_LABELS[selectedAgent!] || selectedAgent}
                </span>
                <p className="mt-2 text-lg font-semibold tabular-nums text-[var(--color-accent)]">
                  {formatConfidence(agentPoint.round2 ?? agentPoint.round1)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  Post-defense confidence — Round 3 synthesis pending for this agent.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-4 text-xs text-[var(--color-text-muted)]">
                Select an agent in the portal
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 shrink-0 space-y-1">
          <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            {showCouncil ? 'Agents' : 'Other agents'}
          </p>
          {trail.map((e, i) => (
            <button
              key={e.agent}
              type="button"
              onClick={() => onSelectAgent(e.agent)}
              className="flex w-full items-center justify-between rounded-lg bg-white/35 px-2 py-1.5 text-left hover:bg-white/55"
              style={{ opacity: 1 - i * 0.2 }}
            >
              <span className="truncate text-[10px] text-[var(--color-text-muted)]">{e.label.split(' ')[0]}</span>
              <span className="text-[10px] tabular-nums text-[var(--color-accent)]">
                {formatConfidence(e.round3 ?? e.round2 ?? e.round1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
