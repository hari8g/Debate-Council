import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DemoExperience } from './demoExperience';
import {
  getDemoCalloutState,
  getDemoExperience,
  getDemoNarrationState,
  subscribeDemoCallout,
} from './demoRunner';
import { walkthroughClip } from './demoWalkthrough';

export function DemoNarrationBar({ embedded = false }: { embedded?: boolean }) {
  const [narration, setNarration] = useState(getDemoNarrationState);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);
  const [calloutWaiting, setCalloutWaiting] = useState(getDemoCalloutState().waiting);

  useEffect(() => {
    return subscribeDemoCallout(() => {
      setNarration(getDemoNarrationState());
      setExperience(getDemoExperience());
      setCalloutWaiting(getDemoCalloutState().waiting);
    });
  }, []);

  const visible = narration.visible;
  const isGuided = experience === 'guided';
  const isDebate = experience === 'debate';

  if (!visible) return null;
  if (calloutWaiting) return null;

  const shellClass = embedded
    ? 'demo-narration-bar relative w-full overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)] shadow-[var(--shadow-card)]'
    : `demo-narration-bar pointer-events-auto fixed left-1/2 top-[4.25rem] z-[49] w-[min(760px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/96 shadow-[var(--shadow-card)] backdrop-blur-xl ${
        isDebate ? 'demo-narration-debate' : ''
      }`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: embedded ? -8 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: embedded ? -4 : -12 }}
        className={shellClass}
      >
        <div className="demo-narration-mesh pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative px-4 py-3">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                {narration.narration.eyebrow}
              </p>
              <h2 className="truncate text-base font-semibold text-[var(--color-text)] md:text-lg">{narration.narration.title}</h2>
            </div>
            {isDebate && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-chart-2)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-chart-2)]">
                <BookOpen className="h-3 w-3" />
                Debate council
              </span>
            )}
            {isGuided && (
              <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                Walkthrough
              </span>
            )}
          </div>

          <p className="text-sm leading-snug text-[var(--color-text-muted)]">
            {walkthroughClip(narration.narration.happening, 140)}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
