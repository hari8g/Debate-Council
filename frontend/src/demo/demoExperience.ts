import type { PipelineEvent } from '../types/report';

export type DemoExperience = 'guided' | 'debate';

export const STAGE_TAGLINES: Record<number, string> = {
  1: 'Temporal signal matrix · engagement depth · derived metrics',
  2: 'Six-agent epistemic debate · 30 cross-examinations · persona synthesis',
  3: 'Ornstein–Uhlenbeck fit · SIR belief strains · 10,000-path Monte Carlo',
};

export const STAGE_METHODOLOGY: Record<number, string[]> = {
  1: ['Signal matrix', 'Stage 3 driver metrics', 'Topic drift', 'Engagement slope'],
  2: ['Multi-agent LLM', 'Delphi council', 'Confidence calibration', 'PersonaModel'],
  3: ['OU process', 'Phase portrait', 'Adaptive SIR strains', 'Ensemble MC'],
};

/** Delay between replay events (walkthrough uses slower multiplier in demoRunner). */
export function walkthroughGapBeforeMs(event: PipelineEvent): number {
  const id = String(event.data.id ?? '');
  const stage =
    (event.data.stage as number) ??
    (id.startsWith('s1_') ? 1 : id.startsWith('s2_') ? 2 : id.startsWith('s3_') ? 3 : 0);

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
    if (event.type === 'SUBSTEP_PROGRESS' && id === 's2_synthesis') return 280;
    if (event.type === 'SUBSTEP_PROGRESS' && id === 's2_persona') return 200;
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
  guided: {
    title: 'Detailed walkthrough',
    subtitle: 'Full pipeline tour · compact “up next” panel · tap to continue at each step',
    duration: '~15–25 min',
  },
  debate: {
    title: 'Debate council',
    subtitle: 'Stage 2 only · R1–R3 glass panels · council rail · manual round pauses',
    duration: '~8–12 min',
  },
};

export const DEMO_TOUR_LINKS = {
  walkthrough: { param: '1', label: 'Detailed walkthrough', path: '/?demo=1' },
  debate: { param: 'debate', label: 'Debate council', path: '/?demo=debate' },
} as const;
