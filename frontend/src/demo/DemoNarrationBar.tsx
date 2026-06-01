import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { INTERACTIVE_TARGET_SECONDS, type DemoExperience } from './demoExperience';
import {
  getDemoCalloutState,
  getDemoExperience,
  getDemoInteractiveHud,
  getDemoNarrationState,
  subscribeDemoCallout,
} from './demoRunner';
import { walkthroughClip } from './demoWalkthrough';

const STAGES = [
  { n: 1, label: 'Signals', color: 'var(--color-chart-1)' },
  { n: 2, label: 'Debate', color: 'var(--color-chart-2)' },
  { n: 3, label: 'Forecast', color: 'var(--color-chart-3)' },
];

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DemoNarrationBar({ embedded = false }: { embedded?: boolean }) {
  const [narration, setNarration] = useState(getDemoNarrationState);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);
  const [hud, setHud] = useState(getDemoInteractiveHud);
  const [calloutWaiting, setCalloutWaiting] = useState(getDemoCalloutState().waiting);

  useEffect(() => {
    return subscribeDemoCallout(() => {
      setNarration(getDemoNarrationState());
      setExperience(getDemoExperience());
      setHud(getDemoInteractiveHud());
      setCalloutWaiting(getDemoCalloutState().waiting);
    });
  }, []);

  const visible = narration.visible;
  const isInteractive = experience === 'interactive' && hud.active;
  const isGuided = experience === 'guided';
  const targetSeconds = INTERACTIVE_TARGET_SECONDS;
  const isDebate = experience === 'debate';

  if (!visible) return null;
  if ((isGuided || isInteractive) && calloutWaiting) return null;

  const timePct = isInteractive ? Math.min(100, (hud.elapsedSec / targetSeconds) * 100) : 0;

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
            <div className="flex shrink-0 items-center gap-2">
              {isInteractive && (
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-xs tabular-nums text-[var(--color-accent)]">
                    {formatTime(hud.elapsedSec)}
                    <span className="text-[var(--color-text-muted)]"> / {formatTime(targetSeconds)}</span>
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Interactive demo</p>
                </div>
              )}
              {isDebate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-chart-2)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-chart-2)]">
                  <BookOpen className="h-3 w-3" />
                  Debate council
                </span>
              )}
            </div>
          </div>

          <p className="text-sm leading-snug text-[var(--color-text-muted)]">
            {walkthroughClip(narration.narration.happening, 140)}
          </p>

          {isInteractive && (
            <>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
                <motion.div
                  className="demo-cinema-progress-fill h-full rounded-full"
                  initial={false}
                  animate={{ width: `${timePct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {STAGES.map(({ n, label, color }) => {
                  const stagePct = hud.stage === n ? hud.stageProgress : hud.stage > n ? 100 : 0;
                  return (
                    <div key={n} className="rounded-lg bg-[var(--color-bg-muted)]/80 px-2 py-1.5">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-semibold" style={{ color }}>
                          {label}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">S{n}</span>
                      </div>
                      <div className="h-0.5 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${stagePct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
