import { AGENT_LABELS } from '../../../types/report';
import { cn, formatConfidence } from '../../../lib/utils';
import { Brain, Users, BookOpen, TrendingUp, Clock, Globe } from 'lucide-react';

export const DEBATE_AGENT_IDS = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
] as const;

const AGENT_ICONS: Record<string, typeof Brain> = {
  psychographer: Brain,
  sociologist: Users,
  narrative_analyst: BookOpen,
  behavioural_economist: TrendingUp,
  temporal_analyst: Clock,
  cultural_analyst: Globe,
};

export function AgentOrbit({
  selected,
  onSelect,
  statusByAgent,
  confidenceByAgent,
  liveAgent,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  statusByAgent: Record<string, 'pending' | 'active' | 'done'>;
  confidenceByAgent?: Record<string, number>;
  liveAgent?: string | null;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 p-3">
      {DEBATE_AGENT_IDS.map((id) => {
        const Icon = AGENT_ICONS[id] ?? Brain;
        const status = statusByAgent[id] ?? 'pending';
        const isSelected = selected === id;
        const isLive = liveAgent === id;
        const conf = confidenceByAgent?.[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(isSelected ? null : id)}
            className={cn(
              'flex min-w-[4.75rem] flex-col items-center gap-1 rounded-xl border px-2.5 py-2 transition-all duration-200',
              isSelected
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                : 'border-transparent bg-white/50 hover:bg-white/80',
              isLive && 'glass-live-pulse ring-1 ring-[var(--color-accent)]/35',
              status === 'pending' && !isSelected && 'opacity-50',
            )}
            title={AGENT_LABELS[id] || id}
          >
            <Icon className={cn('h-4 w-4', isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]')} />
            <span className="max-w-[4.5rem] truncate text-[10px] font-medium">
              {(AGENT_LABELS[id] || id).split(' ')[0]}
            </span>
            {conf != null && status === 'done' && (
              <span className="text-[9px] tabular-nums text-[var(--color-accent)]">{formatConfidence(conf)}</span>
            )}
            {status === 'active' && (
              <span className="text-[9px] text-[var(--color-accent)]">live</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function buildAgentStatus(
  agentIds: readonly string[],
  completed: string[],
  liveId?: string | null,
): Record<string, 'pending' | 'active' | 'done'> {
  const out: Record<string, 'pending' | 'active' | 'done'> = {};
  for (const id of agentIds) {
    if (liveId === id) out[id] = 'active';
    else if (completed.includes(id)) out[id] = 'done';
    else out[id] = 'pending';
  }
  return out;
}
