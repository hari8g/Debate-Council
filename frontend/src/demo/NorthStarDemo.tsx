import { motion } from 'framer-motion';
import { Brain, Compass, Pause, Play, Rocket, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalysisShell } from '../components/AnalysisShell';
import { useAnalysisStore } from '../store/analysisStore';
import { DemoCalloutOverlay, DemoExperienceBadge } from './DemoCalloutOverlay';
import { DemoFinale } from './DemoFinale';
import { DemoStageCurtain } from './DemoStageCurtain';
import { DemoTopChrome } from './DemoTopChrome';
import { DEMO_PROFILE_URL, DEMO_USERNAME } from './buildDemoFixture';
import { DEMO_TOUR_LINKS, EXPERIENCE_LABELS, type DemoExperience } from './demoExperience';
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

const TOUR_OPTIONS: {
  id: DemoExperience;
  icon: typeof Compass;
  accent: string;
  href: string;
}[] = [
  {
    id: 'guided',
    icon: Compass,
    accent: 'from-[#0071e3] to-[#5856d6]',
    href: DEMO_TOUR_LINKS.walkthrough.path,
  },
  {
    id: 'debate',
    icon: Brain,
    accent: 'from-[#5856d6] to-[#af52de]',
    href: DEMO_TOUR_LINKS.debate.path,
  },
];

function initialExperience(): DemoExperience {
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo === 'debate') return 'debate';
  return 'guided';
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

    setDemoSpeed(1);
    await startDemoWalkthrough({ experience: 'guided' });
  };

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      if (experience === 'debate') void startDebateCouncilDemo({ resume: true });
      else void startDemoWalkthrough({ resume: true, experience: 'guided' });
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
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-4 py-1.5 text-sm text-[var(--color-accent)] shadow-sm backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            Product demo · no backend required
          </div>
          <h1 className="hero-headline mb-4 text-4xl md:text-6xl">
            North Star on <span className="text-[var(--color-accent)]">@{DEMO_USERNAME}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--color-text-muted)]">
            Choose a guided tour — full pipeline with step-by-step prompts, or debate council only (Stage 2).
          </p>

          <div className="mb-8 grid gap-4 text-left sm:grid-cols-2">
            {TOUR_OPTIONS.map(({ id, icon: Icon, accent, href }) => {
              const meta = EXPERIENCE_LABELS[id];
              const selected = experience === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExperience(id)}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                    selected
                      ? 'border-[var(--color-accent)] bg-white shadow-[var(--shadow-card)] ring-2 ring-[var(--color-accent)]/20'
                      : 'border-[var(--color-border-subtle)] bg-white/70 hover:border-[var(--color-accent)]/40'
                  }`}
                >
                  <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${accent} p-2.5 text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-semibold text-[var(--color-text)]">{meta.title}</p>
                    <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {meta.duration}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{meta.subtitle}</p>
                  <p className="mt-3 font-mono text-[11px] text-[var(--color-accent)]">{href}</p>
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
            {experience === 'debate' ? 'Start debate council tour' : 'Start detailed walkthrough'}
          </button>

          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            Direct links:{' '}
            <a href={DEMO_TOUR_LINKS.walkthrough.path} className="text-[var(--color-accent)] hover:underline">
              walkthrough
            </a>
            {' · '}
            <a href={DEMO_TOUR_LINKS.debate.path} className="text-[var(--color-accent)] hover:underline">
              debate
            </a>
          </p>

          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            {DEMO_PROFILE_URL} · 72 posts · 6 agents · 30 challenges
          </p>
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
