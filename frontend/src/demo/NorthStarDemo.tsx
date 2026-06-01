import { motion } from 'framer-motion';
import { Brain, Compass, MousePointerClick, Pause, Play, Rocket, Sparkles, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalysisShell } from '../components/AnalysisShell';
import { useAnalysisStore } from '../store/analysisStore';
import { DemoCalloutOverlay, DemoExperienceBadge } from './DemoCalloutOverlay';
import { DemoFinale } from './DemoFinale';
import { DemoStageCurtain } from './DemoStageCurtain';
import { DemoTopChrome } from './DemoTopChrome';
import { DEMO_PROFILE_URL, DEMO_USERNAME } from './buildDemoFixture';
import { EXPERIENCE_LABELS, type DemoExperience } from './demoExperience';
import {
  exitDemoMode,
  getDemoCalloutState,
  getDemoReplayProgress,
  isDemoReplayActive,
  isDemoReplayPaused,
  pauseDemoReplay,
  setDemoExperience,
  setDemoSpeed,
  startDebateCouncilDemo,
  startDemoWalkthrough,
  subscribeDemoCallout,
} from './demoRunner';

const EXPERIENCE_OPTIONS: {
  id: DemoExperience;
  icon: typeof MousePointerClick;
  accent: string;
  featured?: boolean;
}[] = [
  { id: 'interactive', icon: MousePointerClick, accent: 'from-[#0071e3] to-[#5856d6]', featured: true },
  { id: 'debate', icon: Brain, accent: 'from-[#5856d6] to-[#af52de]', featured: true },
  { id: 'guided', icon: Compass, accent: 'from-[#5856d6] to-[#af52de]' },
  { id: 'freerun', icon: Zap, accent: 'from-[#34c759] to-[#30b0c7]' },
];

function initialExperience(): DemoExperience {
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo === 'debate') return 'debate';
  return 'interactive';
}

export function NorthStarDemo() {
  const [started, setStarted] = useState(() => new URLSearchParams(window.location.search).get('demo') === 'debate');
  const [paused, setPaused] = useState(false);
  const [experience, setExperience] = useState<DemoExperience>(initialExperience);
  const [waitingForStep, setWaitingForStep] = useState(false);

  useEffect(() => {
    return subscribeDemoCallout(() => setWaitingForStep(getDemoCalloutState().waiting));
  }, []);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get('demo');
    if (demo === 'debate') {
      setExperience('debate');
      setDemoExperience('debate');
      setDemoSpeed(0.85);
      void startDebateCouncilDemo();
    }
  }, []);

  const handleStart = async (mode: DemoExperience = experience) => {
    setStarted(true);
    setPaused(false);
    setExperience(mode);
    setDemoExperience(mode);

    if (mode === 'debate') {
      setDemoSpeed(0.85);
      await startDebateCouncilDemo();
      return;
    }

    if (mode === 'interactive') setDemoSpeed(0.88);
    else if (mode === 'freerun') setDemoSpeed(1.5);
    else setDemoSpeed(0.15);
    await startDemoWalkthrough({ experience: mode });
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      if (experience === 'debate') void startDebateCouncilDemo({ resume: true });
      else void startDemoWalkthrough({ resume: true, experience });
    } else {
      pauseDemoReplay();
      setPaused(true);
    }
  };

  if (!started) {
    return (
      <div className="demo-landing relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
        <div className="demo-landing-mesh pointer-events-none absolute inset-0" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 py-1.5 text-sm text-[var(--color-accent)] shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            Live product demo · same UI as production analysis
          </div>
          <h1 className="hero-headline mb-4 text-4xl md:text-6xl">
            North Star on <span className="text-[var(--color-accent)]">@{DEMO_USERNAME}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">
            An interactive walkthrough of the full Persona Dynamics pipeline — signal extraction, six-agent debate council,
            Ornstein–Uhlenbeck dynamics, adaptive SIR strains, and 10,000-path Monte Carlo projection.
          </p>

          <div className="mb-8 grid gap-3 text-left sm:grid-cols-2">
            {EXPERIENCE_OPTIONS.map(({ id, icon: Icon, accent, featured }) => {
              const meta = EXPERIENCE_LABELS[id];
              const selected = experience === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExperience(id)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-[var(--color-accent)] bg-white shadow-[var(--shadow-card)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border-subtle)] bg-white/70 hover:border-[var(--color-accent)]/40'
                  }`}
                >
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${accent} p-2 text-white shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--color-text)]">{meta.title}</p>
                    <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {meta.duration}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">{meta.subtitle}</p>
                  {featured && (
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      {id === 'debate' ? 'Stage 2 deep dive' : 'Recommended'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void handleStart()}
            className="demo-cta inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-[16px] font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Rocket className="h-5 w-5" />
            {experience === 'interactive'
              ? 'Start interactive demo'
              : experience === 'debate'
                ? 'Start debate council demo'
                : experience === 'guided'
                  ? 'Start walkthrough'
                  : 'Start free run'}
          </button>

          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            Profile <span className="text-[var(--color-text)]">{DEMO_PROFILE_URL}</span> · 72 posts · 6 agents · 30 challenges · 10k MC paths
          </p>

          <div className="mt-8 grid gap-2 text-left sm:grid-cols-3">
            {[
              ['Empirical', 'Signal matrix · Stage 3 driver metrics (4 highlighted) · engagement depth'],
              ['Interpretive', 'Debate R1–R3 glass panels · live synthesis · unified persona'],
              ['Dynamical', 'OU + SIR strains · ensemble Monte Carlo'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-[var(--color-border-subtle)] bg-white/60 p-3 text-xs backdrop-blur-sm">
                <p className="font-semibold text-[var(--color-text)]">{title}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnalysisShell
        topSlot={<DemoTopChrome />}
        headerExtra={
          <DemoControls paused={paused} waitingForStep={waitingForStep} onTogglePause={togglePause} onExit={exitDemoMode} />
        }
      />
      <DemoStageCurtain />
      <DemoCalloutOverlay />
      <DemoFinale />
    </>
  );
}

function DemoControls({
  paused,
  waitingForStep,
  onTogglePause,
  onExit,
}: {
  paused: boolean;
  waitingForStep: boolean;
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
  const showPause = (running || isDemoReplayPaused()) && !waitingForStep;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DemoExperienceBadge />
      {(running || paused || status === 'running') && status !== 'complete' && (
        <span className="hidden max-w-[200px] truncate text-xs text-[var(--color-text-muted)] sm:inline" title={activeLabel}>
          {activeLabel} · {pct}%
        </span>
      )}
      {showPause && (
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
