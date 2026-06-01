import { startAnalysisSession, useAnalysisStore } from '../store/analysisStore';
import type { PipelineEvent } from '../types/report';
import {
  highlightForCallout,
  introCalloutFromEvent,
  isGuidedIntroCheckpoint,
  isGuidedReviewCheckpoint,
  reviewCalloutFromEvent,
  walkthroughExtraReviewCalloutFromEvent,
  STAGE_NAMES,
  type DemoCallout,
  type DemoHighlight,
} from './demoCallouts';
import {
  isDebateIntroCheckpoint,
  isDebateReviewCheckpoint,
  walkthroughGapBeforeMs,
  type DemoExperience,
} from './demoExperience';
import { buildDemoEvents, buildDebateCouncilEvents, buildStage1SeedEvents, getDemoFixture, rerunEventsForStage } from './buildDemoEvents';
import { DEMO_JOB_ID } from './buildDemoFixture';
import {
  DEFAULT_NARRATION,
  getDebateIntroNarration,
  narrationFromCallout,
  narrationFromEvent,
  type DebatePhase,
  type DemoNarration,
} from './demoNarration';

let replayController: AbortController | null = null;
let speedMultiplier = 1.2;
let replayIndex = 0;
let replayTotal = 0;
let replayPaused = false;
let demoExperience: DemoExperience = 'guided';
let demoPausesEnabled = true;

let advanceResolver: (() => void) | null = null;
let calloutState: {
  callout: DemoCallout | null;
  waiting: boolean;
  highlight: DemoHighlight | null;
  autoAdvanceMs: number | null;
} = {
  callout: null,
  waiting: false,
  highlight: null,
  autoAdvanceMs: null,
};

let curtainState: { stage: number; title: string; subtitle: string } | null = null;
let finaleState: { visible: boolean; autoAdvanceSec: number | null; kind: 'full' | 'debate' } = {
  visible: false,
  autoAdvanceSec: null,
  kind: 'full',
};

let narrationState: { visible: boolean; narration: DemoNarration } = {
  visible: false,
  narration: DEFAULT_NARRATION,
};

let debateRailState = {
  active: false,
  phase: 'idle' as DebatePhase,
  agentsReady: 0,
  challengesDone: 0,
  challengesTotal: 30,
  defensesDone: 0,
  synthesisDone: false,
  synthesisPercent: 0,
  synthesisMessage: '',
  personaDone: false,
};

const calloutListeners = new Set<() => void>();

function notifyCalloutListeners() {
  calloutListeners.forEach((fn) => fn());
}

function setCalloutWaiting(callout: DemoCallout | null, waiting: boolean, autoAdvanceMs: number | null = null) {
  const highlight = callout ? highlightForCallout(callout) : null;
  calloutState = { callout, waiting, highlight, autoAdvanceMs };
  if (callout && waiting) {
    applyDemoFocus(callout, highlight);
    setNarration(narrationFromCallout(callout));
  }
  notifyCalloutListeners();
}

function setCurtain(stage: number | null) {
  if (stage == null) {
    curtainState = null;
  } else {
    curtainState = {
      stage,
      title: STAGE_NAMES[stage] ?? `Stage ${stage}`,
      subtitle: '',
    };
  }
  notifyCalloutListeners();
}

function setFinale(visible: boolean, autoAdvanceSec: number | null = null, kind: 'full' | 'debate' = 'full') {
  finaleState = { visible, autoAdvanceSec, kind };
  notifyCalloutListeners();
}

function setNarration(narration: DemoNarration, visible = true) {
  narrationState = { visible, narration };
  notifyCalloutListeners();
}

function syncNarrationFromEvent(event: PipelineEvent) {
  const next = narrationFromEvent(event);
  if (next) setNarration(next);
}

