import { X, Loader2 } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';
import { explainSubstep } from '../../lib/substepExplain';
import { AGENT_LABELS } from '../../types/report';
import { formatConfidence, formatEvidence, parseConfidence } from '../../lib/utils';
import { DerivedMetrics } from '../stage1/DerivedMetrics';
import { ProfileMetadataPanel } from '../stage1/ProfileMetadataPanel';
import { EngagementDepthPanel } from '../stage1/EngagementDepthPanel';
import { AgentCouncilIntroPanel } from '../stage2/AgentCouncilIntroPanel';
import { AgentCouncil } from '../stage2/AgentCouncil';
import { SignalMatrixFlow } from '../stage1/SignalMatrixFlow';
import { SignalSummaryFlow } from '../stage1/SignalSummaryFlow';
import { Round1LivePanel } from '../stage2/Round1LivePanel';
import { Round2LivePanel } from '../stage2/Round2LivePanel';
import { Round3LivePanel } from '../stage2/Round3LivePanel';
import { SynthesisPanel } from '../stage2/SynthesisPanel';
import { Stage3SubstepView } from '../stage3/Stage3SubstepView';
import { StateVector } from '../stage3/StateVector';
import { PhasePortraitCanvas } from '../stage3/PhasePortraitCanvas';
import { StrainCards } from '../stage3/StrainCards';
import { MonteCarloCharts } from '../stage3/MonteCarloCharts';
import { FutureNarrative } from '../stage3/FutureNarrative';
import type { AgentHypothesis, Challenge, ChallengeEvaluation, PersonalR0Estimate, RevisedHypothesis, SubstepState } from '../../types/report';

const CANONICAL_S3 = new Set(['s3_state', 's3_ou', 's3_portrait', 's3_strains', 's3_monte', 's3_narrative']);

function findSubstep(stages: ReturnType<typeof useAnalysisStore.getState>['stages'], id: string | null): SubstepState | null {
  if (!id) return null;
  for (const stage of Object.values(stages)) {
    if (stage.substeps[id]) return stage.substeps[id];
  }
  return null;
}

