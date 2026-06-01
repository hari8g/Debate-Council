import { CheckCircle2, Circle, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { rerunPipelineStage } from '../../lib/analysisStreamManager';
import { getDemoHighlight, rerunDemoStage, isDemoReplayActive, subscribeDemoCallout } from '../../demo/demoRunner';
import type { DemoHighlight } from '../../demo/demoCallouts';
import { useAnalysisStore } from '../../store/analysisStore';
import type { SubstepStatus } from '../../types/report';
import { cn } from '../../lib/utils';

export const SUBSTEP_ORDER: Record<number, string[]> = {
  1: ['s1_resolve', 's1_metadata', 's1_posts', 's1_stories', 's1_engagement', 's1_matrix', 's1_derived', 's1_summary'],
  2: ['s2_agents', 's2_challenge', 's2_defense', 's2_synthesis', 's2_persona'],
  3: ['s3_state', 's3_ou', 's3_portrait', 's3_strains', 's3_monte', 's3_narrative'],
};

const CANONICAL_IDS = new Set(Object.values(SUBSTEP_ORDER).flat());

const STAGE_RERUN_HINT: Record<number, string> = {
  1: 'Re-fetch profile, posts, and signal matrix',
  2: 'Re-run the six-agent debate council',
  3: 'Re-run projection, Monte Carlo, and narrative',
};

function sortSubsteps(substeps: Record<string, import('../../types/report').SubstepState>) {
  const stage = Object.values(substeps)[0]?.stage ?? 1;
  const order = SUBSTEP_ORDER[stage] ?? [];
  return Object.values(substeps)
    .filter((s) => CANONICAL_IDS.has(s.id))
    .sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.id.localeCompare(b.id);
    });
}

function timelineMessage(sub: import('../../types/report').SubstepState): string | undefined {
  if (sub.status !== 'running' || !sub.message) return undefined;
  if (sub.id === 's1_posts') {
    return sub.message.replace(/\s+via\s+[\w_]+/gi, '');
  }
  return sub.message;
}

function StatusIcon({ status }: { status: SubstepStatus }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-[var(--color-danger)]" />;
    default:
      return <Circle className="h-4 w-4 text-[var(--color-border)]" />;
  }
}

function canRerunStage(
  stageNum: number,
  stages: ReturnType<typeof useAnalysisStore.getState>['stages'],
  personaModel: ReturnType<typeof useAnalysisStore.getState>['personaModel'],
  globalStatus: string,
): boolean {
  if (globalStatus === 'running') return false;
  const stage = stages[stageNum];
  if (!stage || (stage.status !== 'complete' && stage.status !== 'error')) return false;
  if (stageNum === 1) return true;
  if (stageNum === 2) return stages[1]?.status === 'complete';
  if (stageNum === 3) return stages[2]?.status === 'complete' && !!personaModel;
  return false;
}

function demoSpotlightClass(highlight: DemoHighlight | null, stageNum: number, substepId?: string): string {
  if (!highlight) return '';
  if (highlight.mode === 'stage' && highlight.stage === stageNum) {
    return 'demo-spotlight-stage';
  }
  if (highlight.mode === 'stage_done' && highlight.stage === stageNum) {
    return 'demo-spotlight-stage-done';
  }
  if (substepId && highlight.substepId === substepId) {
    if (highlight.mode === 'up_next') return 'demo-spotlight-up-next';
    if (highlight.mode === 'review') return 'demo-spotlight-review';
    if (highlight.mode === 'running') return 'demo-spotlight-running';
  }
  return '';
}

