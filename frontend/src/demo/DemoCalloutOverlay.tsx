import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  advanceDemoStep,
  getDemoCalloutState,
  getDemoExperience,
  setDemoPausesEnabled,
  subscribeDemoCallout,
} from './demoRunner';
import type { DemoExperience } from './demoExperience';
import { DemoWalkthroughPanel } from './DemoWalkthroughPanel';

export function DemoCalloutOverlay() {
  const [state, setState] = useState(getDemoCalloutState);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);

  useEffect(() => {
    return subscribeDemoCallout(() => {
      setState(getDemoCalloutState());
      setExperience(getDemoExperience());
    });
  }, []);

  const { callout, waiting } = state;
  const visible = waiting && callout != null;
  const isReview = callout?.kind === 'review';

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
    setDemoPausesEnabled(false);
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
            className="pointer-events-none fixed inset-0 z-40 bg-black/8 backdrop-blur-[1px]"
            aria-hidden
          />
          <DemoWalkthroughPanel
            callout={callout}
            experience={experience}
            isReview={!!isReview}
            onContinue={() => advanceDemoStep()}
            onSkipPauses={skipPauses}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export function DemoExperienceBadge() {
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);

  useEffect(() => {
    return subscribeDemoCallout(() => setExperience(getDemoExperience()));
  }, []);

  const labels: Record<DemoExperience, string> = {
    debate: 'Debate council',
    guided: 'Walkthrough',
  };

  return (
    <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
      {labels[experience]}
    </span>
  );
}

/** @deprecated use DemoExperienceBadge */
export const DemoGuidedBadge = DemoExperienceBadge;
