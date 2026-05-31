import { useState } from 'react';
import type { Challenge } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';

export function DebateFlow({ challenges }: { challenges: Challenge[] }) {
  const [selected, setSelected] = useState<Challenge | null>(null);
  const display = challenges.slice(-20);

  return (
    <div>
      <h3 className="mb-4 text-xl">Debate Flow — Round 1 Challenges</h3>
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        {challenges.length} challenges exchanged between agents
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          {display.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(ch)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--color-bg-elevated)] ${
                selected === ch ? 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30' : ''
              }`}
            >
              <span className="text-[var(--color-danger)]">{AGENT_LABELS[ch.challenger] || ch.challenger}</span>
              <span className="text-[var(--color-text-muted)]"> → </span>
              <span className="text-[var(--color-text)]">{AGENT_LABELS[ch.target] || ch.target}</span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          {selected ? (
            <>
              <h4 className="mb-2 text-sm font-medium">
                {AGENT_LABELS[selected.challenger]} challenges {AGENT_LABELS[selected.target]}
              </h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                {typeof selected.challenge_text === 'string'
                  ? selected.challenge_text
                  : JSON.stringify(selected.challenge_text, null, 2)}
              </p>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Select a challenge to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
