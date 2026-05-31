import { AlertTriangle, Download, Copy, FileText } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';
import { formatPercent, reportToMarkdown } from '../../lib/utils';
import { downloadInteractiveReport } from '../../lib/exportInteractiveReport';
import { DerivedMetrics } from '../stage1/DerivedMetrics';
import { ProfileMetadataPanel } from '../stage1/ProfileMetadataPanel';
import { TimeSeriesCharts } from '../stage1/TimeSeriesCharts';
import { PostSampleTable } from '../stage1/PostSampleTable';
import { DebateCouncilPanel } from '../stage2/DebateCouncilPanel';
import { SynthesisPanel } from '../stage2/SynthesisPanel';
import { StateVector } from '../stage3/StateVector';
import { PhasePortraitCanvas } from '../stage3/PhasePortraitCanvas';
import { StrainCards } from '../stage3/StrainCards';
import { MonteCarloCharts } from '../stage3/MonteCarloCharts';
import { FutureNarrative } from '../stage3/FutureNarrative';
import { ProjectionPhasePanel } from '../stage3/ProjectionPhasePanel';

import { ErrorConsole } from '../pipeline/ErrorConsole';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'signals', label: 'Signals' },
  { id: 'debate', label: 'Debate Council' },
  { id: 'persona', label: 'Persona Model' },
  { id: 'future', label: 'Future State' },
  { id: 'math', label: 'Mathematics' },
  { id: 'errors', label: 'Error Console' },
];

export function ReportShell() {
  const report = useAnalysisStore((s) => s.report);
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);
  const derivedSignals = useAnalysisStore((s) => s.derivedSignals);
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
  const errorLog = useAnalysisStore((s) => s.errorLog);

  if (!report && !derivedSignals) return null;

  const handleDownloadInteractive = () => {
    if (!report) return;
    downloadInteractiveReport({
      report,
      derivedSignals,
      signalSummary,
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

  const handleCopyMarkdown = () => {
    if (!report) return;
    navigator.clipboard.writeText(reportToMarkdown(report));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)]/90 backdrop-blur-md">
        {report?.ethical_flags && report.ethical_flags.length > 0 && (
          <EthicalFlags flags={report.ethical_flags} />
        )}

        <div className="flex items-center justify-between gap-4 px-1 py-3">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
                  activeTab === tab.id
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
                {tab.id === 'errors' && errorLog.length > 0 && (
                  <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-danger)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-danger)]">
                    {errorLog.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadInteractive}
              className="flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-accent)] shadow-sm transition hover:bg-[var(--color-accent-dim)]"
            >
              <FileText className="h-3.5 w-3.5" /> Interactive Report
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-muted)]"
            >
              <Copy className="h-3 w-3" /> Copy summary
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-muted)]"
            >
              <Download className="h-3 w-3" /> Raw JSON
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        {activeTab === 'overview' && report && <OverviewTab report={report} />}
        {activeTab === 'signals' && derivedSignals && (
          <div className="space-y-6">
            {signalSummary?.enrichment && <ProfileMetadataPanel enrichment={signalSummary.enrichment} />}
            <DerivedMetrics signals={derivedSignals} postsAnalysed={signalSummary?.posts_analysed ?? report?.posts_analysed} />
            <TimeSeriesCharts matrix={signalMatrix} summary={signalSummary} derived={derivedSignals} />
            {signalSummary && (
              <PostSampleTable samples={signalSummary.post_samples} enrichment={signalSummary.enrichment} />
            )}
          </div>
        )}
        {activeTab === 'debate' && agentHypotheses.length > 0 && (
          <DebateCouncilPanel
            hypotheses={agentHypotheses}
            challenges={challenges}
            revised={revisedHypotheses}
            persona={personaModel}
          />
        )}
        {activeTab === 'persona' && personaModel && <SynthesisPanel persona={personaModel} />}
        {activeTab === 'future' && (
          <div className="space-y-6">
            <ProjectionPhasePanel
              ouParams={ouParams}
              persona={personaModel}
              derived={derivedSignals}
              future={futureState}
              narrative={futureNarrative}
              postsAnalysed={signalSummary?.posts_analysed ?? report?.posts_analysed}
            />
            {personaModel && (
              <StateVector state={personaModel.current_state} behavioralState={futureState?.behavioral_state} />
            )}
            {beliefStrains.length > 0 && <StrainCards strains={beliefStrains} />}
            {futureState && <MonteCarloCharts future={futureState} />}
            {futureNarrative && <FutureNarrative narrative={futureNarrative} />}
          </div>
        )}
        {activeTab === 'math' && (
          <div className="space-y-6">
            {ouParams && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                <h3 className="mb-3 text-xl">OU Parameters</h3>
                <p>R² = {ouParams.r_squared.toFixed(4)}</p>
                <pre className="mt-2 overflow-x-auto text-xs text-[var(--color-text-muted)]">
                  x* = {JSON.stringify(ouParams.x_star.map((v) => v.toFixed(3)))}
                </pre>
              </div>
            )}
            {phasePortrait && <PhasePortraitCanvas portrait={phasePortrait} />}
            {beliefStrains.length > 0 && <StrainCards strains={beliefStrains} />}
          </div>
        )}
        {activeTab === 'errors' && <ErrorConsole />}
      </div>
    </div>
  );
}

function OverviewTab({ report }: { report: NonNullable<ReturnType<typeof useAnalysisStore.getState>['report']> }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
        <h2 className="mb-1 text-3xl">@{report.username}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{report.profile_url}</p>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Posts analysed" value={String(report.posts_analysed)} />
          <Stat label="Analysis period" value={`${report.analysis_period_days}d`} />
          <Stat label="Data quality" value={formatPercent(report.data_quality_score)} />
          <Stat label="Model R²" value={report.model_fit_r_squared.toFixed(3)} />
        </div>
      </div>

      {report.persona_model?.key_insight && (
        <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-6">
          <h3 className="mb-2 text-lg text-[var(--color-accent)]">Key Insight</h3>
          <p>{report.persona_model.key_insight}</p>
        </div>
      )}

      <QualityBar report={report} />
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

function QualityBar({ report }: { report: NonNullable<ReturnType<typeof useAnalysisStore.getState>['report']> }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h4 className="mb-3 text-sm font-medium">Projection Confidence by Horizon</h4>
      <div className="flex gap-4">
        {Object.entries(report.projection_confidence).map(([h, conf]) => (
          <div key={h} className="text-center">
            <div className="text-xs text-[var(--color-text-muted)]">T+{h}d</div>
            <div className="text-lg">{formatPercent(conf)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EthicalFlags({ flags }: { flags: string[] }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5 px-4 py-2 text-xs text-[var(--color-warning)]">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {flags.map((f) => f.replace(/_/g, ' ')).join(' · ')}
    </div>
  );
}
