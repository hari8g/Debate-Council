import { AnimatePresence, motion } from 'framer-motion';
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
import { DemoWalkthroughPanel } from './DemoWalkthroughPanel';

export function DemoCalloutOverlay() {
  const [state, setState] = useState(getDemoCalloutState);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);
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
  const useCompactPanel = experience === 'guided' || experience === 'interactive' || experience === 'debate';

  useEffect(() => {
    if (!visible || !autoAdvanceMs) {
      setCountdown(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setCountdown(Math.max(0, autoAdvanceMs - (Date.now() - start)));
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

  const skipPauses = () => {
    if (experience === 'guided') setGuidedDemoEnabled(false);
    else setDemoExperience('freerun');
    advanceDemoStep();
  };

  return (
    <AnimatePresence>
      {visible && callout && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`pointer-events-none fixed inset-0 z-40 ${
              isInteractive && !isReview ? 'bg-transparent' : 'bg-black/8 backdrop-blur-[1px]'
            }`}
            aria-hidden
          />
          {useCompactPanel ? (
            <DemoWalkthroughPanel
              callout={callout}
              experience={experience}
              isReview={!!isReview}
              autoAdvanceMs={autoAdvanceMs}
              countdown={countdown}
              onContinue={() => advanceDemoStep()}
              onSkipPauses={skipPauses}
            />
          ) : null}
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
    interactive: 'Interactive · ~7 min',
    debate: 'Debate council',
    guided: 'Walkthrough',
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
