import { motion } from 'framer-motion';
import { AlertTriangle, Pause, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalysisShell } from '../components/AnalysisShell';
import { useAnalysisStore } from '../store/analysisStore';
import { DemoCalloutOverlay, DemoGuidedBadge } from './DemoCalloutOverlay';
import { DEMO_PROFILE_URL, DEMO_USERNAME } from './buildDemoFixture';
import {
  exitDemoMode,
  getDemoCalloutState,
  getDemoReplayProgress,
  isDemoReplayActive,
  isGuidedDemoEnabled,
  pauseDemoReplay,
  setDemoSpeed,
  setGuidedDemoEnabled,
  startDemoWalkthrough,
  subscribeDemoCallout,
} from './demoRunner';

export function NorthStarDemo() {
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(0.15);
  const [guided, setGuided] = useState(true);
  const [waitingForStep, setWaitingForStep] = useState(false);

  useEffect(() => subscribeDemoCallout(() => setWaitingForStep(getDemoCalloutState().waiting)), []);

  const handleStart = async () => {
    setStarted(true);
    setPaused(false);
    setDemoSpeed(speed);
    setGuidedDemoEnabled(guided);
    await startDemoWalkthrough({ guided });
  };

  const handleSpeed = (value: number) => {
    setSpeed(value);
    setDemoSpeed(value);
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      void startDemoWalkthrough({ resume: true, guided: isGuidedDemoEnabled() });
    } else {
      pauseDemoReplay();
      setPaused(true);
    }
  };

  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-4 py-1.5 text-sm text-[var(--color-accent)]">
            <Sparkles className="h-4 w-4" />
            Interactive walkthrough · same UI as live analysis
          </div>
          <h1 className="hero-headline mb-4 text-4xl md:text-5xl">Walk through North Star on @{DEMO_USERNAME}</h1>
          <p className="mb-8 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Step through each pipeline phase with callouts explaining what the app is doing. The real dashboard runs behind
            every step — timeline, detail panels, debate council, Monte Carlo, and full report.
          </p>

          <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              Speed
              <select
                value={speed}
                onChange={(e) => handleSpeed(Number(e.target.value))}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]"
              >
                <option value={0.1}>0.1×</option>
                <option value={0.15}>0.15×</option>
                <option value={0.25}>0.25×</option>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={1.5}>1.5×</option>
                <option value={2}>2×</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={guided}
                onChange={(e) => setGuided(e.target.checked)}
                className="rounded border-[var(--color-border-subtle)]"
              />
              Step-by-step callouts
            </label>
            <button
              type="button"
              onClick={() => void handleStart()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-accent)] px-8 py-3.5 text-[15px] font-medium text-[var(--color-on-accent)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-accent-dim)]"
            >
              <Play className="h-4 w-4" />
              Start walkthrough
            </button>
          </div>

          <p className="mb-8 text-sm text-[var(--color-text-muted)]">
            Profile: <span className="text-[var(--color-text)]">{DEMO_PROFILE_URL}</span> · 72 posts · full archive · 6 agents · 30 challenges
          </p>

          <div className="grid gap-2 text-left sm:grid-cols-3">
            {[
              ['Stage 1', '8 substeps with signal matrix & engagement depth'],
              ['Stage 2', '6 agents · 30 challenges · persona model'],
              ['Stage 3', 'OU fit · strains · 10k MC · goals outlook'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-[var(--color-border-subtle)] p-3 text-xs">
                <p className="font-semibold text-[var(--color-text)]">{title}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)]/60 p-4 text-left text-sm text-[var(--color-text-muted)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
            <div>
              <strong className="text-[var(--color-text)]">How it works:</strong> Each substep has two pauses — an
              intro callout (what will run) and a review callout (inspect the output). The timeline highlights the active
              substep. Click <strong>Run this step</strong> or press Enter to advance. Default speed is 0.15× between events.
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnalysisShell
        headerExtra={
          <DemoControls
            paused={paused}
            speed={speed}
            waitingForStep={waitingForStep}
            onSpeedChange={handleSpeed}
            onTogglePause={togglePause}
            onExit={exitDemoMode}
          />
        }
      />
      <DemoCalloutOverlay />
    </>
  );
}

function DemoControls({
  paused,
  speed,
  waitingForStep,
  onSpeedChange,
  onTogglePause,
  onExit,
}: {
  paused: boolean;
  speed: number;
  waitingForStep: boolean;
  onSpeedChange: (v: number) => void;
  onTogglePause: () => void;
  onExit: () => void;
}) {
  const running = isDemoReplayActive();
  const status = useAnalysisStore((s) => s.status);
  const selectedSubstepId = useAnalysisStore((s) => s.selectedSubstepId);
  const stages = useAnalysisStore((s) => s.stages);
  const [progress, setProgress] = useState(getDemoReplayProgress);

  useEffect(() => {
    const id = setInterval(() => setProgress(getDemoReplayProgress()), 250);
    return () => clearInterval(id);
  }, []);

  const activeLabel = (() => {
    if (!selectedSubstepId) return status === 'complete' ? 'Full report ready' : 'Pipeline overview';
    for (const stage of Object.values(stages)) {
      const sub = stage.substeps[selectedSubstepId];
      if (sub) return sub.label;
    }
    return selectedSubstepId;
  })();

  const pct = progress.total > 0 ? Math.round((progress.index / progress.total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DemoGuidedBadge />
      {(running || paused || status === 'running') && status !== 'complete' && (
        <span className="hidden max-w-[220px] truncate text-xs text-[var(--color-text-muted)] sm:inline" title={activeLabel}>
          {activeLabel} · {pct}%
        </span>
      )}
      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)]"
        aria-label="Demo speed"
      >
        <option value={0.1}>0.1×</option>
        <option value={0.15}>0.15×</option>
        <option value={0.25}>0.25×</option>
        <option value={0.5}>0.5×</option>
        <option value={1}>1×</option>
        <option value={1.5}>1.5×</option>
        <option value={2}>2×</option>
      </select>
      {(running || paused) && !waitingForStep && (
        <button
          type="button"
          onClick={onTogglePause}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
      <button type="button" onClick={onExit} className="text-xs text-[var(--color-accent)] hover:underline">
        Exit demo
      </button>
    </div>
  );
}

export default NorthStarDemo;
