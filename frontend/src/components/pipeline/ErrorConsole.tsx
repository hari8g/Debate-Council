import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';
import type { ErrorLogEntry } from '../../types/report';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function entryToText(entry: ErrorLogEntry): string {
  const lines = [
    `[${formatTime(entry.timestamp)}] ${entry.severity.toUpperCase()} (${entry.source})`,
    entry.errorType ? `Type: ${entry.errorType}` : null,
    entry.stage != null ? `Stage: ${entry.stage}${entry.substepLabel ? ` — ${entry.substepLabel}` : entry.substepId ? ` — ${entry.substepId}` : ''}` : null,
    `Message: ${entry.message}`,
    entry.traceback ? `\nTraceback:\n${entry.traceback}` : null,
    entry.raw ? `\nRaw:\n${JSON.stringify(entry.raw, null, 2)}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

function ErrorEntry({ entry }: { entry: ErrorLogEntry }) {
  const [expanded, setExpanded] = useState(entry.severity === 'error');
  const hasDetails = Boolean(entry.traceback || entry.raw);

  return (
    <div
      className={`rounded-lg border p-3 ${
        entry.severity === 'error'
          ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5'
          : 'border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5'
      }`}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        disabled={!hasDetails}
      >
        {hasDetails ? (
          expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {entry.severity === 'error' ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{formatTime(entry.timestamp)}</span>
            <span className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5">{entry.source}</span>
            {entry.errorType && (
              <span className="rounded bg-[var(--color-danger)]/15 px-1.5 py-0.5 font-mono text-[var(--color-danger)]">
                {entry.errorType}
              </span>
            )}
            {entry.stage != null && (
              <span>
                Stage {entry.stage}
                {entry.substepLabel ? `: ${entry.substepLabel}` : entry.substepId ? `: ${entry.substepId}` : ''}
              </span>
            )}
          </div>
          <p className="mt-1 break-words text-sm">{entry.message}</p>
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border)]/60 pt-3 pl-6">
          {entry.traceback && (
            <pre className="overflow-x-auto rounded bg-[var(--color-bg-elevated)] p-3 font-mono text-xs leading-relaxed text-[var(--color-text-muted)]">
              {entry.traceback}
            </pre>
          )}
          {entry.raw && (
            <pre className="overflow-x-auto rounded bg-[var(--color-bg-elevated)] p-3 font-mono text-xs leading-relaxed text-[var(--color-text-muted)]">
              {JSON.stringify(entry.raw, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorConsole() {
  const errorLog = useAnalysisStore((s) => s.errorLog);
  const clearErrorLog = useAnalysisStore((s) => s.clearErrorLog);
  const status = useAnalysisStore((s) => s.status);
  const error = useAnalysisStore((s) => s.error);

  const copyAll = () => {
    const text = errorLog.map(entryToText).join('\n\n---\n\n');
    void navigator.clipboard.writeText(text || error || 'No errors logged.');
  };

  const errors = errorLog.filter((e) => e.severity === 'error');
  const warnings = errorLog.filter((e) => e.severity === 'warning');

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl">Error Console</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Pipeline failures, warnings, and connection issues appear here with full context.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copyAll}
            disabled={errorLog.length === 0 && !error}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
          >
            <Copy className="h-3 w-3" /> Copy all
          </button>
          <button
            type="button"
            onClick={clearErrorLog}
            disabled={errorLog.length === 0}
            className="flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        </div>
      </div>

      {status === 'error' && error && errorLog.length === 0 && (
        <div className="mb-4 rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-4">
          <p className="font-mono text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {errorLog.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          <div>
            <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No errors or warnings yet.</p>
            <p className="mt-1 text-xs">If the pipeline fails, details will show here automatically.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-1">
          {errors.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-[var(--color-danger)]">
                Errors ({errors.length})
              </h4>
              <div className="space-y-2">
                {errors.map((entry) => (
                  <ErrorEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}
          {warnings.length > 0 && (
            <section>
              <h4 className="mb-2 text-sm font-medium text-[var(--color-warning)]">
                Warnings ({warnings.length})
              </h4>
              <div className="space-y-2">
                {warnings.map((entry) => (
                  <ErrorEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
