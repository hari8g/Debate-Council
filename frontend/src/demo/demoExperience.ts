import type { DemoCallout } from './demoCallouts';
import type { PipelineEvent } from '../types/report';

export type DemoExperience = 'interactive' | 'guided' | 'freerun' | 'debate';

/** Target runtime for interactive demo HUD timer (pipeline pacing is stage-weighted separately). */
export const INTERACTIVE_TARGET_SECONDS = 420;

export const STAGE_TAGLINES: Record<number, string> = {
  1: 'Temporal signal matrix · engagement depth · derived metrics',
  2: 'Six-agent epistemic debate · 30 cross-examinations · persona synthesis',
  3: 'Ornstein–Uhlenbeck fit · SIR belief strains · 10,000-path Monte Carlo',
};

export const STAGE_METHODOLOGY: Record<number, string[]> = {
  1: ['Instaloader REST', 'Signal matrix', 'Topic drift', 'Engagement slope'],
  2: ['Multi-agent LLM', 'Delphi council', 'Confidence calibration', 'PersonaModel'],
  3: ['OU process', 'Phase portrait', 'Adaptive SIR strains', 'Ensemble MC'],
};

/** Substep intros that get a spotlight callout (stage intros use curtain). */
export const INTERACTIVE_SUBSTEP_BEATS = new Set([
  's1_matrix',
  's1_summary',
  's2_agents',
  's2_challenge',
  's2_defense',
  's2_synthesis',
  's2_persona',
  's3_state',
  's3_ou',
  's3_portrait',
  's3_strains',
  's3_monte',
  's3_narrative',
]);

/** Manual review pauses after these substeps complete — Round 2/3 + all Stage 3 phases. */
const INTERACTIVE_REVIEW_IDS = new Set([
  's2_challenge',
  's2_defense',
  's2_synthesis',
  's2_persona',
  's3_state',
  's3_ou',
  's3_portrait',
  's3_strains',
  's3_monte',
  's3_narrative',
]);

export function isInteractiveIntroCheckpoint(event: PipelineEvent): boolean {
  if (event.type !== 'SUBSTEP_START') return false;
  return INTERACTIVE_SUBSTEP_BEATS.has(String(event.data.id));
}

export function isInteractiveFinaleEvent(event: PipelineEvent): boolean {
  return event.type === 'JOB_COMPLETE';
}

export function isInteractiveReviewCheckpoint(event: PipelineEvent): boolean {
  if (event.type !== 'SUBSTEP_COMPLETE') return false;
  const id = String(event.data.id ?? '');
  if (INTERACTIVE_REVIEW_IDS.has(id)) return true;
  if (id.startsWith('s2_defense_')) return true;
  if (id.startsWith('s3_strain_')) return true;
  return false;
}

export function interactiveCalloutDurationMs(callout: DemoCallout): number {
  if (callout.kind === 'complete') return 5000;
  if (callout.substepId === 's2_defense') return 6200;
  if (callout.substepId === 's2_synthesis') return 5800;
  if (callout.substepId === 's2_persona') return 5400;
  if (callout.substepId === 's2_challenge') return 4800;
  if (callout.substepId === 's3_monte') return 5600;
  if (callout.substepId === 's3_ou') return 5200;
  if (callout.substepId === 's3_strains') return 5000;
  if (callout.substepId === 's3_portrait') return 4800;
  if (callout.substepId === 's3_state') return 4600;
  if (callout.substepId === 's3_narrative') return 4800;
  return 4000;
}

function inferStage(id: string, explicit?: number): number {
  if (explicit != null && explicit > 0) return explicit;
  if (id.startsWith('s1_')) return 1;
  if (id.startsWith('s2_')) return 2;
  if (id.startsWith('s3_')) return 3;
  return 0;
}

