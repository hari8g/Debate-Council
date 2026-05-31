import { useMemo, useState } from 'react';
import type { AgentHypothesis, Challenge, RevisedHypothesis, SubstepState } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { buildConfidenceEvolution, revisedToHypotheses } from '../../lib/debateUtils';
import { formatConfidence, parseConfidence } from '../../lib/utils';
import { DebateConfidenceSpider } from './DebateConfidenceSpider';
import { DebateEvolutionViz } from './DebateEvolutionViz';
import { AgentCompareGrid } from './AgentCompareGrid';

export function Round2LivePanel({
  hypotheses,
  challenges,
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

  const evolution = useMemo(
    () => buildConfidenceEvolution(hypotheses, revised),
    [hypotheses, revised],
  );
  const round2Hypotheses = revisedToHypotheses(revised);
  const isLive = defenseSubstep?.status === 'running';
  const done = revised.length;

  const filteredRevised = selectedAgent
    ? revised.filter((r) => r.agent === selectedAgent)
    : revised;

  const challengesForView = selectedAgent
    ? revised.find((r) => r.agent === selectedAgent)?.challenges_received ?? []
    : revised.flatMap((r) => r.challenges_received || []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-eyebrow-accent">
              {isLive ? '● Live' : done >= 6 ? 'Complete' : 'Stage 2'}
            </p>
            <h2 className="mt-1 text-2xl">Round 2 — Defenses</h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
              Each agent revised their hypothesis after cross-examination. The spider overlay shows Round 1 vs Round 2 confidence shifts.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-accent)]">
              {done}<span className="text-lg text-[var(--color-text-muted)]">/6</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">defenses completed</p>
          </div>
        </div>
        {defenseSubstep?.message && isLive && (
          <p className="mt-3 text-xs text-[var(--color-accent)]">{defenseSubstep.message}</p>
        )}
      </div>

      {revised.length > 0 && (
        <DebateConfidenceSpider
          evolution={evolution}
          rounds={['round1', 'round2']}
          selectedAgent={selectedAgent}
          title="Confidence spider — Round 1 vs Round 2"
          subtitle="Outer shape is initial hypothesis; inner overlay is post-defense revision. Compare how debate shifted each agent."
        />
      )}

      <DebateEvolutionViz
        hypotheses={hypotheses}
        challenges={challenges}
        revised={revised}
        activeRound="round2"
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      {revised.length > 0 && (
        <AgentCompareGrid
          hypotheses={hypotheses}
          revised={round2Hypotheses}
          revisedRaw={filteredRevised}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />
      )}

      {challengesForView.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <h4 className="text-sm font-medium">Challenges addressed</h4>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto p-3">
              {challengesForView.map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedChallenge(ch)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedChallenge === ch
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/8'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]'
                  }`}
                >
                  <span className="text-[var(--color-danger)]">{AGENT_LABELS[ch.challenger] || ch.challenger}</span>
                  <span className="text-[var(--color-text-muted)]"> → </span>
                  {AGENT_LABELS[ch.target] || ch.target}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            {selectedChallenge ? (
              <>
                <h5 className="mb-2 text-sm font-medium">
                  {AGENT_LABELS[selectedChallenge.challenger]} → {AGENT_LABELS[selectedChallenge.target]}
                </h5>
                <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                  {typeof selectedChallenge.challenge_text === 'string'
                    ? selectedChallenge.challenge_text
                    : JSON.stringify(selectedChallenge.challenge_text, null, 2)}
                </p>
                {(() => {
                  const rev = revised.find((r) => r.agent === selectedChallenge.target);
                  if (!rev) return null;
                  const before = parseConfidence(rev.original?.analysis?.confidence, 0.5);
                  const after = parseConfidence(rev.revised_analysis?.confidence, before);
                  return (
                    <div className="rounded-lg bg-[var(--color-bg-muted)] p-3 text-sm">
                      <p className="text-xs text-[var(--color-accent)]">
                        Defense: {formatConfidence(before)} → {formatConfidence(after)}
                      </p>
                      <p className="mt-1">{String(rev.revised_analysis?.revised_hypothesis || rev.revised_analysis?.key_claim || '')}</p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Select a challenge to see the defense response.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
