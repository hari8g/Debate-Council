import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  CINEMA_TARGET_SECONDS,
  type DemoExperience,
} from './demoExperience';
import {
  getDemoCinemaHud,
  getDemoExperience,
  subscribeDemoCallout,
} from './demoRunner';

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

export function DemoCinemaHud() {
  const [hud, setHud] = useState(getDemoCinemaHud);
  const [experience, setExperience] = useState<DemoExperience>(getDemoExperience);

  useEffect(() => {
    return subscribeDemoCallout(() => {
      setHud(getDemoCinemaHud());
      setExperience(getDemoExperience());
    });
  }, []);

  if (experience !== 'interactive' || !hud.active) return null;

  const progressPct = hud.eventProgress;
  const timePct = Math.min(100, (hud.elapsedSec / CINEMA_TARGET_SECONDS) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="demo-cinema-hud pointer-events-none fixed left-1/2 top-[4.5rem] z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg)]/92 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-xl"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--color-text)]">{hud.beatLabel}</p>
          <p className="truncate text-[10px] text-[var(--color-text-muted)]">{hud.pipelineState}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-xs tabular-nums text-[var(--color-accent)]">
            {formatTime(hud.elapsedSec)}
            <span className="text-[var(--color-text-muted)]"> / {formatTime(CINEMA_TARGET_SECONDS)}</span>
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">Interactive demo</p>
        </div>
      </div>

      <div className="mb-2 h-1 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
        <motion.div
          className="demo-cinema-progress-fill h-full rounded-full"
          initial={false}
          animate={{ width: `${timePct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STAGES.map(({ n, label, color }) => {
          const stagePct =
            hud.stage === n
              ? hud.stageProgress
              : hud.stage > n
                ? 100
                : 0;
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

      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
        <div className="h-full bg-[var(--color-text-tertiary)] transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>
    </motion.div>
  );
}
