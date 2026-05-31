import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, ChevronUp, FastForward, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  advanceDemoStep,
  getDemoCalloutState,
  getDemoExperience,
  setDemoExperience,
  setGuidedDemoEnabled,
  subscribeDemoCallout,
} from './demoRunner';
import type { DemoExperience } from './demoExperience';

const STATE_LABEL_STYLES: Record<string, string> = {
  'Up next — substep will run': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'Up next — stage begins': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'Complete — inspect the output panel': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Stage complete — review outputs': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Report ready': 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
};

function CountdownRing({ ms, total }: { ms: number; total: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? ms / total : 0;
  return (
    <svg width="36" height="36" className="-rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth="2.5" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2.5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        className="transition-all duration-100"
      />
    </svg>
  );
}

export function DemoCalloutOverlay() {
  const [state, setState] = useState(getDemoCalloutState);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);
  const [expanded, setExpanded] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    return subscribeDemoCallout(() => {
      setState(getDemoCalloutState());
      setExperience(getDemoExperience());
    });
  }, []);

  const { callout, waiting, autoAdvanceMs } = state;
  const visible = waiting && callout != null;
  const isReview = callout?.kind === 'review';
  const isInteractive = experience === 'interactive';
  const useRichPanel = experience === 'guided' || experience === 'debate' || isInteractive;

  useEffect(() => {
    if (visible && isInteractive && isReview) setExpanded(true);
    else if (visible) setExpanded(false);
  }, [visible, callout?.title, isInteractive, isReview]);

  useEffect(() => {
    if (!visible || !autoAdvanceMs) {
      setCountdown(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setCountdown(Math.max(0, autoAdvanceMs - elapsed));
    }, 50);
    return () => clearInterval(id);
  }, [visible, autoAdvanceMs, callout?.title]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advanceDemoStep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && callout && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`pointer-events-none fixed inset-0 z-40 ${isInteractive && !isReview ? 'bg-transparent' : 'bg-black/10 backdrop-blur-[1px]'}`}
            aria-hidden
          />
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={
              useRichPanel
                ? 'demo-interactive-callout fixed bottom-5 left-1/2 z-50 max-h-[min(72vh,680px)] w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/98 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl'
                : 'fixed bottom-6 left-1/2 z-50 max-h-[min(72vh,640px)] w-[min(620px,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-5 shadow-[var(--shadow-soft)]'
            }
            role="dialog"
            aria-labelledby="demo-callout-title"
          >
            <div className="mb-2 flex gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    <Sparkles className="h-3 w-3" />
                    {callout.badge ?? 'Spotlight'}
                  </span>
                  {experience === 'guided' && callout.stepIndex != null && (
                    <span className="rounded-full border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                      Step {callout.stepIndex} of {callout.stepTotal}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATE_LABEL_STYLES[callout.stateLabel] ?? 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'}`}
                  >
                    {callout.stateLabel}
                  </span>
                </div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                  {callout.pipelineState}
                </p>
                <h2 id="demo-callout-title" className="text-lg font-semibold text-[var(--color-text)]">
                  {callout.title}
                </h2>
              </div>
              {isInteractive && autoAdvanceMs != null && !isReview && (
                <div className="relative shrink-0">
                  <CountdownRing ms={countdown} total={autoAdvanceMs} />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-[var(--color-text-muted)]">
                    {Math.ceil(countdown / 1000)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              <p>
                <span className="font-medium text-[var(--color-text)]">
                  {isReview ? 'What just ran: ' : 'What happens next: '}
                </span>
                {isReview ? callout.doing : callout.doing}
              </p>
              <p>
                <span className="font-medium text-[var(--color-text)]">Look for in the UI: </span>
                {callout.lookFor}
              </p>
              {callout.whyItMatters && (
                <p>
                  <span className="font-medium text-[var(--color-text)]">Why it matters: </span>
                  {callout.whyItMatters}
                </p>
              )}

              {(callout.inputs || callout.outputs) && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {callout.inputs && (
                    <div className="rounded-lg bg-[var(--color-bg-muted)]/80 px-3 py-2 text-xs">
                      <span className="font-medium text-[var(--color-text)]">Inputs · </span>
                      {callout.inputs}
                    </div>
                  )}
                  {callout.outputs && (
                    <div className="rounded-lg bg-[var(--color-bg-muted)]/80 px-3 py-2 text-xs">
                      <span className="font-medium text-[var(--color-text)]">Outputs · </span>
                      {callout.outputs}
                    </div>
                  )}
                </div>
              )}

              {callout.deepDive && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {expanded ? 'Hide deep dive' : 'Deep dive — how this works'}
                  </button>
                  {expanded && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/50 p-3 text-xs leading-relaxed"
                    >
                      {callout.deepDive}
                    </motion.p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-4">
              {(experience === 'guided' || isInteractive) && (
                <button
                  type="button"
                  onClick={() => {
                    if (experience === 'guided') setGuidedDemoEnabled(false);
                    else setDemoExperience('freerun');
                    advanceDemoStep();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  Run without pauses
                </button>
              )}
              <button
                type="button"
                onClick={() => advanceDemoStep()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-on-accent)] hover:bg-[var(--color-accent-dim)]"
              >
                {isReview ? "I've reviewed this — continue" : isInteractive && autoAdvanceMs ? 'Continue now' : 'Run this step'}
                <span className="hidden text-[var(--color-on-accent)]/70 sm:inline"> · Space</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function DemoExperienceBadge() {
  const [experience, setExperience] = useState(getDemoExperience);

  useEffect(() => {
    return subscribeDemoCallout(() => setExperience(getDemoExperience()));
  }, []);

  const labels: Record<DemoExperience, string> = {
    interactive: 'Interactive demo · ~7 min',
    debate: 'Debate council',
    guided: 'Deep dive',
    freerun: 'Free run',
  };

  return (
    <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
      {labels[experience]}
    </span>
  );
}

/** @deprecated use DemoExperienceBadge */
export const DemoGuidedBadge = DemoExperienceBadge;
