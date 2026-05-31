import { AlertTriangle, Copy, Download, FileText } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';
import { formatPercent, reportToMarkdown } from '../../lib/utils';
import { downloadInteractiveReport } from '../../lib/exportInteractiveReport';
import { DerivedMetrics } from '../stage1/DerivedMetrics';
import { ProfileMetadataPanel } from '../stage1/ProfileMetadataPanel';
import { TimeSeriesCharts } from '../stage1/TimeSeriesCharts';
import { PostSampleTable } from '../stage1/PostSampleTable';
import { DebateCouncilPanel } from '../stage2/DebateCouncilPanel';
import { Round3LivePanel } from '../stage2/Round3LivePanel';
import { SynthesisPanel } from '../stage2/SynthesisPanel';
import { ProjectionPhasePanel } from '../stage3/ProjectionPhasePanel';
import { StateVector } from '../stage3/StateVector';
import { PhasePortraitCanvas } from '../stage3/PhasePortraitCanvas';
import { StrainCards } from '../stage3/StrainCards';
import { MonteCarloCharts } from '../stage3/MonteCarloCharts';
import { FutureNarrative } from '../stage3/FutureNarrative';
import { PipelineProvenance } from '../pipeline/PipelineProvenance';

export function ConsolidatedReportView() {
  const report = useAnalysisStore((s) => s.report);
  const derivedSignals = useAnalysisStore((s) => s.derivedSignals);
  const signalSummaryData = useAnalysisStore((s) => s.signalSummary);
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

  if (!report && !personaModel) {
    return (
      <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Full report appears when the analysis completes.
      </p>
    );
  }

  const handleDownloadInteractive = () => {
    if (!report) return;
    downloadInteractiveReport({
      report,
      derivedSignals,
      signalSummary: signalSummaryData,
      signalMatrix,
      agentHypotheses,
      challenges,
      revisedHypotheses,
      personaModel,
      ouParams,
      beliefStrains,
      futureState,
      futureNarrative,
    });
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `northstar-${report.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow-accent">Analysis complete</p>
          <h2 className="mt-1 text-2xl">Consolidated report</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Everything in one view — signals, debate council, persona synthesis, and future projection.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadInteractive}
            disabled={!report}
            className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-accent)] shadow-sm hover:bg-[var(--color-accent-dim)] disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" /> Interactive Report
          </button>
          <button
            type="button"
            onClick={() => report && navigator.clipboard.writeText(reportToMarkdown(report))}
            disabled={!report}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
          >
            <Copy className="h-3 w-3" /> Copy summary
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            disabled={!report}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
          >
            <Download className="h-3 w-3" /> Raw JSON
          </button>
        </div>
      </div>

      {report?.ethical_flags && report.ethical_flags.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-4 py-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {report.ethical_flags.map((f) => f.replace(/_/g, ' ')).join(' · ')}
        </div>
      )}

      {report && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <h3 className="mb-1 text-3xl">@{report.username}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">{report.profile_url}</p>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Posts analysed" value={String(report.posts_analysed)} />
            <Stat label="Analysis period" value={`${report.analysis_period_days}d`} />
            <Stat label="Data quality" value={formatPercent(report.data_quality_score)} />
            <Stat label="Model R²" value={report.model_fit_r_squared.toFixed(3)} />
          </div>
          {report.persona_model?.key_insight && (
            <div className="mt-4 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-4">
              <p className="text-xs font-medium text-[var(--color-accent)]">Key insight</p>
              <p className="mt-1 text-sm">{report.persona_model.key_insight}</p>
            </div>
          )}
        </div>
      )}

      <PipelineProvenance
        postsAnalysed={signalSummaryData?.posts_analysed ?? report?.posts_analysed}
        analysisPeriodDays={signalSummaryData?.analysis_period_days ?? report?.analysis_period_days}
        agentCount={agentHypotheses.length}
        challengeCount={challenges.length}
        defenseCount={revisedHypotheses.length}
        monteCarloSims={futureState?.simulation_audit?.n_simulations}
        monteCarloMs={futureState?.simulation_audit?.elapsed_ms}
        ouR2={futureState?.simulation_audit?.ou_r_squared ?? ouParams?.r_squared}
      />

      {derivedSignals && (
        <section className="space-y-6">
          <SectionHeader title="Stage 1 — Signal extraction" subtitle="Derived metrics and temporal patterns from public posts." />
          {signalSummaryData?.enrichment && <ProfileMetadataPanel enrichment={signalSummaryData.enrichment} />}
          <DerivedMetrics signals={derivedSignals} postsAnalysed={signalSummaryData?.posts_analysed ?? report?.posts_analysed} />
          {(signalMatrix || signalSummaryData) && (
            <TimeSeriesCharts matrix={signalMatrix} summary={signalSummaryData} derived={derivedSignals} />
          )}
          {signalSummaryData && (
            <PostSampleTable samples={signalSummaryData.post_samples} enrichment={signalSummaryData.enrichment} />
          )}
        </section>
      )}

      {agentHypotheses.length > 0 && (
        <section className="space-y-6">
          <SectionHeader title="Stage 2 — Debate council" subtitle="Three-round multi-agent analysis with confidence evolution." />
          {personaModel ? (
            <Round3LivePanel
              hypotheses={agentHypotheses}
              challenges={challenges}
              revised={revisedHypotheses}
              persona={personaModel}
            />
          ) : (
            <DebateCouncilPanel
              hypotheses={agentHypotheses}
              challenges={challenges}
              revised={revisedHypotheses}
              persona={personaModel}
            />
          )}
        </section>
      )}

      {personaModel && (
        <section className="space-y-4">
          <SectionHeader title="Unified persona model" subtitle="Final synthesis from Round 3." />
          <SynthesisPanel persona={personaModel} />
        </section>
      )}

      {(ouParams || phasePortrait || beliefStrains.length > 0 || futureState) && (
        <section className="space-y-6">
          <SectionHeader title="Stage 3 — Future projection" subtitle="Dynamical modelling and forward narrative." />
          <ProjectionPhasePanel
            ouParams={ouParams}
            persona={personaModel}
            derived={derivedSignals}
            future={futureState}
            narrative={futureNarrative}
            postsAnalysed={signalSummaryData?.posts_analysed ?? report?.posts_analysed}
          />
          {personaModel && (
            <StateVector state={personaModel.current_state} behavioralState={futureState?.behavioral_state} />
          )}
          {phasePortrait && <PhasePortraitCanvas portrait={phasePortrait} />}
          {beliefStrains.length > 0 && <StrainCards strains={beliefStrains} />}
          {futureState && <MonteCarloCharts future={futureState} />}
          {futureNarrative && <FutureNarrative narrative={futureNarrative} />}
        </section>
      )}

      {report && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h4 className="mb-3 text-sm font-medium">Projection confidence by horizon</h4>
          <div className="flex flex-wrap gap-6">
            {Object.entries(report.projection_confidence).map(([h, conf]) => (
              <div key={h} className="text-center">
                <div className="text-xs text-[var(--color-text-muted)]">T+{h}d</div>
                <div className="text-xl text-[var(--color-accent)]">{formatPercent(conf)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-xl">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="text-xl text-[var(--color-accent)]">{value}</div>
    </div>
  );
}
