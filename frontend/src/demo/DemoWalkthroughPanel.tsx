import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Eye, FastForward, PlayCircle } from 'lucide-react';
import type { DemoCallout } from './demoCallouts';
import type { DemoExperience } from './demoExperience';
import {
  getNextWalkthroughBeat,
  glanceWalkthroughLine,
  primaryWalkthroughLine,
  walkthroughStageProgress,
} from './demoWalkthrough';

export function DemoWalkthroughPanel({
  callout,
  experience,
  isReview,
  onContinue,
  onSkipPauses,
}: {
  callout: DemoCallout;
  experience: DemoExperience;
  isReview: boolean;
  onContinue: () => void;
  onSkipPauses: () => void;
}) {
  const isGuided = experience === 'guided';
  const next = getNextWalkthroughBeat(callout);
  const stageProgress = walkthroughStageProgress(callout);
  const primary = primaryWalkthroughLine(callout, isReview);
  const glance = glanceWalkthroughLine(callout, isReview);
  const stepPct =
    callout.stepIndex != null && callout.stepTotal
      ? Math.round((callout.stepIndex / callout.stepTotal) * 100)
      : null;

  const nowLabel = isReview ? 'Just finished' : 'Up next';
  const cta = isReview ? 'Continue' : 'Run step';

  return (
    <motion.aside
      initial={{ opacity: 0, y: 16, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 440, damping: 34 }}
      className="demo-walkthrough-panel fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-1.25rem))] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/98 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl"
      role="dialog"
      aria-labelledby="demo-walkthrough-title"
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {isGuided && callout.stepIndex != null && (
            <p className="mb-1 text-[10px] font-medium tabular-nums text-[var(--color-text-muted)]">
              Walkthrough · {callout.stepIndex}/{callout.stepTotal}
              {stepPct != null ? ` · ${stepPct}%` : ''}
            </p>
          )}
          {stageProgress && stageProgress.total > 0 && stageProgress.index > 0 && (
            <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">
              Stage {stageProgress.stage} · step {stageProgress.index}/{stageProgress.total}
            </p>
          )}
          {stepPct != null && isGuided && (
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                style={{ width: `${stepPct}%` }}
              />
            </div>
          )}
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">{nowLabel}</p>
          <h2 id="demo-walkthrough-title" className="text-base font-semibold leading-snug text-[var(--color-text)]">
            {callout.title}
          </h2>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2 rounded-xl bg-[var(--color-accent)]/8 px-3 py-2.5">
          <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
          <p className="text-sm leading-snug text-[var(--color-text)]">{primary}</p>
        </div>

        {glance && (
          <div className="flex gap-2 rounded-xl bg-[var(--color-bg-muted)]/80 px-3 py-2">
            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
            <p className="text-xs leading-snug text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">Look · </span>
              {glance}
            </p>
          </div>
        )}

        {next && (
          <button
            type="button"
            onClick={onContinue}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-subtle)] px-3 py-2 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-bg-muted)]/50"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Then</p>
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{next.title}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{next.hint}</p>
            </div>
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        {isGuided && (
          <button
            type="button"
            onClick={onSkipPauses}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
          >
            <FastForward className="h-3 w-3" />
            No pauses
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-on-accent)] hover:bg-[var(--color-accent-dim)]"
        >
          {cta}
          <span className="hidden text-[var(--color-on-accent)]/70 sm:inline">Space</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.aside>
  );
}
