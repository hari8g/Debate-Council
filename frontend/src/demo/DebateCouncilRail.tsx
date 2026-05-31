import { motion } from 'framer-motion';
import { Brain, GitMerge, MessageSquareQuote, RefreshCw, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AGENT_LABELS } from '../types/report';
import type { DebatePhase } from './demoNarration';
import { getDebateRailState, subscribeDemoCallout } from './demoRunner';

const PHASES: {
  id: DebatePhase;
  label: string;
  short: string;
  icon: typeof Users;
}[] = [
  { id: 'hypotheses', label: 'Hypotheses', short: 'R0', icon: Users },
  { id: 'challenge', label: 'Cross-exam', short: 'R1', icon: MessageSquareQuote },
  { id: 'defense', label: 'Revision', short: 'R2', icon: RefreshCw },
  { id: 'synthesis', label: 'Synthesis', short: 'R3', icon: GitMerge },
  { id: 'persona', label: 'Persona', short: 'Out', icon: Brain },
];

const AGENTS = Object.keys(AGENT_LABELS);

function phaseIndex(phase: DebatePhase): number {
  const i = PHASES.findIndex((p) => p.id === phase);
  return i >= 0 ? i : -1;
}

export function DebateCouncilRail({ embedded = false }: { embedded?: boolean }) {
  const [rail, setRail] = useState(getDebateRailState);

  useEffect(() => {
    return subscribeDemoCallout(() => setRail(getDebateRailState()));
  }, []);

  if (!rail.active) return null;

  const currentIdx = phaseIndex(rail.phase);

  const shellClass = embedded
    ? 'demo-debate-rail relative w-full rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-4 py-3 shadow-[var(--shadow-card)]'
    : 'demo-debate-rail pointer-events-none fixed left-1/2 top-[11.5rem] z-[48] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/94 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-xl';

  return (
    <motion.div
      initial={{ opacity: 0, y: embedded ? -6 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={shellClass}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">Debate council flow</p>
        {rail.phase === 'challenge' && (
          <p className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {rail.challengesDone}/{rail.challengesTotal} challenges
          </p>
        )}
        {rail.phase === 'hypotheses' && (
          <p className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {rail.agentsReady}/{AGENTS.length} agents
          </p>
        )}
        {rail.phase === 'defense' && (
          <p className="font-mono text-[10px] tabular-nums text-[var(--color-text-muted)]">
            {rail.defensesDone}/{AGENTS.length} revisions
          </p>
        )}
      </div>

      <div className="mb-3 grid grid-cols-5 gap-1.5">
        {PHASES.map((phase, idx) => {
          const done = currentIdx > idx || (phase.id === 'persona' && rail.personaDone);
          const active = rail.phase === phase.id;
          const Icon = phase.icon;
          return (
            <div
              key={phase.id}
              className={`relative rounded-xl px-2 py-2 text-center transition ${
                active
                  ? 'bg-[var(--color-accent)]/12 ring-1 ring-[var(--color-accent)]/35'
                  : done
                    ? 'bg-emerald-500/10'
                    : 'bg-[var(--color-bg-muted)]/70'
              }`}
            >
              <div className="mb-1 flex items-center justify-center gap-1">
                <Icon
                  className={`h-3 w-3 ${active ? 'text-[var(--color-accent)]' : done ? 'text-emerald-600' : 'text-[var(--color-text-tertiary)]'}`}
                />
                <span className="text-[9px] font-bold uppercase text-[var(--color-text-muted)]">{phase.short}</span>
              </div>
              <p className={`text-[10px] font-medium ${active ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                {phase.label}
              </p>
              {active && (
                <motion.div
                  layoutId="debate-phase-indicator"
                  className="absolute -bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--color-accent)]"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {AGENTS.map((agent) => {
          const label = AGENT_LABELS[agent]?.split(' ')[0] ?? agent;
          const hasHypothesis = rail.agentsReady > AGENTS.indexOf(agent);
          const revised = rail.defensesDone > AGENTS.indexOf(agent);
          const shifted = revised && rail.phase !== 'hypotheses';
          return (
            <div
              key={agent}
              title={AGENT_LABELS[agent]}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 ${
                hasHypothesis ? 'bg-[var(--color-bg-muted)]' : 'opacity-40'
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  shifted ? 'bg-amber-500 ring-2 ring-amber-500/30' : hasHypothesis ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-subtle)]'
                }`}
              />
              <span className="max-w-[52px] truncate text-[8px] text-[var(--color-text-muted)]">{label}</span>
            </div>
          );
        })}
      </div>

      {rail.phase === 'defense' && rail.defensesDone > 0 && (
        <p className="mt-2 text-center text-[10px] text-amber-700/90 dark:text-amber-300/90">
          Amber dots = agents who revised their opinion after cross-examination
        </p>
      )}
    </motion.div>
  );
}