export function SubstepDetailPanel() {
  const selectedSubstepId = useAnalysisStore((s) => s.selectedSubstepId);
  const setSelectedSubstep = useAnalysisStore((s) => s.setSelectedSubstep);
  const stages = useAnalysisStore((s) => s.stages);
  const signalSummary = useAnalysisStore((s) => s.signalSummary);
  const signalMatrix = useAnalysisStore((s) => s.signalMatrix);
  const derivedSignals = useAnalysisStore((s) => s.derivedSignals);
  const agentHypotheses = useAnalysisStore((s) => s.agentHypotheses);
  const challenges = useAnalysisStore((s) => s.challenges);
  const revisedHypotheses = useAnalysisStore((s) => s.revisedHypotheses);
  const personaModel = useAnalysisStore((s) => s.personaModel);
  const ouParams = useAnalysisStore((s) => s.ouParams);
  const phasePortrait = useAnalysisStore((s) => s.phasePortrait);
  const beliefStrains = useAnalysisStore((s) => s.beliefStrains);
  const futureState = useAnalysisStore((s) => s.futureState);
  const futureNarrative = useAnalysisStore((s) => s.futureNarrative);

  const sub = findSubstep(stages, selectedSubstepId);
  if (!sub) return null;

  const meta = explainSubstep(sub.id);
  const defenseSubstep = findSubstep(stages, 's2_defense');

  if (sub.id === 's2_agents') {
    const hyps =
      (sub.payload?.hypotheses as AgentHypothesis[] | undefined) ?? agentHypotheses;
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{meta.did}</p>
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <AgentCouncilIntroPanel hypotheses={hyps} />
      </div>
    );
  }

  if (sub.id === 's2_challenge') {
    const hyps =
      (sub.payload?.hypotheses as AgentHypothesis[] | undefined) ?? agentHypotheses;
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{meta.did}</p>
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Round1LivePanel
          hypotheses={hyps}
          challenges={challenges}
          challengeSubstep={sub}
        />
      </div>
    );
  }

  if (sub.id === 's2_defense') {
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{meta.did}</p>
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Round2LivePanel
          hypotheses={agentHypotheses}
          challenges={challenges}
          revised={revisedHypotheses}
          defenseSubstep={defenseSubstep ?? sub}
        />
      </div>
    );
  }

  if (sub.id === 's2_persona' && personaModel) {
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-lg border border-white/50 bg-white/60 p-2 text-[var(--color-text-muted)] backdrop-blur-sm hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SynthesisPanel persona={personaModel} />
      </div>
    );
  }

  if (sub.id === 's2_synthesis') {
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{meta.did}</p>
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Round3LivePanel
          hypotheses={agentHypotheses}
          challenges={challenges}
          revised={revisedHypotheses}
          persona={personaModel}
          synthesisSubstep={sub}
        />
      </div>
    );
  }

  if (sub.id.startsWith('s3_') && CANONICAL_S3.has(sub.id)) {
    return (
      <div className="mb-6 min-w-0 w-full">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedSubstep(null)}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            title="Show all pipeline data"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <Stage3SubstepView
          substepId={sub.id}
          personaModel={personaModel}
          ouParams={ouParams}
          phasePortrait={phasePortrait}
          beliefStrains={beliefStrains}
          futureState={futureState}
          futureNarrative={futureNarrative}
          derivedSignals={derivedSignals}
          postsAnalysed={signalSummary?.posts_analysed}
          payload={sub.payload}
        />
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-bg-elevated)] shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <p className="section-eyebrow-accent">
            Stage {sub.stage} · {sub.status}
          </p>
          <h3 className="text-lg">{sub.label || meta.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{meta.did}</p>
          {sub.message && sub.status === 'running' && (
            <p className="mt-2 flex items-center gap-2 text-xs text-[var(--color-accent)]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {sub.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedSubstep(null)}
          className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          title="Show all pipeline data"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {sub.status === 'pending' && (
          <p className="text-sm text-[var(--color-text-muted)]">This step has not started yet.</p>
        )}
        {sub.status === 'error' && (
          <p className="text-sm text-[var(--color-danger)]">{sub.message || 'This step failed.'}</p>
        )}
        {(sub.status === 'complete' || sub.status === 'running') && (
          <SubstepContent
            sub={sub}
            signalSummary={signalSummary}
            signalMatrix={signalMatrix}
            derivedSignals={derivedSignals}
            agentHypotheses={agentHypotheses}
            challenges={challenges}
            revisedHypotheses={revisedHypotheses}
            personaModel={personaModel}
            ouParams={ouParams}
            phasePortrait={phasePortrait}
            beliefStrains={beliefStrains}
            futureState={futureState}
            futureNarrative={futureNarrative}
          />
        )}
      </div>
    </div>
  );
}

function SubstepContent({
  sub,
  signalSummary,
  signalMatrix,
  derivedSignals,
  agentHypotheses,
  challenges,
  revisedHypotheses,
  personaModel,
  ouParams,
  phasePortrait,
  beliefStrains,
  futureState,
  futureNarrative,
}: {
  sub: SubstepState;
  signalSummary?: ReturnType<typeof useAnalysisStore.getState>['signalSummary'];
  signalMatrix?: ReturnType<typeof useAnalysisStore.getState>['signalMatrix'];
  derivedSignals?: ReturnType<typeof useAnalysisStore.getState>['derivedSignals'];
  agentHypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revisedHypotheses: RevisedHypothesis[];
  personaModel?: ReturnType<typeof useAnalysisStore.getState>['personaModel'];
  ouParams?: ReturnType<typeof useAnalysisStore.getState>['ouParams'];
  phasePortrait?: ReturnType<typeof useAnalysisStore.getState>['phasePortrait'];
  beliefStrains: PersonalR0Estimate[];
  futureState?: ReturnType<typeof useAnalysisStore.getState>['futureState'];
  futureNarrative?: ReturnType<typeof useAnalysisStore.getState>['futureNarrative'];
}) {
  const p = sub.payload ?? {};

  switch (sub.id) {
    case 's1_resolve':
      return (
        <StatGrid items={[{ label: 'Username', value: String(p.username ?? '—') }]} />
      );

    case 's1_metadata':
      return (
        <div className="space-y-4">
          <StatGrid
            items={[
              { label: 'Followers', value: p.follower_count != null ? Number(p.follower_count).toLocaleString() : '—' },
              { label: 'Following', value: p.following_count != null ? Number(p.following_count).toLocaleString() : '—' },
              { label: 'Total posts', value: p.media_count != null ? String(p.media_count) : '—' },
              { label: 'Verified', value: p.is_verified ? 'Yes' : 'No' },
            ]}
          />
          {p.bio != null && String(p.bio).length > 0 && (
            <div className="rounded-lg bg-[var(--color-bg-muted)] p-3 text-sm">
              <span className="text-xs text-[var(--color-text-muted)]">Bio</span>
              <p className="mt-1">{String(p.bio)}</p>
            </div>
          )}
          {signalSummary?.enrichment && <ProfileMetadataPanel enrichment={signalSummary.enrichment} />}
        </div>
      );

    case 's1_posts': {
      const fr = p.fetch_report as Record<string, unknown> | undefined;
      return (
        <div className="space-y-4">
          <StatGrid
            items={[
              { label: 'Posts collected', value: String(p.posts_analysed ?? signalMatrix?.captions.length ?? '—') },
              { label: 'Pages scanned', value: String(p.pages_scanned ?? fr?.pages_scanned ?? '—') },
              { label: 'Clips added', value: String(fr?.clips_added ?? '—') },
            ]}
          />
          {fr?.under_collected && (
            <p className="text-xs text-[var(--color-warning)]">
              Profile lists {String(fr.expected_media_count)} total posts — collection may be incomplete.
            </p>
          )}
          {sub.message && (
            <OutcomeLine text={sub.message.replace(/\s+via\s+[\w_]+/gi, '')} />
          )}
        </div>
      );
    }

    case 's1_stories':
      return (
        <StatGrid
          items={[
            { label: 'Active stories', value: String(p.stories ?? '—') },
            { label: 'Highlights', value: String(p.highlights ?? '—') },
          ]}
        />
      );

    case 's1_engagement':
      return (
        <EngagementDepthPanel
          enrichment={signalSummary?.enrichment}
          payload={p}
        />
      );

    case 's1_matrix':
      return signalMatrix && derivedSignals ? (
        <SignalMatrixFlow matrix={signalMatrix} summary={signalSummary} derived={derivedSignals} />
      ) : (
        <PayloadPreview payload={p} />
      );

    case 's1_derived':
      return derivedSignals ? (
        <DerivedMetrics signals={derivedSignals} postsAnalysed={signalSummary?.posts_analysed} />
      ) : (
        <PayloadPreview payload={p} />
      );

    case 's1_summary':
      return signalSummary ? (
        <SignalSummaryFlow summary={signalSummary} />
      ) : (
        <PayloadPreview payload={p} />
      );

    case 's2_defense':
      return (
        <div className="space-y-4">
          <OutcomeLine text={`${revisedHypotheses.length || Number(p.count) || 0} agents revised their positions.`} />
          {revisedHypotheses.map((r) => (
            <DefenseCard key={r.agent} revised={r} />
          ))}
        </div>
      );

    case 's2_synthesis':
      return (
        <Round3LivePanel
          hypotheses={agentHypotheses}
          challenges={challenges}
          revised={revisedHypotheses}
          persona={personaModel}
          synthesisSubstep={sub}
        />
      );

    case 's2_persona':
      return personaModel ? <SynthesisPanel persona={personaModel} /> : <PayloadPreview payload={p} />;

    case 's3_state':
      return (
        <div className="space-y-4">
          <StatGrid
            items={[
              { label: 'State dimensions', value: String(p.dimensions ?? 6) },
              { label: 'History points', value: String(p.points ?? '—') },
            ]}
          />
          {personaModel && (
            <StateVector state={personaModel.current_state} behavioralState={futureState?.behavioral_state} />
          )}
        </div>
      );

    case 's3_ou':
      return ouParams ? (
        <div className="space-y-3">
          <StatGrid
            items={[
              { label: 'R² fit', value: ouParams.r_squared.toFixed(4) },
              { label: 'Method', value: ouParams.fit_method ?? '—' },
              { label: 'Observations', value: String(ouParams.n_observations ?? '—') },
            ]}
          />
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {ouParams.x_star.map((v, i) => (
              <div key={i} className="rounded bg-[var(--color-bg-muted)] p-2">
                Baseline [{i}]: {v.toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <PayloadPreview payload={p} />
      );

    case 's3_portrait':
      return phasePortrait ? <PhasePortraitCanvas portrait={phasePortrait} /> : <PayloadPreview payload={p} />;

    case 's3_strains': {
      const strains = (p.strains as PersonalR0Estimate[]) ?? beliefStrains;
      return strains.length > 0 ? (
        <div className="space-y-3">
          <OutcomeLine text={`${strains.length} narrative themes discovered from this profile.`} />
          <StrainCards strains={strains} />
        </div>
      ) : (
        <PayloadPreview payload={p} />
      );
    }

    case 's3_monte':
      return futureState ? <MonteCarloCharts future={futureState} /> : <PayloadPreview payload={p} />;

    case 's3_narrative':
      return futureNarrative ? (
        <FutureNarrative narrative={futureNarrative} futureState={futureState} />
      ) : (
        <PayloadPreview payload={p} />
      );

    default:
      break;
  }

  if (sub.id.startsWith('s2_agent_')) {
    const agentId = sub.id.replace('s2_agent_', '');
    const hyp =
      agentHypotheses.find((h) => h.agent === agentId) ??
      (p.hypothesis as AgentHypothesis | undefined);
    if (hyp) {
      return <AgentCouncil hypotheses={[hyp]} roundLabel={`${AGENT_LABELS[agentId] || agentId} — hypothesis`} />;
    }
  }

  if (sub.id.startsWith('s2_ch_')) {
    const ch = sub.payload as unknown as Challenge;
    if (ch?.challenger) return <ChallengeList items={[ch]} />;
  }

  if (sub.id.startsWith('s2_defense_')) {
    const agentId = sub.id.replace('s2_defense_', '');
    const rev = revisedHypotheses.find((r) => r.agent === agentId) ?? (sub.payload as unknown as RevisedHypothesis);
    if (rev?.agent) return <DefenseCard revised={rev} />;
  }

  if (sub.id.startsWith('s3_strain_')) {
    const strain =
      beliefStrains.find((s) => `s3_strain_${s.strain_type}` === sub.id) ??
      (sub.payload as unknown as PersonalR0Estimate);
    if (strain?.strain_type) return <StrainCards strains={[strain]} />;
  }

  return <PayloadPreview payload={p} />;
}

function StatGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-lg bg-[var(--color-bg-muted)] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
          <div className="mt-0.5 font-medium text-[var(--color-accent)]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function OutcomeLine({ text }: { text: string }) {
  return <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2 text-sm">{text}</p>;
}

function ChallengeList({ items, limit = 20 }: { items: Challenge[]; limit?: number }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-text-muted)]">No challenges yet.</p>;
  return (
    <div className="max-h-80 space-y-1 overflow-y-auto">
      {items.slice(0, limit).map((ch, i) => (
        <details key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <summary className="cursor-pointer px-3 py-2 text-sm">
            <span className="text-[var(--color-danger)]">{AGENT_LABELS[ch.challenger] || ch.challenger}</span>
            <span className="text-[var(--color-text-muted)]"> → </span>
            {AGENT_LABELS[ch.target] || ch.target}
          </summary>
          <p className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            {typeof ch.challenge_text === 'string' ? ch.challenge_text : JSON.stringify(ch.challenge_text, null, 2)}
          </p>
        </details>
      ))}
    </div>
  );
}

function DefenseCard({ revised: r }: { revised: RevisedHypothesis }) {
  const before = parseConfidence(r.original?.analysis?.confidence, 0.5);
  const after = parseConfidence(r.revised_analysis?.confidence, before);
  const claim = String(r.revised_analysis?.revised_hypothesis || r.revised_analysis?.key_claim || '');
  const evaluations = Array.isArray(r.revised_analysis?.challenge_evaluations)
    ? (r.revised_analysis.challenge_evaluations as ChallengeEvaluation[])
    : [];
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium">{AGENT_LABELS[r.agent] || r.agent}</span>
        <span className="text-xs text-[var(--color-accent)]">
          {formatConfidence(before)} → {formatConfidence(after)}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{claim}</p>
      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        {evaluations.length > 0
          ? `${evaluations.filter((e) => e.verdict === 'accept').length} accepted · ${evaluations.filter((e) => e.verdict === 'partial').length} partial · ${evaluations.filter((e) => e.verdict === 'reject').length} rejected`
          : `Addressed ${r.challenges_received?.length ?? 0} challenges`}
      </p>
      {typeof r.revised_analysis?.confidence_rationale === 'string' && (
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{r.revised_analysis.confidence_rationale}</p>
      )}
      {r.revised_analysis?.evidence != null && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{formatEvidence(r.revised_analysis.evidence)}</p>
      )}
    </div>
  );
}

function PayloadPreview({ payload }: { payload: Record<string, unknown> }) {
  if (!payload || Object.keys(payload).length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">Waiting for step output…</p>;
  }
  const preview = JSON.stringify(payload, null, 2);
  const trimmed = preview.length > 4000 ? `${preview.slice(0, 4000)}\n…` : preview;
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--color-bg-muted)] p-3 text-[10px] text-[var(--color-text-muted)]">
      {trimmed}
    </pre>
  );
}
