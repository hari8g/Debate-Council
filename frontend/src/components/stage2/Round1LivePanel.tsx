import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentHypothesis, Challenge, SubstepState } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { AgentCouncil } from './AgentCouncil';
import { cn } from '../../lib/utils';

const AGENT_IDS = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
];

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
  const feedRef = useRef<HTMLDivElement>(null);

  const isLive = challengeSubstep?.status === 'running';
  const progress = challengeSubstep?.percent ?? (challenges.length / TOTAL_CHALLENGES) * 100;
  const done = challenges.length;
  const latest = challenges[challenges.length - 1];

  useEffect(() => {
    if (challenges.length > 0) {
      setHighlightIdx(challenges.length - 1);
      setSelectedChallenge(challenges[challenges.length - 1]);
    }
  }, [challenges.length]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [highlightIdx]);

  const matrix = useMemo(() => {
    const set = new Set(challenges.map((c) => `${c.challenger}|${c.target}`));
    return set;
  }, [challenges]);

  return (
    <div className="space-y-5">
      {!compactHeader && (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-eyebrow-accent">
                {isLive ? '● Live' : done >= TOTAL_CHALLENGES ? 'Complete' : 'Stage 2'}
              </p>
              <h2 className="mt-1 text-2xl">Round 1 — Debate Council</h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
                Six agents cross-examine every other hypothesis. Watch challenges stream in and explore the agent network.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold tracking-tight text-[var(--color-accent)]">
                {done}<span className="text-lg text-[var(--color-text-muted)]">/{TOTAL_CHALLENGES}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">cross-examinations</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>{challengeSubstep?.message || (latest ? `Latest: ${AGENT_LABELS[latest.challenger] || latest.challenger} → ${AGENT_LABELS[latest.target] || latest.target}` : 'Waiting for first challenge…')}</span>
              <span title="Share of 30 cross-examinations completed">{done}/{TOTAL_CHALLENGES} ({Math.round(progress)}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
              <div
                className={cn('h-full rounded-full transition-all duration-500', isLive ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-success)]')}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Challenge matrix — live simulation</h4>
            <p className="text-xs text-[var(--color-text-muted)]">
              Rows challenge columns. Cells fill as cross-examinations complete — pulsing cell is the latest.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--color-text-muted)]">
            <span className="font-medium text-[var(--color-accent)]">{matrix.size}</span>
            <span> / {TOTAL_CHALLENGES} pairs</span>
            {isLive && <span className="ml-2 text-[var(--color-accent)]">● streaming</span>}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
          <table className="w-full min-w-[520px] border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="p-1.5 text-left font-normal text-[var(--color-text-muted)]">Challenger ↓ Target →</th>
                {AGENT_IDS.map((id) => (
                  <th key={id} className="p-1.5 font-normal text-[var(--color-text-muted)]">
                    {(AGENT_LABELS[id] || id).split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENT_IDS.map((row) => (
                <tr key={row}>
                  <td className="p-1.5 text-[var(--color-text-muted)]">{(AGENT_LABELS[row] || row).split(' ')[0]}</td>
                  {AGENT_IDS.map((col) => {
                    const key = `${row}|${col}`;
                    const filled = row !== col && matrix.has(key);
                    const isLatest = latest && latest.challenger === row && latest.target === col;
                    return (
                      <td key={col} className="p-1">
                        <div
                          className={cn(
                            'mx-auto flex h-6 w-6 items-center justify-center rounded-sm transition-all',
                            row === col && 'bg-transparent',
                            row !== col && !filled && 'bg-[var(--color-bg-muted)]',
                            filled && !isLatest && 'bg-[var(--color-accent)]/55',
                            isLatest && 'bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)] animate-pulse',
                          )}
                          title={filled ? `${AGENT_LABELS[row]} → ${AGENT_LABELS[col]}` : undefined}
                        >
                          {filled && <span className="text-[8px] font-medium text-white">✓</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AgentCouncil hypotheses={hypotheses} roundLabel="Agent hypotheses — click cards to explore" />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h4 className="text-sm font-medium">Live challenge feed</h4>
            <p className="text-xs text-[var(--color-text-muted)]">{challenges.length} shown</p>
          </div>
          <div ref={feedRef} className="max-h-[420px] flex-1 space-y-2 overflow-y-auto p-3">
            {challenges.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Challenges appear here as agents debate…</p>
            )}
            {challenges.map((ch, i) => {
              const globalIdx = challenges.indexOf(ch);
              const isNew = globalIdx === highlightIdx;
              const isSelected = selectedChallenge === ch;
              return (
                <button
                  key={`${ch.challenger}-${ch.target}-${i}`}
                  type="button"
                  onClick={() => setSelectedChallenge(ch)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                    isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/8' : 'border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]',
                    isNew && !isSelected && 'border-[var(--color-accent)]/40',
                  )}
                >
                  <span className="text-[var(--color-danger)]">{AGENT_LABELS[ch.challenger] || ch.challenger}</span>
                  <span className="text-[var(--color-text-muted)]"> → </span>
                  <span>{AGENT_LABELS[ch.target] || ch.target}</span>
                  {isNew && isLive && <span className="ml-2 text-[10px] text-[var(--color-accent)]">new</span>}
                </button>
              );
            })}
          </div>
          {selectedChallenge && (
            <div className="border-t border-[var(--color-border)] p-4">
              <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">Challenge detail</p>
              <p className="text-sm leading-relaxed text-[var(--color-text)]">
                {typeof selectedChallenge.challenge_text === 'string'
                  ? selectedChallenge.challenge_text
                  : JSON.stringify(selectedChallenge.challenge_text, null, 2)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
