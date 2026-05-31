import type { PipelineEvent } from '../types/report';
import { AGENT_LABELS } from '../types/report';
import { STAGE_NAMES } from './demoCallouts';
import type { DemoCallout } from './demoCallouts';

export type DebatePhase = 'hypotheses' | 'challenge' | 'defense' | 'synthesis' | 'persona' | 'idle';

export interface DemoNarration {
  eyebrow: string;
  title: string;
  happening: string;
  why: string;
  stage?: number;
  substepId?: string;
  debatePhase?: DebatePhase;
}

const SUBSTEP_NARRATION: Record<string, Omit<DemoNarration, 'eyebrow'>> = {
  s1_resolve: {
    title: 'Identity resolution',
    happening: 'Normalizing the Instagram URL into a canonical @handle every downstream fetch will use.',
    why: 'A wrong username poisons the entire pipeline — this is the single source of truth for profile identity.',
    stage: 1,
    substepId: 's1_resolve',
  },
  s1_metadata: {
    title: 'Profile metadata',
    happening: 'Pulling public bio, follower counts, verification status, and profile presentation fields.',
    why: 'Audience scale and self-description anchor how agents interpret posting behaviour.',
    stage: 1,
    substepId: 's1_metadata',
  },
  s1_posts: {
    title: 'Post archive',
    happening: 'Paginating the full post grid — 72 posts in this demo — deduplicated across feed sources.',
    why: 'Temporal models need depth; sparse history weakens every forecast downstream.',
    stage: 1,
    substepId: 's1_posts',
  },
  s1_stories: {
    title: 'Stories & highlights',
    happening: 'Capturing ephemeral stories and curated highlight reels outside the main grid.',
    why: 'Stories reveal real-time focus; highlights show intentional self-narrative pillars.',
    stage: 1,
    substepId: 's1_stories',
  },
  s1_engagement: {
    title: 'Engagement depth',
    happening: 'Sampling recent posts for comment threads and liker lists beyond surface metrics.',
    why: 'Audience reaction patterns distinguish broadcast monologue from genuine dialogue.',
    stage: 1,
    substepId: 's1_engagement',
  },
  s1_matrix: {
    title: 'Signal matrix assembly',
    happening: 'Building a chronological table — one row per post with text, hashtags, engagement, and timing.',
    why: 'This matrix is the shared evidence base every debate agent receives — no raw HTML, only structure.',
    stage: 1,
    substepId: 's1_matrix',
  },
  s1_derived: {
    title: 'Derived behavioural signals',
    happening: 'Compressing 72 posts into composite metrics: volatility, engagement slope, topic drift, cadence.',
    why: 'Agents and Stage 3 use these scalars as quick behavioural fingerprints before deep reading.',
    stage: 1,
    substepId: 's1_derived',
  },
  s1_summary: {
    title: 'Signal summary packaging',
    happening: 'Bundling matrix headlines, sample posts, and derived metrics into Stage 2 prompt context.',
    why: 'This summary is the primary input the six-agent council will independently interpret.',
    stage: 1,
    substepId: 's1_summary',
  },
  s2_agents: {
    title: 'Independent agent hypotheses',
    happening: 'Six specialist LLM agents read the same signal summary in parallel — psychology, sociology, narrative, economics, temporality, culture.',
    why: 'Parallel independent reads prevent single-frame blind spots before any cross-examination.',
    stage: 2,
    substepId: 's2_agents',
    debatePhase: 'hypotheses',
  },
  s2_challenge: {
    title: 'Round 1 — Cross-examination',
    happening: 'Each agent challenges every other agent’s hypothesis — 6×5 = 30 structured evidentiary objections.',
    why: 'Challenges surface contradictions and force weak claims into the open before revision.',
    stage: 2,
    substepId: 's2_challenge',
    debatePhase: 'challenge',
  },
  s2_defense: {
    title: 'Round 2 — Hypothesis revision',
    happening: 'Each agent absorbs incoming challenges and revises their claim — updated text, confidence shifts, concession notes.',
    why: 'The revision round separates robust inferences from initial LLM fluency.',
    stage: 2,
    substepId: 's2_defense',
    debatePhase: 'defense',
  },
  s2_synthesis: {
    title: 'Round 3 — Evidentiary synthesis',
    happening: 'Merging six revised analyses into synthesis claim cards with supporting evidence tags.',
    why: 'Synthesis is the evidentiary merge — consensus claims backed by debate, not yet the full persona tab.',
    stage: 2,
    substepId: 's2_synthesis',
    debatePhase: 'synthesis',
  },
  s2_persona: {
    title: 'Unified persona model',
    happening: 'Structuring identity, psychology, social strategy, narrative arc, and 6D behavioural state into one PersonaModel.',
    why: 'This bridge object is what Stage 3 consumes to initialize dynamical state projection.',
    stage: 2,
    substepId: 's2_persona',
    debatePhase: 'persona',
  },
  s3_state: {
    title: '6D state vector estimation',
    happening: 'Mapping each post onto valence, arousal, stability, connectivity, engagement, and ideological salience.',
    why: 'The six-dimensional state is the coordinate system for all dynamical modelling ahead.',
    stage: 3,
    substepId: 's3_state',
  },
  s3_ou: {
    title: 'Ornstein–Uhlenbeck fitting',
    happening: 'Fitting mean-reversion speed, volatility, and equilibrium per dimension with calendar-aware timesteps.',
    why: 'OU dynamics capture how quickly the profile returns to baseline after emotional or topical shocks.',
    stage: 3,
    substepId: 's3_ou',
  },
  s3_portrait: {
    title: 'Phase portrait',
    happening: 'Visualizing valence×arousal vector fields, equilibrium fixed point, and historical trajectory.',
    why: 'Phase portraits make abstract dynamics intuitive — where the profile sits and where it is pulled.',
    stage: 3,
    substepId: 's3_portrait',
  },
  s3_strains: {
    title: 'Narrative belief strains',
    happening: 'Clustering hashtag themes and fitting SIR-style momentum models — spread, decay, and R₀ per strain.',
    why: 'Strains capture which narrative clusters are expanding or fading, independent of mood dynamics.',
    stage: 3,
    substepId: 's3_strains',
  },
  s3_monte: {
    title: 'Monte Carlo ensemble',
    happening: 'Integrating 10,000 perturbed stochastic paths over 365 calendar days — OU drift plus strain shocks.',
    why: 'Ensemble simulation produces confidence bands instead of a single deterministic forecast.',
    stage: 3,
    substepId: 's3_monte',
  },
  s3_narrative: {
    title: 'Horizon narratives & goals',
    happening: 'Reading projected state distributions to narrate 30/90/180/365-day outlooks and strategic goals.',
    why: 'Quantitative forecasts become actionable when translated into human-readable horizon stories.',
    stage: 3,
    substepId: 's3_narrative',
  },
};