function syncDebateRailFromEvent(event: PipelineEvent) {
  if (demoExperience !== 'debate' && demoExperience !== 'guided') return;

  const id = String(event.data.id ?? '');

  if (event.type === 'STAGE_START' && event.data.stage === 2) {
    debateRailState = { ...debateRailState, active: true, phase: 'idle' };
  }

  if (event.type === 'STAGE_COMPLETE' && event.data.stage === 2) {
    debateRailState = { ...debateRailState, active: false, personaDone: true };
  }

  if (event.type === 'STAGE_START' && event.data.stage === 3) {
    debateRailState = { ...debateRailState, active: false };
  }

  if (event.type === 'SUBSTEP_START') {
    if (id === 's2_agents') debateRailState = { ...debateRailState, phase: 'hypotheses', agentsReady: 0 };
    if (id === 's2_challenge') debateRailState = { ...debateRailState, phase: 'challenge', challengesDone: 0 };
    if (id === 's2_defense') debateRailState = { ...debateRailState, phase: 'defense', defensesDone: 0 };
    if (id === 's2_synthesis') {
      debateRailState = {
        ...debateRailState,
        phase: 'synthesis',
        synthesisDone: false,
        synthesisPercent: 0,
        synthesisMessage: 'Merging six revised analyses…',
      };
    }
    if (id === 's2_persona') debateRailState = { ...debateRailState, phase: 'persona' };
  }

  if (event.type === 'SUBSTEP_PROGRESS' && id === 's2_synthesis') {
    debateRailState = {
      ...debateRailState,
      phase: 'synthesis',
      synthesisPercent: (event.data.percent as number) ?? debateRailState.synthesisPercent,
      synthesisMessage: (event.data.message as string) ?? debateRailState.synthesisMessage,
    };
  }

  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_agent_')) {
    debateRailState = { ...debateRailState, agentsReady: debateRailState.agentsReady + 1 };
  }
  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_ch_')) {
    debateRailState = { ...debateRailState, challengesDone: debateRailState.challengesDone + 1 };
  }
  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_defense_')) {
    debateRailState = { ...debateRailState, defensesDone: debateRailState.defensesDone + 1 };
  }
  if (event.type === 'SUBSTEP_COMPLETE' && id === 's2_synthesis') {
    debateRailState = {
      ...debateRailState,
      synthesisDone: true,
      synthesisPercent: 100,
      synthesisMessage: 'Synthesis complete',
    };
  }
  if (event.type === 'SUBSTEP_COMPLETE' && id === 's2_persona') {
    debateRailState = { ...debateRailState, personaDone: true };
  }

  notifyCalloutListeners();
}

function resetDebateRail(active: boolean) {
  debateRailState = {
    active,
    phase: active ? 'idle' : 'idle',
    agentsReady: 0,
    challengesDone: 0,
    challengesTotal: 30,
    defensesDone: 0,
    synthesisDone: false,
    synthesisPercent: 0,
    synthesisMessage: '',
    personaDone: false,
  };
}

function applyDemoFocus(callout: DemoCallout, highlight: DemoHighlight | null) {
  const store = useAnalysisStore.getState();
  if (callout.kind === 'complete') return;
  store.setDetailPanelTab('live');
  if (highlight?.substepId) {
    store.setSelectedSubstep(highlight.substepId);
  } else if (callout.kind === 'stage' && callout.stage != null) {
    const first = callout.stage === 1 ? 's1_resolve' : callout.stage === 2 ? 's2_agents' : 's3_state';
    store.setSelectedSubstep(first);
  }
}

export function subscribeDemoCallout(listener: () => void) {
  calloutListeners.add(listener);
  return () => {
    void calloutListeners.delete(listener);
  };
}

export function getDemoCalloutState() {
  return calloutState;
}

export function getDemoHighlight(): DemoHighlight | null {
  return calloutState.highlight;
}

export function getDemoCurtainState() {
  return curtainState;
}

export function getDemoFinaleState() {
  return finaleState;
}

/** @deprecated walkthrough no longer uses a top progress HUD */
export function getDemoInteractiveHud() {
  return { active: false, elapsedSec: 0, beatLabel: '', pipelineState: '', stage: 1, stageProgress: 0, eventProgress: 0 };
}

/** @deprecated */
export function getDemoCinemaHud() {
  return getDemoInteractiveHud();
}

