import { useAnalysisStore } from '../../store/analysisStore';
import { DerivedMetrics } from '../stage1/DerivedMetrics';
import { ProfileMetadataPanel } from '../stage1/ProfileMetadataPanel';
import { TimeSeriesCharts } from '../stage1/TimeSeriesCharts';
import { PostSampleTable } from '../stage1/PostSampleTable';
import { DebateCouncilPanel } from '../stage2/DebateCouncilPanel';
import { StateVector } from '../stage3/StateVector';
import { PhasePortraitCanvas } from '../stage3/PhasePortraitCanvas';
import { StrainCards } from '../stage3/StrainCards';
import { MonteCarloCharts } from '../stage3/MonteCarloCharts';
import { FutureNarrative } from '../stage3/FutureNarrative';
import { ProjectionPhasePanel } from '../stage3/ProjectionPhasePanel';
import { ConsolidatedReportView } from '../report/ConsolidatedReportView';
import { ErrorConsole } from './ErrorConsole';
import { PipelineProvenance } from './PipelineProvenance';
import { SubstepDetailPanel } from './SubstepDetailPanel';

const DETAIL_TABS = [
  { id: 'live' as const, label: 'Live' },
  { id: 'report' as const, label: 'Full Report' },
  { id: 'errors' as const, label: 'Error Console' },
];

