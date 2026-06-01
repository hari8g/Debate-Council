import { useEffect, useState } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { exitDemoMode, getDemoCalloutState, subscribeDemoCallout } from '../demo/demoRunner';
import { PipelineTimeline } from './pipeline/PipelineTimeline';
import { DetailPanel } from './pipeline/DetailPanel';
import { cn } from '../lib/utils';

export function AnalysisShell({
  headerExtra,
  topSlot,
}: {
  headerExtra?: React.ReactNode;
  topSlot?: React.ReactNode;
}) {
  const status = useAnalysisStore((s) => s.status);
  const error = useAnalysisStore((s) => s.error);
  const errorLog = useAnalysisStore((s) => s.errorLog);
  const isDemoMode = useAnalysisStore((s) => s.isDemoMode);
  const setDetailPanelTab = useAnalysisStore((s) => s.setDetailPanelTab);
  const reset = useAnalysisStore((s) => s.reset);

  const [calloutWaiting, setCalloutWaiting] = useState(false);

  useEffect(() => {
    if (!isDemoMode) {
      setCalloutWaiting(false);
      return;
    }
    const sync = () => setCalloutWaiting(getDemoCalloutState().waiting);
    sync();
    return subscribeDemoCallout(sync);
  }, [isDemoMode]);

  const errorCount = errorLog.length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-bg)]/90 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h1 className="side-heading text-[var(--color-text)]">North Star</h1>
          {isDemoMode && (
            <span className="rounded-full bg-gradient-to-r from-[var(--color-chart-1)]/15 to-[var(--color-chart-2)]/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-chart-2)]">
              Product demo
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {headerExtra}
          <StatusBadge status={status} />
          {status !== 'complete' && errorCount > 0 && (
            <button
              type="button"
              onClick={() => setDetailPanelTab('errors')}
              className="text-xs text-[var(--color-danger)] underline-offset-2 hover:underline"
            >
              {errorCount} issue{errorCount === 1 ? '' : 's'} — open Error Console
            </button>
          )}
          {status === 'error' && error && (
            <span className="max-w-md truncate text-xs text-[var(--color-danger)]" title={error}>
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => (isDemoMode ? exitDemoMode() : reset())}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {isDemoMode ? 'Exit demo' : 'New Analysis'}
          </button>
        </div>
      </header>

      {topSlot}

      <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(240px,22rem)_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[minmax(260px,24rem)_minmax(0,1fr)]">
        <aside
          className={cn(
            'max-h-[min(42vh,22rem)] overflow-y-auto border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/40 p-3 sm:p-4',
            'lg:sticky lg:top-0 lg:max-h-[calc(100vh-4.5rem)] lg:border-b-0 lg:border-r lg:border-[var(--color-border-subtle)]',
          )}
        >
          <PipelineTimeline />
        </aside>
        <section
          className={cn(
            'min-w-0 overflow-x-hidden bg-[var(--color-bg)] p-3 sm:p-4 lg:p-6',
            isDemoMode && calloutWaiting && 'demo-detail-spotlight',
          )}
        >
          <DetailPanel />
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: 'text-[var(--color-accent)]',
    complete: 'text-[var(--color-success)]',
    error: 'text-[var(--color-danger)]',
  };
  return (
    <span className={`text-sm capitalize ${colors[status] || ''}`}>
      {status === 'running' && '● '}
      {status}
    </span>
  );
}
