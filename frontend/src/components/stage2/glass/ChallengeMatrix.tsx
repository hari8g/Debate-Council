import { useMemo } from 'react';
import type { Challenge } from '../../../types/report';
import { AGENT_LABELS } from '../../../types/report';
import { cn } from '../../../lib/utils';
import { DEBATE_AGENT_IDS } from './AgentOrbit';

const TOTAL = 30;

export function ChallengeMatrix({
  challenges,
  isLive,
}: {
  challenges: Challenge[];
  isLive?: boolean;
}) {
  const latest = challenges[challenges.length - 1];
  const matrix = useMemo(() => {
    const set = new Set(challenges.map((c) => `${c.challenger}|${c.target}`));
    return set;
  }, [challenges]);

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Cross-examination matrix</p>
        <span className="text-xs text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-accent)]">{matrix.size}</span>/{TOTAL}
          {isLive && <span className="ml-2 text-[var(--color-accent)]">● streaming</span>}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/30 p-2">
        <table className="w-full min-w-[480px] border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="p-1.5 text-left font-normal text-[var(--color-text-muted)]">↓ →</th>
              {DEBATE_AGENT_IDS.map((id) => (
                <th key={id} className="p-1.5 font-normal text-[var(--color-text-muted)]">
                  {(AGENT_LABELS[id] || id).split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEBATE_AGENT_IDS.map((row) => (
              <tr key={row}>
                <td className="p-1.5 text-[var(--color-text-muted)]">{(AGENT_LABELS[row] || row).split(' ')[0]}</td>
                {DEBATE_AGENT_IDS.map((col) => {
                  const filled = row !== col && matrix.has(`${row}|${col}`);
                  const isLatest = latest?.challenger === row && latest?.target === col;
                  return (
                    <td key={col} className="p-0.5">
                      <div
                        className={cn(
                          'mx-auto h-5 w-5 rounded-md transition-all',
                          row === col && 'opacity-0',
                          !filled && row !== col && 'bg-[var(--color-border)]/40',
                          filled && !isLatest && 'bg-[var(--color-accent)]/50',
                          isLatest && 'bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/60 animate-pulse',
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