/** Delay before each pipeline event in interactive mode (curtains/callouts use separate timers). */
export function interactiveGapBeforeMs(event: PipelineEvent): number {
  const id = String(event.data.id ?? '');
  const stage = inferStage(id, event.data.stage as number | undefined);

  if (stage === 1) {
    if (event.type === 'SUBSTEP_PROGRESS') return 40;
    if (event.type === 'SUBSTEP_COMPLETE') return 70;
    if (event.type === 'SUBSTEP_START') return 42;
    if (event.type === 'STAGE_COMPLETE') return 320;
    return 35;
  }

  if (stage === 2) {
    if (event.type === 'SUBSTEP_PROGRESS' && id === 's2_challenge') return 55;
    if (event.type === 'SUBSTEP_PROGRESS' && id === 's2_defense') return 220;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_ch_')) return 85;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_agent_')) return 180;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_defense_')) return 520;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's2_synthesis') return 680;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's2_persona') return 580;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's2_defense') return 450;
    if (event.type === 'SUBSTEP_COMPLETE') return 160;
    if (event.type === 'SUBSTEP_START' && (id === 's2_defense' || id === 's2_synthesis' || id === 's2_persona')) return 180;
    if (event.type === 'SUBSTEP_START') return 100;
    if (event.type === 'STAGE_COMPLETE') return 650;
    return 85;
  }

  if (stage === 3) {
    if (event.type === 'SUBSTEP_PROGRESS' && id === 's3_monte') return 950;
    if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s3_strain_')) return 380;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_ou') return 520;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_state') return 480;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_portrait') return 500;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_monte') return 620;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_narrative') return 480;
    if (event.type === 'SUBSTEP_COMPLETE' && id === 's3_strains') return 420;
    if (event.type === 'SUBSTEP_COMPLETE') return 280;
    if (event.type === 'SUBSTEP_START') return 160;
    if (event.type === 'STAGE_COMPLETE') return 600;
    return 120;
  }

  if (event.type === 'STAGE_START') return 50;
  if (event.type === 'JOB_COMPLETE') return 240;
  return 42;
}

/** Stage 2 debate-only demo — interactive pauses at each council round. */
export const DEBATE_INTRO_CHECKPOINTS = new Set([
  's2_agents',
  's2_challenge',
  's2_defense',
  's2_synthesis',
  's2_persona',
]);

export const DEBATE_REVIEW_CHECKPOINTS = new Set([
  's2_agents',
  's2_challenge',
  's2_defense',
  's2_synthesis',
  's2_persona',
]);

export function isDebateIntroCheckpoint(event: PipelineEvent): boolean {
  if (event.type !== 'SUBSTEP_START') return false;
  return DEBATE_INTRO_CHECKPOINTS.has(String(event.data.id));
}

export function isDebateReviewCheckpoint(event: PipelineEvent): boolean {
  if (event.type !== 'SUBSTEP_COMPLETE') return false;
  return DEBATE_REVIEW_CHECKPOINTS.has(String(event.data.id));
}

export const EXPERIENCE_LABELS: Record<DemoExperience, { title: string; subtitle: string; duration: string }> = {
  interactive: {
    title: 'Interactive demo',
    subtitle: 'Rich callouts · dwell on debate Rounds 2–3 & full Stage 3 math · ~7 min',
    duration: '~7 min',
  },
  debate: {
    title: 'Debate council',
    subtitle: 'Stage 2 only · agents form & revise opinions · synthesis explained',
    duration: '~8–12 min',
  },
  guided: {
    title: 'Deep dive walkthrough',
    subtitle: 'Intro + review callouts at every substep · you control the pace',
    duration: '~15–25 min',
  },
  freerun: {
    title: 'Free run',
    subtitle: 'No callouts · full pipeline replay at your chosen speed',
    duration: '~3–8 min',
  },
};

/** @deprecated use INTERACTIVE_TARGET_SECONDS */
export const CINEMA_TARGET_SECONDS = INTERACTIVE_TARGET_SECONDS;
