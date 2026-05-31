import { useMemo, useState, type ReactNode } from 'react';
import type { AgentHypothesis, Challenge, PersonaModel, RevisedHypothesis } from '../../types/report';
import { AGENT_LABELS } from '../../types/report';
import { formatConfidence, parseConfidence } from '../../lib/utils';
import { revisedToHypotheses, buildConfidenceEvolution, synthesisClaimCards } from '../../lib/debateUtils';
import { DebateConfidenceSpider } from './DebateConfidenceSpider';
import { AgentCouncil } from './AgentCouncil';
import { DebateEvolutionViz } from './DebateEvolutionViz';
import { SynthesisPanel } from './SynthesisPanel';
import { confidenceColor } from '../../lib/utils';

type Round = 'round1' | 'round2' | 'round3';

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
  const [round, setRound] = useState<Round>('round1');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const rounds: { id: Round; label: string; count: number; ready: boolean }[] = [
    { id: 'round1', label: 'Round 1 — Hypotheses & Challenges', count: challenges.length, ready: hypotheses.length > 0 },
    { id: 'round2', label: 'Round 2 — Defenses', count: revised.length, ready: revised.length > 0 },
    { id: 'round3', label: 'Round 3 — Synthesis', count: persona ? 1 : 0, ready: Boolean(persona) },
  ];

  const round2Hypotheses = revisedToHypotheses(revised);
  const claimCards = persona ? synthesisClaimCards(persona) : [];
  const evolution = useMemo(
    () => buildConfidenceEvolution(hypotheses, revised, persona),
    [hypotheses, revised, persona],
  );

  const filteredChallenges =
    round === 'round1'
      ? (selectedAgent ? challenges.filter((c) => c.challenger === selectedAgent || c.target === selectedAgent) : challenges)
      : selectedAgent
        ? (revised.find((r) => r.agent === selectedAgent)?.challenges_received ?? [])
        : revised.flatMap((r) => r.challenges_received || []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xl">Multi-Agent Debate Council</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Same layout across all rounds: evolution chart, agent cards, and interaction list. Switch rounds to see how positions change.
        </p>
      </div>

      <DebateEvolutionViz
        hypotheses={hypotheses}
        challenges={challenges}
        revised={revised}
        persona={persona}
        activeRound={round}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      <div className="flex flex-wrap gap-2">
        {rounds.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setRound(r.id); setSelectedChallenge(null); }}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              round === r.id
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : r.ready
                  ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
                  : 'cursor-not-allowed text-[var(--color-text-muted)]/40'
            }`}
          >
            {r.label}
            {r.count > 0 && r.id !== 'round3' && (
              <span className="ml-1.5 rounded-full bg-[var(--color-bg-elevated)] px-1.5 text-xs">{r.count}</span>
            )}
          </button>
        ))}
      </div>

      {round === 'round1' && (
        <RoundLayout
          council={
            <AgentCouncil
              hypotheses={selectedAgent ? hypotheses.filter((h) => h.agent === selectedAgent) : hypotheses}
              roundLabel="Round 1 — Initial hypotheses"
            />
          }
          listTitle={`Cross-examinations (${filteredChallenges.length})`}
          listHint={`${hypotheses.length}×${hypotheses.length - 1} = ${hypotheses.length * (hypotheses.length - 1)} challenge calls`}
          items={filteredChallenges}
          selected={selectedChallenge}
          onSelect={setSelectedChallenge}
          renderDetail={(ch) => (
            <>
              <h5 className="mb-2 text-sm font-medium">
                {AGENT_LABELS[ch.challenger]} → {AGENT_LABELS[ch.target]}
              </h5>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                {typeof ch.challenge_text === 'string' ? ch.challenge_text : JSON.stringify(ch.challenge_text, null, 2)}
              </p>
            </>
          )}
        />
      )}

      {round === 'round2' && revised.length > 0 && (
        <>
          <DebateConfidenceSpider
            evolution={evolution}
            rounds={['round1', 'round2']}
            selectedAgent={selectedAgent}
            title="Round 1 vs Round 2 — confidence spider"
            subtitle="See how each agent's confidence shifted after defending against challenges."
          />
        <RoundLayout
          council={
            <AgentCouncil
              hypotheses={selectedAgent ? round2Hypotheses.filter((h) => h.agent === selectedAgent) : round2Hypotheses}
              roundLabel="Round 2 — Revised hypotheses after defense"
            />
          }
          listTitle={`Challenges addressed (${filteredChallenges.length})`}
          listHint="Each agent defends against incoming challenges — select to compare challenge vs revised position"
          items={filteredChallenges}
          selected={selectedChallenge}
          onSelect={setSelectedChallenge}
          renderDetail={(ch) => {
            const rev = revised.find((r) => r.agent === ch.target);
            const before = parseConfidence(rev?.original?.analysis?.confidence, 0.5);
            const after = parseConfidence(rev?.revised_analysis?.confidence, before);
            return (
              <>
                <h5 className="mb-2 text-sm font-medium">
                  {AGENT_LABELS[ch.challenger]} challenged {AGENT_LABELS[ch.target]}
                </h5>
                <p className="mb-3 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">
                  {typeof ch.challenge_text === 'string' ? ch.challenge_text : '…'}
                </p>
                {rev && (
                  <div className="rounded bg-[var(--color-bg-elevated)] p-2 text-xs">
                    <strong>Defense:</strong> {formatConfidence(before)} → {formatConfidence(after)}
                    <p className="mt-1">{String(rev.revised_analysis?.revised_hypothesis || rev.revised_analysis?.key_claim || '')}</p>
                  </div>
                )}
              </>
            );
          }}
        />
        </>
      )}

      {round === 'round3' && persona && (
        <div className="space-y-6">
          <DebateConfidenceSpider
            evolution={evolution}
            rounds={['round1', 'round2', 'round3']}
            selectedAgent={selectedAgent}
            title="Full trajectory — R1 → R2 → R3"
            subtitle="Three-layer spider showing the complete debate arc into synthesis."
          />
          <div>
            <h4 className="mb-1 text-lg">Round 3 — Synthesis claim cards</h4>
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              Same card layout as agent hypotheses — unified persona claims with per-claim confidence.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {claimCards.slice(0, 12).map((card, i) => (
                <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs uppercase text-[var(--color-text-muted)]">{card.section}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${confidenceColor(card.confidence)}`}>
                      {formatConfidence(card.confidence)}
                    </span>
                  </div>
                  <p className="text-sm">{card.claim}</p>
                  {card.evidence && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">Evidence: {card.evidence.slice(0, 120)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <SynthesisPanel persona={persona} />
        </div>
      )}

      {round === 'round3' && !persona && (
        <p className="text-sm text-[var(--color-text-muted)]">Synthesis in progress…</p>
      )}
    </div>
  );
}

function RoundLayout({
  council,
  listTitle,
  listHint,
  items,
  selected,
  onSelect,
  renderDetail,
}: {
  council: ReactNode;
  listTitle: string;
  listHint: string;
  items: Challenge[];
  selected: Challenge | null;
  onSelect: (ch: Challenge) => void;
  renderDetail: (ch: Challenge) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {council}
      <div>
        <h4 className="mb-2 text-lg">{listTitle}</h4>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">{listHint}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
            {items.map((ch, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(ch)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-[var(--color-bg-elevated)] ${
                  selected === ch ? 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/30' : ''
                }`}
              >
                <span className="text-[var(--color-danger)]">{AGENT_LABELS[ch.challenger] || ch.challenger}</span>
                <span className="text-[var(--color-text-muted)]"> → </span>
                <span>{AGENT_LABELS[ch.target] || ch.target}</span>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            {selected ? renderDetail(selected) : (
              <p className="text-sm text-[var(--color-text-muted)]">Select an item to view details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