export function DetailPanel() {
  const status = useAnalysisStore((s) => s.status);
  const detailPanelTab = useAnalysisStore((s) => s.detailPanelTab);
  const setDetailPanelTab = useAnalysisStore((s) => s.setDetailPanelTab);
  const errorLog = useAnalysisStore((s) => s.errorLog);
  const signalSummary = useAnalysisStore((s) => s.signalSummary);
  const signalMatrix = useAnalysisStore((s) => s.signalMatrix);
  const agentHypotheses = useAnalysisStore((s) => s.agentHypotheses);
  const challenges = useAnalysisStore((s) => s.challenges);
  const revisedHypotheses = useAnalysisStore((s) => s.revisedHypotheses);
  const personaModel = useAnalysisStore((s) => s.personaModel);
  const ouParams = useAnalysisStore((s) => s.ouParams);
  const phasePortrait = useAnalysisStore((s) => s.phasePortrait);
  const beliefStrains = useAnalysisStore((s) => s.beliefStrains);
  const futureState = useAnalysisStore((s) => s.futureState);
  const futureNarrative = useAnalysisStore((s) => s.futureNarrative);
  const derivedSignals = useAnalysisStore((s) => s.derivedSignals);
  const selectedSubstepId = useAnalysisStore((s) => s.selectedSubstepId);

  const errorCount = errorLog.filter((e) => e.severity === 'error').length;
  const warningCount = errorLog.filter((e) => e.severity === 'warning').length;
  const badgeCount = errorCount + warningCount;
  const showReportTab = status === 'complete';

  const visibleTabs = DETAIL_TABS.filter((tab) => tab.id !== 'report' || showReportTab);

  const hasAnyData =
    derivedSignals ||
    agentHypotheses.length > 0 ||
    personaModel ||
    ouParams ||
    futureState;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="mb-4 flex shrink-0 gap-1 border-b border-[var(--color-border)] pb-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDetailPanelTab(tab.id)}
            className={`relative rounded-md px-3 py-1.5 text-sm transition ${
              detailPanelTab === tab.id
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
            {tab.id === 'errors' && badgeCount > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  errorCount > 0
                    ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                    : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
                }`}
              >
                {badgeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {detailPanelTab === 'errors' ? (
        <ErrorConsole />
      ) : detailPanelTab === 'report' && showReportTab ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 lg:pr-2">
          <ConsolidatedReportView />
        </div>
      ) : (
        <LivePanel
          status={status}
          hasAnyData={Boolean(hasAnyData)}
          selectedSubstepId={selectedSubstepId}
          derivedSignals={derivedSignals}
          signalSummary={signalSummary}
          signalMatrix={signalMatrix}
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
  );
}

function LivePanel({
  status,
  hasAnyData,
  selectedSubstepId,
  derivedSignals,
  signalSummary,
  signalMatrix,
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
  status: string;
  hasAnyData: boolean;
  selectedSubstepId: string | null;
  derivedSignals?: ReturnType<typeof useAnalysisStore.getState>['derivedSignals'];
  signalSummary?: ReturnType<typeof useAnalysisStore.getState>['signalSummary'];
  signalMatrix?: ReturnType<typeof useAnalysisStore.getState>['signalMatrix'];
  agentHypotheses: ReturnType<typeof useAnalysisStore.getState>['agentHypotheses'];
  challenges: ReturnType<typeof useAnalysisStore.getState>['challenges'];
  revisedHypotheses: ReturnType<typeof useAnalysisStore.getState>['revisedHypotheses'];
  personaModel?: ReturnType<typeof useAnalysisStore.getState>['personaModel'];
  ouParams?: ReturnType<typeof useAnalysisStore.getState>['ouParams'];
  phasePortrait?: ReturnType<typeof useAnalysisStore.getState>['phasePortrait'];
  beliefStrains: ReturnType<typeof useAnalysisStore.getState>['beliefStrains'];
  futureState?: ReturnType<typeof useAnalysisStore.getState>['futureState'];
  futureNarrative?: ReturnType<typeof useAnalysisStore.getState>['futureNarrative'];
}) {
  if (status === 'running' && !hasAnyData && !selectedSubstepId) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--color-text-muted)]">
        <div className="text-center">
          <div className="mb-2 text-lg">Analysis in progress...</div>
          <p className="text-sm">Live updates will appear here as each stage completes.</p>
          <p className="mt-2 text-xs">Check the Error Console tab if something fails.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden pr-1 lg:pr-2">
      {selectedSubstepId && <SubstepDetailPanel />}

      {!selectedSubstepId && (
        <>
      {(derivedSignals || agentHypotheses.length > 0 || futureState) && (
        <PipelineProvenance
          postsAnalysed={signalSummary?.posts_analysed}
          analysisPeriodDays={signalSummary?.analysis_period_days}
          agentCount={agentHypotheses.length}
          challengeCount={challenges.length}
          defenseCount={revisedHypotheses.length}
          monteCarloSims={futureState?.simulation_audit?.n_simulations}
          monteCarloMs={futureState?.simulation_audit?.elapsed_ms}
          ouR2={futureState?.simulation_audit?.ou_r_squared ?? ouParams?.r_squared}
        />
      )}

      {derivedSignals && (
        <div className="space-y-6">
          {signalSummary?.enrichment && <ProfileMetadataPanel enrichment={signalSummary.enrichment} />}
          <DerivedMetrics signals={derivedSignals} postsAnalysed={signalSummary?.posts_analysed} />
          {(signalMatrix || signalSummary) && (
            <TimeSeriesCharts matrix={signalMatrix} summary={signalSummary} derived={derivedSignals} />
          )}
          {signalSummary && (
            <PostSampleTable samples={signalSummary.post_samples} enrichment={signalSummary.enrichment} />
          )}
        </div>
      )}

      {agentHypotheses.length > 0 && (
        <DebateCouncilPanel
          hypotheses={agentHypotheses}
          challenges={challenges}
          revised={revisedHypotheses}
          persona={personaModel}
        />
      )}

      {(ouParams || phasePortrait || beliefStrains.length > 0 || futureState) && (
        <div className="space-y-6">
          <ProjectionPhasePanel
            ouParams={ouParams}
            persona={personaModel}
            derived={derivedSignals}
            future={futureState}
            narrative={futureNarrative}
            postsAnalysed={signalSummary?.posts_analysed}
          />
          {personaModel && (
            <StateVector state={personaModel.current_state} behavioralState={futureState?.behavioral_state} />
          )}
          {ouParams && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <h3 className="mb-2 text-lg">OU Model Fit</h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                R² = <span className="text-[var(--color-accent)]">{ouParams.r_squared.toFixed(3)}</span>
                {ouParams.fit_method && (
                  <> · Method: {ouParams.fit_method} ({ouParams.n_observations ?? '?'} state points)</>
                )}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                {ouParams.x_star.map((v, i) => (
                  <div key={i} className="rounded bg-[var(--color-bg-elevated)] p-2">
                    x*[{i}]: {v.toFixed(3)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {phasePortrait && <PhasePortraitCanvas portrait={phasePortrait} />}
          {beliefStrains.length > 0 && <StrainCards strains={beliefStrains} />}
          {futureState && <MonteCarloCharts future={futureState} />}
          {futureNarrative && <FutureNarrative narrative={futureNarrative} />}
        </div>
      )}
        </>
      )}
    </div>
  );
}