export function getDemoNarrationState() {
  return narrationState;
}

export function getDebateRailState() {
  return debateRailState;
}

export function getDemoExperience() {
  return demoExperience;
}

export function setDemoExperience(mode: DemoExperience) {
  demoExperience = mode;
  notifyCalloutListeners();
}

export function areDemoPausesEnabled() {
  return demoPausesEnabled;
}

export function setDemoPausesEnabled(enabled: boolean) {
  demoPausesEnabled = enabled;
  if (!enabled) {
    setCalloutWaiting(null, false);
    if (advanceResolver) {
      const resolve = advanceResolver;
      advanceResolver = null;
      resolve();
    }
  }
  notifyCalloutListeners();
}

/** @deprecated use setDemoPausesEnabled */
export function setGuidedDemoEnabled(enabled: boolean) {
  setDemoPausesEnabled(enabled);
}

/** @deprecated use areDemoPausesEnabled */
export function isGuidedDemoEnabled() {
  return demoPausesEnabled;
}

export function isDemoReplayActive() {
  return replayController != null;
}

export function isDemoReplayPaused() {
  return replayPaused;
}

export function getDemoReplayProgress() {
  return { index: replayIndex, total: replayTotal, paused: replayPaused };
}

export function setDemoSpeed(multiplier: number) {
  speedMultiplier = Math.max(0.1, Math.min(4, multiplier));
}