const STAGE_NARRATION: Record<number, Omit<DemoNarration, 'eyebrow'>> = {
  1: {
    title: 'Profile signal extraction',
    happening: 'Turning a public Instagram profile into structured data — posts, engagement, matrix, derived metrics.',
    why: 'Everything downstream depends on the quality of this empirical signal layer.',
    stage: 1,
  },
  2: {
    title: 'Multi-agent debate council',
    happening: 'Six agents stress-test each other in three debate rounds before merging into a unified persona.',
    why: 'Single-model analysis can hallucinate coherence — the council forces disagreement, revision, and synthesis.',
    stage: 2,
  },
  3: {
    title: 'Future state projection',
    happening: 'Mapping persona to 6D dynamics, narrative strains, and 10,000-path Monte Carlo simulation.',
    why: 'Converts a static persona snapshot into a probabilistic forecast of how the profile may evolve.',
    stage: 3,
  },
};

const DEBATE_INTRO: DemoNarration = {
  eyebrow: 'Debate council · Stage 2',
  title: 'How the council works',
  happening:
    'Stage 1 is complete — six agents now read the same evidence independently, cross-examine each other, revise opinions, and synthesize a unified persona.',
  why: 'This is the epistemic core of North Star: disagreement is a feature, not a bug.',
  stage: 2,
  debatePhase: 'idle',
};

function eyebrowFor(stage: number, substepId?: string): string {
  if (substepId && SUBSTEP_NARRATION[substepId]) {
    const s = SUBSTEP_NARRATION[substepId];
    return `Stage ${stage} · ${STAGE_NAMES[stage] ?? ''} · ${s.title}`;
  }
  return `Stage ${stage} · ${STAGE_NAMES[stage] ?? ''}`;
}

function fromPartial(partial: Omit<DemoNarration, 'eyebrow'>, eyebrow?: string): DemoNarration {
  const stage = partial.stage ?? 1;
  return {
    ...partial,
    eyebrow: eyebrow ?? eyebrowFor(stage, partial.substepId),
  };
}

export function getDebateIntroNarration(): DemoNarration {
  return DEBATE_INTRO;
}

export function narrationFromCallout(callout: DemoCallout): DemoNarration {
  return {
    eyebrow: callout.pipelineState || callout.badge || 'Spotlight',
    title: callout.title,
    happening: callout.doing,
    why: callout.whyItMatters ?? callout.lookFor,
    stage: callout.stage,
    substepId: callout.substepId,
    debatePhase: callout.substepId?.startsWith('s2_')
      ? (SUBSTEP_NARRATION[callout.substepId]?.debatePhase ?? 'idle')
      : undefined,
  };
}

