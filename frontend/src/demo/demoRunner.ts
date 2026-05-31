import { startAnalysisSession, useAnalysisStore } from '../store/analysisStore';
import type { PipelineEvent } from '../types/report';
import {
  highlightForCallout,
  introCalloutFromEvent,
  isGuidedIntroCheckpoint,
  isGuidedReviewCheckpoint,
  reviewCalloutFromEvent,
  type DemoCallout,
  type DemoHighlight,
} from './demoCallouts';
import { buildDemoEvents, getDemoFixture, rerunEventsForStage } from './buildDemoEvents';
import { DEMO_JOB_ID } from './buildDemoFixture';

let replayController: AbortController | null = null;
let speedMultiplier = 0.15;
let replayIndex = 0;
let replayTotal = 0;
let replayPaused = false;
let guidedMode = true;

let advanceResolver: (() => void) | null = null;
let calloutState: {
  callout: DemoCallout | null;
  waiting: boolean;
  highlight: DemoHighlight | null;
} = {
  callout: null,
  waiting: false,
  highlight: null,
};
const calloutListeners = new Set<() => void>();

function notifyCalloutListeners() {
  calloutListeners.forEach((fn) => fn());
}

function setCalloutWaiting(callout: DemoCallout | null, waiting: boolean) {
  const highlight = callout ? highlightForCallout(callout) : null;
  calloutState = { callout, waiting, highlight };
  if (callout && waiting) applyDemoFocus(callout, highlight);
  notifyCalloutListeners();
}

function applyDemoFocus(callout: DemoCallout, highlight: DemoHighlight | null) {
  const store = useAnalysisStore.getState();
  if (callout.kind === 'complete') {
    store.setDetailPanelTab('report');
    store.setSelectedSubstep(null);
    return;
  }
  store.setDetailPanelTab('live');
  if (highlight?.substepId) {
    store.setSelectedSubstep(highlight.substepId);
  } else if (callout.kind === 'stage' && callout.stage != null) {
    const first =
      callout.stage === 1
        ? 's1_resolve'
        : callout.stage === 2
          ? 's2_agents'
          : 's3_state';
    store.setSelectedSubstep(first);
  } else if (callout.kind === 'stage_done' && callout.stage != null) {
    const last =
      callout.stage === 1
        ? 's1_summary'
        : callout.stage === 2
          ? 's2_persona'
          : 's3_narrative';
    store.setSelectedSubstep(last);
  }
}

export function subscribeDemoCallout(listener: () => void) {
  calloutListeners.add(listener);
  return () => {
    calloutListeners.delete(listener);
  };
}

export function getDemoCalloutState() {
  return calloutState;
}

export function getDemoHighlight(): DemoHighlight | null {
  return calloutState.highlight;
}

export function isGuidedDemoEnabled() {
  return guidedMode;
}

export function setGuidedDemoEnabled(enabled: boolean) {
  guidedMode = enabled;
  if (!enabled && advanceResolver) {
    setCalloutWaiting(null, false);
    const resolve = advanceResolver;
    advanceResolver = null;
    resolve();
  }
  notifyCalloutListeners();
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
  if (advanceResolver) {
    const resolve = advanceResolver;
    advanceResolver = null;
    resolve();
  }
  setCalloutWaiting(null, false);
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

function waitForUserAdvance(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    advanceResolver = () => {
      advanceResolver = null;
      setCalloutWaiting(null, false);
      resolve();
    };
    signal.addEventListener(
      'abort',
      () => {
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

export function advanceDemoStep() {
  if (advanceResolver) advanceResolver();
}

function gapBefore(event: PipelineEvent, prev: PipelineEvent | null): number {
  let ms = 150;
  if (!prev) ms = 200;
  else if (event.type === 'SUBSTEP_PROGRESS') ms = 80;
  else if (event.type === 'SUBSTEP_COMPLETE' && String(event.data.id).startsWith('s2_ch_')) ms = 60;
  else if (event.type === 'SUBSTEP_COMPLETE') ms = 180;
  else if (event.type === 'SUBSTEP_START') ms = 120;
  else if (event.type === 'STAGE_START') ms = 350;
  else if (event.type === 'STAGE_COMPLETE') ms = 400;
  else if (event.type === 'JOB_COMPLETE') ms = 500;
  else if (event.type === 'REPORT_UPDATE') ms = 300;

  if (guidedMode) ms *= 2.5;
  return ms;
}

async function maybeWaitForCallout(callout: DemoCallout | null, signal: AbortSignal) {
  if (!guidedMode || !callout) return;
  setCalloutWaiting(callout, true);
  await waitForUserAdvance(signal);
}

async function maybeWaitForIntro(event: PipelineEvent, signal: AbortSignal) {
  if (!guidedMode || !isGuidedIntroCheckpoint(event)) return;
  await maybeWaitForCallout(introCalloutFromEvent(event), signal);
}

async function maybeWaitForReview(event: PipelineEvent, signal: AbortSignal) {
  if (!guidedMode || !isGuidedReviewCheckpoint(event)) return;
  await maybeWaitForCallout(reviewCalloutFromEvent(event), signal);
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

export async function startDemoWalkthrough(options?: { resume?: boolean; guided?: boolean }) {
  if (options?.guided != null) guidedMode = options.guided;

  const events = buildDemoEvents(getDemoFixture());
  replayTotal = events.length;

  const resume = options?.resume === true && replayIndex > 0 && replayIndex < events.length;

  if (!resume) {
    stopDemoReplay();
    replayIndex = 0;
    replayPaused = false;
    startAnalysisSession(DEMO_JOB_ID, true);
    useAnalysisStore.setState({ detailPanelTab: 'live' });
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
    if (replayIndex >= events.length) setCalloutWaiting(null, false);
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
  guidedMode = true;
  useAnalysisStore.getState().reset();
  const url = new URL(window.location.href);
  url.searchParams.delete('demo');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
