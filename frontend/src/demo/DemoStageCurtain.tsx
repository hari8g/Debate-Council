import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getDemoCurtainState, subscribeDemoCallout } from './demoRunner';
import { STAGE_METHODOLOGY, STAGE_TAGLINES } from './demoExperience';

export function DemoStageCurtain() {
  const [curtain, setCurtain] = useState(getDemoCurtainState);

  useEffect(() => {
    return subscribeDemoCallout(() => setCurtain(getDemoCurtainState()));
  }, []);

  return (
    <AnimatePresence>
      {curtain && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="demo-cinema-curtain fixed inset-0 z-[60] flex items-center justify-center px-6"
          aria-live="polite"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="demo-cinema-curtain-card relative mx-auto max-w-xl rounded-3xl border border-[var(--color-border-subtle)] px-8 py-10 text-center shadow-[var(--shadow-soft)]"
          >
            <p className="section-eyebrow-accent mb-3">Stage {curtain.stage}</p>
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">{curtain.title}</h2>
            <p className="mb-6 text-base leading-relaxed text-[var(--color-text-muted)] md:text-lg">
              {STAGE_TAGLINES[curtain.stage] ?? curtain.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {(STAGE_METHODOLOGY[curtain.stage] ?? []).map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/80 px-3 py-1 text-xs font-medium text-[var(--color-text)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