export function narrationFromEvent(event: PipelineEvent): DemoNarration | null {
  const id = String(event.data.id ?? '');

  if (event.type === 'STAGE_START') {
    const stage = event.data.stage as number;
    const base = STAGE_NARRATION[stage];
    if (!base) return null;
    return fromPartial(base);
  }

  if (event.type === 'STAGE_COMPLETE') {
    const stage = event.data.stage as number;
    return fromPartial({
      title: `${STAGE_NAMES[stage] ?? `Stage ${stage}`} complete`,
      happening: `All Stage ${stage} substeps finished — outputs are frozen and passed downstream.`,
      why: stage < 3 ? 'Review the output panel, then the next stage begins.' : 'Open the full report to explore every artifact.',
      stage,
    });
  }

  if (event.type === 'JOB_COMPLETE') {
    return fromPartial({
      title: 'Analysis complete',
      happening: 'All three stages finished — signal extraction, debate council, and future projection.',
      why: 'The consolidated Persona Dynamics Report is ready to explore.',
      stage: 3,
    });
  }

  if (event.type === 'SUBSTEP_START' || event.type === 'SUBSTEP_COMPLETE') {
    const canonical = SUBSTEP_NARRATION[id];
    if (canonical) {
      const verb = event.type === 'SUBSTEP_START' ? 'Running' : 'Completed';
      return fromPartial({
        ...canonical,
        title: event.type === 'SUBSTEP_COMPLETE' ? `${canonical.title} ✓` : canonical.title,
        happening:
          event.type === 'SUBSTEP_START'
            ? canonical.happening
            : `${verb}: ${canonical.happening.split('.')[0]}.`,
      });
    }
  }

  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_agent_')) {
    const agent = id.replace('s2_agent_', '');
    const label = AGENT_LABELS[agent] ?? agent;
    return fromPartial({
      title: `${label} hypothesis ready`,
      happening: `${label} finished an independent read of the signal summary with a specialist lens.`,
      why: 'Each agent brings a different frame — together they cover psychology, society, narrative, economics, time, and culture.',
      stage: 2,
      substepId: 's2_agents',
      debatePhase: 'hypotheses',
    });
  }

  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_ch_')) {
    const parts = id.replace('s2_ch_', '').split('_');
    const challenger = parts[0] ?? '';
    const target = parts.slice(1).join('_');
    return fromPartial({
      title: 'Challenge recorded',
      happening: `${AGENT_LABELS[challenger] ?? challenger} cross-examines ${AGENT_LABELS[target] ?? target} with a structured objection.`,
      why: 'Every agent challenges every other — 30 total — surfacing contradictions before revision.',
      stage: 2,
      substepId: 's2_challenge',
      debatePhase: 'challenge',
    });
  }

  if (event.type === 'SUBSTEP_COMPLETE' && id.startsWith('s2_defense_')) {
    const agent = id.replace('s2_defense_', '');
    return fromPartial({
      title: `${AGENT_LABELS[agent] ?? agent} revised`,
      happening: `${AGENT_LABELS[agent] ?? agent} absorbed challenges and updated their hypothesis — confidence and claims may shift.`,
      why: 'Opinion change is visible here: compare before/after confidence in the Round 2 panel.',
      stage: 2,
      substepId: 's2_defense',
      debatePhase: 'defense',
    });
  }

  if (event.type === 'SUBSTEP_PROGRESS') {
    const stage = (event.data.stage as number) ?? 1;
    if (id === 's3_monte') {
      return fromPartial({
        title: 'Monte Carlo paths integrating…',
        happening: `Simulating stochastic futures — ${event.data.progress ?? 0}% of 10,000 paths complete.`,
        why: 'Each path perturbs OU parameters and strain shocks to quantify forecast uncertainty.',
        stage: 3,
        substepId: 's3_monte',
      });
    }
    if (id.startsWith('s1_') || id.startsWith('s2_') || id.startsWith('s3_')) {
      const canonical = SUBSTEP_NARRATION[id.split('_progress')[0]] ?? SUBSTEP_NARRATION[id];
      if (canonical) return fromPartial(canonical);
    }
    return fromPartial({
      title: String(event.data.label ?? id),
      happening: `Processing ${id.replace(/_/g, ' ')}…`,
      why: 'Watch the timeline and detail panel for live output.',
      stage,
    });
  }

  return null;
}

export const DEFAULT_NARRATION: DemoNarration = {
  eyebrow: 'North Star demo',
  title: 'Pipeline running',
  happening: 'Events stream into the same UI as a live analysis — timeline, detail panels, and report tabs update in real time.',
  why: 'This replay uses pre-built fixture data for @demo_creator so you can explore the full pipeline without API calls.',
};
