import type { DemoCallout } from './demoCallouts';
import {
  getSubstepCalloutBrief,
  GUIDED_MOMENT_IDS,
  STAGE_NAMES,
  SUBSTEP_ORDER_BY_STAGE,
} from './demoCallouts';

export interface WalkthroughBeat {
  title: string;
  hint: string;
}

/** First sentence or short clip — keeps walkthrough panels scannable. */
export function walkthroughClip(text: string, maxLen = 96): string {
  const one = text.replace(/\s+/g, ' ').trim();
  const sentence = one.match(/^[^.!?]+[.!?]/)?.[0]?.trim() ?? one;
  const base = sentence.length <= maxLen ? sentence : one;
  if (base.length <= maxLen) return base;
  return `${base.slice(0, maxLen - 1).trim()}…`;
}

export function momentIdFromCallout(callout: DemoCallout): string | null {
  if (callout.kind === 'complete') return 'job_complete';
  if (callout.kind === 'stage' && callout.stage != null) return `stage_${callout.stage}_start`;
  if (callout.kind === 'stage_done' && callout.stage != null) return `stage_${callout.stage}_done`;
  if (callout.kind === 'substep' && callout.substepId) return `${callout.substepId}_intro`;
  if (callout.kind === 'review' && callout.substepId) return `${callout.substepId}_review`;
  return null;
}

function previewFromMomentId(momentId: string): WalkthroughBeat | null {
  if (momentId === 'job_complete') {
    return { title: 'Full report', hint: 'Consolidated pipeline output' };
  }
  if (momentId.startsWith('stage_') && momentId.endsWith('_start')) {
    const stage = Number(momentId.split('_')[1]);
    const names: Record<number, string> = {
      1: 'Profile signals',
      2: 'Debate council',
      3: 'Future projection',
    };
    return { title: names[stage] ?? `Stage ${stage}`, hint: STAGE_NAMES[stage] ?? '' };
  }
  if (momentId.startsWith('stage_') && momentId.endsWith('_done')) {
    const stage = Number(momentId.split('_')[1]);
    return { title: `Stage ${stage} wrap-up`, hint: 'Review outputs, then continue' };
  }
  const subId = momentId.replace(/_intro$|_review$/, '');
  const meta = getSubstepCalloutBrief(subId);
  if (!meta) return null;
  if (momentId.endsWith('_review')) {
    return { title: `Review · ${meta.title}`, hint: 'Check the right-hand panel' };
  }
  return { title: meta.title, hint: walkthroughClip(meta.doing, 72) };
}

export function getNextWalkthroughBeat(callout: DemoCallout): WalkthroughBeat | null {
  const current = momentIdFromCallout(callout);
  if (!current) return null;
  const idx = GUIDED_MOMENT_IDS.indexOf(current);
  if (idx < 0 || idx >= GUIDED_MOMENT_IDS.length - 1) return null;
  return previewFromMomentId(GUIDED_MOMENT_IDS[idx + 1]);
}

export function walkthroughStageProgress(callout: DemoCallout): { stage: number; index: number; total: number } | null {
  if (callout.substepId) {
    const stage = callout.stage ?? 1;
    const order = SUBSTEP_ORDER_BY_STAGE[stage] ?? [];
    const index = order.indexOf(callout.substepId);
    if (index >= 0) return { stage, index: index + 1, total: order.length };
  }
  if (callout.stage != null) {
    return { stage: callout.stage, index: 0, total: SUBSTEP_ORDER_BY_STAGE[callout.stage]?.length ?? 0 };
  }
  return null;
}

export function primaryWalkthroughLine(callout: DemoCallout, isReview: boolean): string {
  if (isReview) return walkthroughClip(callout.lookFor, 88);
  return walkthroughClip(callout.doing, 88);
}

export function glanceWalkthroughLine(callout: DemoCallout, isReview: boolean): string | null {
  if (isReview) return null;
  return walkthroughClip(callout.lookFor, 72);
}