export function PipelineTimeline() {
  const stages = useAnalysisStore((s) => s.stages);
  const selectedSubstepId = useAnalysisStore((s) => s.selectedSubstepId);
  const setSelectedSubstep = useAnalysisStore((s) => s.setSelectedSubstep);
  const setDetailPanelTab = useAnalysisStore((s) => s.setDetailPanelTab);
  const status = useAnalysisStore((s) => s.status);
  const startedAt = useAnalysisStore((s) => s.startedAt);
  const rerunningStage = useAnalysisStore((s) => s.rerunningStage);
  const personaModel = useAnalysisStore((s) => s.personaModel);
  const isDemoMode = useAnalysisStore((s) => s.isDemoMode);

  const [highlight, setHighlight] = useState<DemoHighlight | null>(null);
  const scrollRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isDemoMode) {
      setHighlight(null);
      return;
    }
    const sync = () => setHighlight(getDemoHighlight());
    sync();
    return subscribeDemoCallout(sync);
  }, [isDemoMode]);

  useEffect(() => {
    if (!highlight?.substepId) return;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlight?.substepId, highlight?.mode]);

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const demoBusy = isDemoMode && isDemoReplayActive();

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <h2 className="text-lg font-semibold tracking-tight">Pipeline</h2>
        {status === 'running' && (
          <span className="text-xs text-[var(--color-text-muted)]">
            {rerunningStage ? `Rerunning stage ${rerunningStage}…` : `${elapsed}s elapsed`}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {Object.values(stages)
          .sort((a, b) => a.stage - b.stage)
          .map((stage) => {
            const showRerun = canRerunStage(stage.stage, stages, personaModel, status) && !demoBusy;
            return (
              <div key={stage.stage} className={cn(demoSpotlightClass(highlight, stage.stage))} data-stage={stage.stage}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusIcon status={stage.status} />
                    <span className="truncate text-sm font-semibold tracking-tight">
                      Stage {stage.stage}: {stage.title || `Stage ${stage.stage}`}
                    </span>
                  </div>
                  {showRerun && (
                    <button
                      type="button"
                      title={STAGE_RERUN_HINT[stage.stage]}
                      onClick={() => (isDemoMode ? rerunDemoStage(stage.stage) : rerunPipelineStage(stage.stage))}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rerun
                    </button>
                  )}
                </div>
                {stage.description && (
                  <p className="mb-3 ml-6 text-xs text-[var(--color-text-muted)]">{stage.description}</p>
                )}
                <div className="ml-3 space-y-1 border-l border-[var(--color-border)] pl-4">
                  {sortSubsteps(stage.substeps).map((sub) => {
                    const spotlight = demoSpotlightClass(highlight, stage.stage, sub.id);
                    const isSpotlight = spotlight.length > 0;
                    return (
                    <button
                      key={sub.id}
                      ref={isSpotlight ? scrollRef : undefined}
                      data-substep-id={sub.id}
                      type="button"
                      onClick={() => {
                        if (sub.status === 'error') {
                          setDetailPanelTab('errors');
                          setSelectedSubstep(sub.id);
                        } else if (sub.status === 'complete' || sub.status === 'running') {
                          setDetailPanelTab('live');
                          setSelectedSubstep(sub.id);
                        }
                      }}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
                        selectedSubstepId === sub.id && 'bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/20',
                        spotlight,
                        (sub.status === 'complete' || sub.status === 'error' || sub.status === 'running') &&
                          'cursor-pointer hover:bg-[var(--color-bg-elevated)]',
                        sub.status === 'error' && 'text-[var(--color-danger)]',
                      )}
                    >
                      <StatusIcon status={sub.status} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{sub.label}</div>
                        {isSpotlight && highlight?.mode === 'up_next' && (
                          <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Up next in demo</div>
                        )}
                        {isSpotlight && highlight?.mode === 'review' && (
                          <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Review output →</div>
                        )}
                        {timelineMessage(sub) && (
                          <div className="truncate text-xs text-[var(--color-text-muted)]">{timelineMessage(sub)}</div>
                        )}
                        {sub.percent != null && sub.status === 'running' && (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
                            <div
                              className="h-full bg-[var(--color-accent)] transition-all"
                              style={{ width: `${sub.percent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