export function stopDemoReplay() {
  replayController?.abort();
  replayController = null;
  replayPaused = false;
  resetDebateRail(false);
  narrationState = { visible: false, narration: DEFAULT_NARRATION };
  if (advanceResolver) {
    const resolve = advanceResolver;
    advanceResolver = null;
    resolve();
  }
  setCalloutWaiting(null, false);
  setCurtain(null);
  setFinale(false);
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function waitForUserAdvance(signal: AbortSignal, autoMs: number | null): Promise<void> {
  return new Promise((resolve, reject) => {
    let autoId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (autoId) clearTimeout(autoId);
      advanceResolver = null;
      setCalloutWaiting(null, false);
      resolve();
    };

    advanceResolver = finish;

    if (autoMs != null && autoMs > 0) {
      autoId = setTimeout(finish, autoMs);
    }

    signal.addEventListener(
      'abort',
      () => {
        if (autoId) clearTimeout(autoId);
        if (advanceResolver) {
          advanceResolver = null;
          setCalloutWaiting(null, false);
        }
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function showStageCurtain(stage: number, signal: AbortSignal) {
  setCurtain(stage);
  const stageNarration = narrationFromEvent({
    type: 'STAGE_START',
    job_id: DEMO_JOB_ID,
    data: { stage },
    timestamp: Date.now() / 1000,
  });
  if (stageNarration) setNarration(stageNarration);
  await delay(1200, signal);
  setCurtain(null);
}

async function showFinale(signal: AbortSignal) {
  const autoMs = 4500;
  setFinale(true, Math.ceil(autoMs / 1000), 'full');
  try {
    await waitForUserAdvance(signal, autoMs);
  } finally {
    setFinale(false);
    useAnalysisStore.getState().setDetailPanelTab('report');
    useAnalysisStore.getState().setSelectedSubstep(null);
  }
}

async function showDebateFinale(signal: AbortSignal) {
  setNarration({
    eyebrow: 'Debate council complete · Stage 2',
    title: 'Persona synthesized from deliberation',
    happening:
      'Six agents formed independent hypotheses, exchanged 30 cross-examinations, revised their opinions, and merged evidence into a unified PersonaModel.',
    why: 'This is the epistemic bridge to Stage 3 — explore the Persona tab to inspect identity, psychology, and the 6D state estimate.',
    stage: 2,
    debatePhase: 'persona',
  });
  setFinale(true, null, 'debate');
  try {
    await waitForUserAdvance(signal, null);
  } finally {
    setFinale(false);
    useAnalysisStore.getState().setDetailPanelTab('live');
    useAnalysisStore.getState().setSelectedSubstep('s2_persona');
  }
}

function seedStage1Instantly() {
  const { handleEvent } = useAnalysisStore.getState();
  for (const event of buildStage1SeedEvents(getDemoFixture())) {
    handleEvent(event);
    syncNarrationFromEvent(event);
  }
}

export function advanceDemoStep() {
  if (advanceResolver) advanceResolver();
  else if (finaleState.visible) {
    const kind = finaleState.kind;
    setFinale(false);
    if (kind === 'debate') {
      useAnalysisStore.getState().setDetailPanelTab('live');
      useAnalysisStore.getState().setSelectedSubstep('s2_persona');
    } else {
      useAnalysisStore.getState().setDetailPanelTab('report');
      useAnalysisStore.getState().setSelectedSubstep(null);
    }
  }
}

function shouldIntroCallout(event: PipelineEvent): boolean {
  if (!demoPausesEnabled) return false;
  if (demoExperience === 'debate') return isDebateIntroCheckpoint(event);
  if (demoExperience === 'guided') return isGuidedIntroCheckpoint(event);
  return false;
}

function shouldReviewCallout(event: PipelineEvent): boolean {
  if (!demoPausesEnabled) return false;
  if (demoExperience === 'debate') return isDebateReviewCheckpoint(event);
  if (demoExperience !== 'guided') return false;
  if (isGuidedReviewCheckpoint(event)) return true;
  const id = String(event.data.id ?? '');
  if (id.startsWith('s2_defense_')) return true;
  if (id.startsWith('s3_strain_')) return true;
  return false;
}

async function maybeWaitForIntro(event: PipelineEvent, signal: AbortSignal) {
  if (demoExperience === 'guided' && event.type === 'STAGE_START') {
    await showStageCurtain(event.data.stage as number, signal);
    return;
  }

  if (demoExperience === 'debate' && event.type === 'STAGE_START' && event.data.stage === 2) {
    setNarration(getDebateIntroNarration());
    return;
  }

  if (!shouldIntroCallout(event)) return;

  const callout = introCalloutFromEvent(event);
  if (!callout) return;

  setCalloutWaiting(callout, true, null);
  await waitForUserAdvance(signal, null);
}

async function maybeWaitForReview(event: PipelineEvent, signal: AbortSignal) {
  if (!shouldReviewCallout(event)) return;
  const callout =
    walkthroughExtraReviewCalloutFromEvent(event) ?? reviewCalloutFromEvent(event);
  if (!callout) return;
  setCalloutWaiting(callout, true, null);
  await waitForUserAdvance(signal, null);
}

function gapBefore(event: PipelineEvent, _prev: PipelineEvent | null): number {
  const id = String(event.data.id ?? '');

  if (demoExperience === 'debate') {
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_ch_')) return 280;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_agent_')) return 650;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_defense_')) return 900;
    if (event.type === 'SUBSTEP_COMPLETE') return 400;
    if (event.type === 'SUBSTEP_START') return 350;
    if (event.type === 'STAGE_START') return 500;
    return 120;
  }

  if (demoExperience === 'guided') {
    return walkthroughGapBeforeMs(event) * 2.5;
  }

  return 150;
}

async function replayEvents(events: PipelineEvent[], signal: AbortSignal, startIndex = 0) {
  const { handleEvent } = useAnalysisStore.getState();
  let prev: PipelineEvent | null = startIndex > 0 ? events[startIndex - 1] : null;

  for (let i = startIndex; i < events.length; i++) {
    if (signal.aborted) {
      replayIndex = i;
      return;
    }

    const event = events[i];

    try {
      await maybeWaitForIntro(event, signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        replayIndex = i;
        return;
      }
      throw e;
    }

    if (signal.aborted) {
      replayIndex = i;
      return;
    }

    const wait = gapBefore(event, prev) / speedMultiplier;
    await delay(wait, signal);

    if (signal.aborted) {
      replayIndex = i;
      return;
    }

    handleEvent(event);
    prev = event;
    replayIndex = i + 1;
    syncNarrationFromEvent(event);
    syncDebateRailFromEvent(event);

    if (demoExperience === 'debate' && event.type === 'SUBSTEP_COMPLETE' && event.data.id === 's2_persona') {
      try {
        await showDebateFinale(signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          replayIndex = i + 1;
          return;
        }
        throw e;
      }
      continue;
    }

    if (demoExperience === 'guided' && event.type === 'JOB_COMPLETE') {
      try {
        await showFinale(signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          replayIndex = i + 1;
          return;
        }
        throw e;
      }
      continue;
    }

    try {
      await maybeWaitForReview(event, signal);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        replayIndex = i + 1;
        return;
      }
      throw e;
    }
  }
}

export async function startDemoWalkthrough(options?: {
  resume?: boolean;
  experience?: DemoExperience;
}) {
  demoExperience = options?.experience ?? 'guided';
  demoPausesEnabled = true;
  speedMultiplier = 1;

  const events = buildDemoEvents(getDemoFixture());
  replayTotal = events.length;

  const resume = options?.resume === true && replayIndex > 0 && replayIndex < events.length;

  if (!resume) {
    stopDemoReplay();
    replayIndex = 0;
    replayPaused = false;
    startAnalysisSession(DEMO_JOB_ID, true);
    useAnalysisStore.setState({ detailPanelTab: 'live' });
    setNarration(DEFAULT_NARRATION, true);
  } else {
    replayController?.abort();
    replayController = null;
    replayPaused = false;
  }

  const controller = new AbortController();
  replayController = controller;
  const startIndex = resume ? replayIndex : 0;

  try {
    await replayEvents(events, controller.signal, startIndex);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      replayPaused = replayIndex < events.length;
      return;
    }
    throw e;
  } finally {
    if (replayController === controller) replayController = null;
    if (replayIndex >= events.length) {
      setCalloutWaiting(null, false);
    }
  }
}

export async function startDebateCouncilDemo(options?: { resume?: boolean }) {
  demoExperience = 'debate';
  demoPausesEnabled = true;
  speedMultiplier = 0.85;

  const events = buildDebateCouncilEvents(getDemoFixture());
  replayTotal = events.length;
  const resume = options?.resume === true && replayIndex > 0 && replayIndex < events.length;

  if (!resume) {
    stopDemoReplay();
    replayIndex = 0;
    replayPaused = false;
    startAnalysisSession(DEMO_JOB_ID, true);
    useAnalysisStore.setState({ detailPanelTab: 'live' });
    seedStage1Instantly();
    resetDebateRail(true);
    setNarration(getDebateIntroNarration(), true);
    useAnalysisStore.getState().setSelectedSubstep('s2_agents');
  } else {
    replayController?.abort();
    replayController = null;
    replayPaused = false;
    resetDebateRail(true);
    setNarration(getDebateIntroNarration(), true);
  }

  const controller = new AbortController();
  replayController = controller;
  const startIndex = resume ? replayIndex : 0;

  try {
    await replayEvents(events, controller.signal, startIndex);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      replayPaused = replayIndex < events.length;
      return;
    }
    throw e;
  } finally {
    if (replayController === controller) replayController = null;
    if (replayIndex >= events.length) {
      setCalloutWaiting(null, false);
    }
  }
}

export function pauseDemoReplay() {
  if (!replayController) return;
  replayController.abort();
  replayPaused = replayIndex < replayTotal;
}

export async function rerunDemoStage(stage: number) {
  if (isDemoReplayActive()) return;
  const controller = new AbortController();
  replayController = controller;
  replayPaused = false;

  useAnalysisStore.getState().prepareStageRerun(stage);

  const events = rerunEventsForStage(stage);
  replayTotal = events.length;
  replayIndex = 0;

  try {
    await replayEvents(events, controller.signal, 0);
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
  } finally {
    if (replayController === controller) replayController = null;
  }
}

export function exitDemoMode() {
  stopDemoReplay();
  replayIndex = 0;
  replayTotal = 0;
  demoExperience = 'guided';
  demoPausesEnabled = true;
  useAnalysisStore.getState().reset();
  const url = new URL(window.location.href);
  url.searchParams.delete('demo');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
