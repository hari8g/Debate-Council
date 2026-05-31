import type { PipelineEvent } from '../types/report';

export type DemoHighlightMode = 'up_next' | 'running' | 'review' | 'stage' | 'stage_done' | 'complete';

export interface DemoCallout {
  kind: 'stage' | 'substep' | 'stage_done' | 'complete' | 'review';
  stage?: number;
  substepId?: string;
  title: string;
  pipelineState: string;
  stateLabel: string;
  doing: string;
  lookFor: string;
  whyItMatters?: string;
  deepDive?: string;
  inputs?: string;
  outputs?: string;
  badge?: string;
  stepIndex?: number;
  stepTotal?: number;
}

export interface DemoHighlight {
  stage?: number;
  substepId?: string | null;
  mode: DemoHighlightMode;
}

const CANONICAL_SUBSTEPS = new Set([
  's1_resolve',
  's1_metadata',
  's1_posts',
  's1_stories',
  's1_engagement',
  's1_matrix',
  's1_derived',
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

const STAGE_NAMES: Record<number, string> = {
  1: 'Profile signal extraction',
  2: 'Multi-agent debate council',
  3: 'Future state projection',
};

const SUBSTEP_STAGE: Record<string, number> = Object.fromEntries(
  [...CANONICAL_SUBSTEPS].map((id) => [id, id.startsWith('s1_') ? 1 : id.startsWith('s2_') ? 2 : 3]),
);

const SUBSTEP_ORDER_BY_STAGE: Record<number, string[]> = {
  1: ['s1_resolve', 's1_metadata', 's1_posts', 's1_stories', 's1_engagement', 's1_matrix', 's1_derived', 's1_summary'],
  2: ['s2_agents', 's2_challenge', 's2_defense', 's2_synthesis', 's2_persona'],
  3: ['s3_state', 's3_ou', 's3_portrait', 's3_strains', 's3_monte', 's3_narrative'],
};

/** Ordered guided moments for progress counter (intro + review per substep). */
export const GUIDED_MOMENT_IDS: string[] = [
  'stage_1_start',
  ...SUBSTEP_ORDER_BY_STAGE[1].flatMap((id) => [`${id}_intro`, `${id}_review`]),
  'stage_1_done',
  'stage_2_start',
  ...SUBSTEP_ORDER_BY_STAGE[2].flatMap((id) => [`${id}_intro`, `${id}_review`]),
  'stage_2_done',
  'stage_3_start',
  ...SUBSTEP_ORDER_BY_STAGE[3].flatMap((id) => [`${id}_intro`, `${id}_review`]),
  'stage_3_done',
  'job_complete',
];

interface CalloutContent {
  title: string;
  doing: string;
  lookFor: string;
  whyItMatters?: string;
  deepDive?: string;
  inputs?: string;
  outputs?: string;
  badge?: string;
}

function stageFromSubstep(id: string): number {
  return SUBSTEP_STAGE[id] ?? 1;
}

function substepIndexInStage(id: string): number {
  const stage = stageFromSubstep(id);
  return (SUBSTEP_ORDER_BY_STAGE[stage]?.indexOf(id) ?? -1) + 1;
}

function substepTotalInStage(stage: number): number {
  return SUBSTEP_ORDER_BY_STAGE[stage]?.length ?? 0;
}

function pipelineStateLabel(stage: number, substepId?: string, substepTitle?: string): string {
  const stageName = STAGE_NAMES[stage] ?? `Stage ${stage}`;
  if (!substepId) return `Stage ${stage} · ${stageName}`;
  const idx = substepIndexInStage(substepId);
  const total = substepTotalInStage(stage);
  return `Stage ${stage} · ${stageName} · ${substepTitle ?? substepId} (${idx}/${total})`;
}

function momentStepIndex(momentId: string): number {
  const i = GUIDED_MOMENT_IDS.indexOf(momentId);
  return i >= 0 ? i + 1 : 0;
}

function baseMeta(momentId: string): Pick<DemoCallout, 'stepIndex' | 'stepTotal'> {
  return { stepIndex: momentStepIndex(momentId), stepTotal: GUIDED_MOMENT_IDS.length };
}

const STAGE_CALLOUTS: Record<number, CalloutContent> = {
  1: {
    title: 'Stage 1 — Profile signal extraction',
    doing:
      'North Star turns a public Instagram profile into structured data: username resolution, metadata, post archive, engagement enrichment, a temporal signal matrix, derived metrics, and a summary object for Stage 2.',
    lookFor: 'The left timeline lists eight substeps. Each will light up in sequence; the right panel shows detail when a substep is selected.',
    whyItMatters:
      'Everything downstream — agent debate and dynamical modelling — depends on the quality and completeness of this signal layer.',
    deepDive:
      'Stage 1 is pure ingestion and feature engineering. No LLM persona inference yet. The signal matrix is the shared evidence base: one row per post, columns for text, hashtags, engagement, and timing.',
    inputs: 'Instagram profile URL → @demo_creator',
    outputs: 'Signal matrix, derived signals, signal summary',
    badge: 'Stage 1',
  },
  2: {
    title: 'Stage 2 — Multi-agent debate council',
    doing:
      'Six specialist agents read the Stage 1 summary independently, then stress-test each other in three debate rounds before merging into a unified persona model.',
    lookFor: 'Agent cards stream in, then Round 1/2/3 panels. Individual challenges appear as nested timeline items between callouts.',
    whyItMatters:
      'Single-model analysis can hallucinate coherence. The council forces disagreement, revision, and explicit synthesis.',
    deepDive:
      'Round 1 generates 30 challenges (every agent × every other agent). Round 2 produces six revised hypotheses. Round 3 merges claims into synthesis cards and a structured PersonaModel.',
    inputs: 'Signal summary + matrix samples from Stage 1',
    outputs: 'Agent hypotheses, debate record, persona model',
    badge: 'Stage 2',
  },
  3: {
    title: 'Stage 3 — Future state projection',
    doing:
      'Posts are mapped to a 6D psychological state, fitted with Ornstein–Uhlenbeck dynamics, decomposed into narrative strains, simulated 10,000 Monte Carlo paths, and narrated across four horizons.',
    lookFor: 'Math explainers, phase portraits, strain cards, MC fan chart, and future narrative panels populate on the right.',
    whyItMatters:
      'This stage converts a static persona snapshot into a probabilistic forecast — how the profile may evolve under noise and thematic momentum.',
    deepDive:
      'OU models mean-reversion toward a personal baseline. SIR-style strains capture hashtag theme momentum. Monte Carlo couples both with calendar-aware timesteps. The goals agent reads projected state to infer strategic focus.',
    inputs: 'Persona model + signal matrix time series',
    outputs: 'OU params, phase portrait, strains, MC distribution, narratives',
    badge: 'Stage 3',
  },
};

const STAGE_DONE: Record<number, CalloutContent> = {
  1: {
    title: 'Stage 1 complete',
    doing: 'All ingestion substeps finished. Signal matrix, derived metrics, and enrichment summary are frozen and passed to Stage 2.',
    lookFor: 'Stage 1 header shows complete (green). Click any Stage 1 substep to re-inspect its output.',
    whyItMatters: 'Stage 2 agents cannot run until this artifact bundle exists.',
    outputs: 'signal_summary, derived_signals, signal_matrix → debate council',
    badge: 'Stage 1 ✓',
  },
  2: {
    title: 'Stage 2 complete',
    doing: 'Debate council finished. Persona model and full debate record are ready for dynamical modelling in Stage 3.',
    lookFor: 'Persona tab shows identity, psychology, social strategy, and 6D state estimate.',
    whyItMatters: 'Stage 3 needs the fused persona and debate trajectory as behavioural context.',
    outputs: 'persona_model, debate_record → projection engine',
    badge: 'Stage 2 ✓',
  },
  3: {
    title: 'Stage 3 complete',
    doing: 'Projection pipeline finished. OU fit, strains, Monte Carlo, and narratives are packaged into the final report.',
    lookFor: 'Monte Carlo and future narrative panels hold the full horizon outlook.',
    whyItMatters: 'This is the quantitative core of the North Star forecast.',
    outputs: 'future_state, future_narrative → consolidated report',
    badge: 'Stage 3 ✓',
  },
};

const SUBSTEP_CALLOUTS: Record<string, CalloutContent> = {
  s1_resolve: {
    title: 'Resolve profile',
    doing: 'Parses the Instagram URL or @handle into a canonical username. All API calls, file paths, and report headers use this ID.',
    lookFor: 'Substep completes with username @demo_creator in the payload.',
    whyItMatters: 'Wrong username resolution poisons every downstream fetch.',
    deepDive: 'Handles instagram.com URLs, bare handles, and trailing slashes. No content is fetched yet — only identity normalization.',
    inputs: 'Profile URL',
    outputs: 'Canonical username',
    badge: 'Stage 1',
  },
  s1_metadata: {
    title: 'Fetch profile metadata',
    doing: 'Pulls public profile fields: bio, follower/following counts, verification badge, external link, profile picture URL.',
    lookFor: 'ProfileMetadataPanel with follower stats, bio text, and verification flag.',
    whyItMatters: 'Metadata anchors scale (audience size) and self-presentation (bio) for agent context.',
    deepDive: 'Only public fields are read. Private accounts fail here unless authenticated.',
    inputs: 'Username',
    outputs: 'Profile metadata object',
    badge: 'Stage 1',
  },
  s1_posts: {
    title: 'Fetch posts',
    doing: 'Paginates the full post archive — 72 posts in this demo — deduplicating by media ID across timeline, feed, and reels sources.',
    lookFor: 'Progress bar in timeline ("Page 1/4…"). Completion shows posts_analysed: 72 and fetch_all_posts: true.',
    whyItMatters: 'Sparse post history weakens temporal models. Full archive mode maximizes signal for Stage 3.',
    deepDive: 'Lookback windows (90d/360d) are available in live runs. This demo uses full archive to show maximum pipeline depth.',
    inputs: 'Username + fetch policy',
    outputs: 'Deduped post list (captions, timestamps, engagement)',
    badge: 'Stage 1',
  },
  s1_stories: {
    title: 'Stories & highlights',
    doing: 'Captures active stories and highlight reels — ephemeral and curated content absent from the main grid.',
    lookFor: 'Payload counts for stories and highlights.',
    whyItMatters: 'Stories reveal real-time preoccupations; highlights show curated self-narrative pillars.',
    inputs: 'Username',
    outputs: 'Stories + highlights metadata',
    badge: 'Stage 1',
  },
  s1_engagement: {
    title: 'Post engagement depth',
    doing: 'Samples the 10 most recent posts and fetches comment threads plus liker lists to enrich interaction signals beyond like counts.',
    lookFor: 'EngagementDepthPanel — posts enriched, comments fetched, sample comment themes.',
    whyItMatters: 'Audience reaction patterns distinguish broadcast vs dialogue posting styles.',
    deepDive: 'Rate-limited in live runs. Demo fixture simulates 840 comments across 10 posts.',
    inputs: 'Recent post IDs',
    outputs: 'Enrichment bundle (comments, likers, capture report)',
    badge: 'Stage 1',
  },
  s1_matrix: {
    title: 'Build signal matrix',
    doing: 'Assembles a chronological matrix: one row per post with caption text, hashtags, engagement rate, and days since previous post.',
    lookFor: 'SignalMatrixFlow — scrollable timeline of posts with signal columns.',
    whyItMatters: 'This matrix is the primary evidence artifact every Stage 2 agent receives.',
    deepDive: '72 rows × feature columns. Agents never see raw Instagram HTML — only this structured matrix.',
    inputs: 'Post list + enrichment',
    outputs: 'ProfileSignalMatrix',
    badge: 'Stage 1',
  },
  s1_derived: {
    title: 'Compute derived signals',
    doing: 'Aggregates matrix into composite metrics: posting regularity, emotional volatility, engagement slope, topic drift, caption length trends.',
    lookFor: 'DerivedMetrics tiles with directional indicators (↑ ↓ →).',
    whyItMatters: 'Agents and Stage 3 use these aggregates as quick behavioural fingerprints.',
    deepDive: 'Derived signals compress 72 posts into ~15 interpretable scalars and trend labels.',
    inputs: 'Signal matrix',
    outputs: 'DerivedSignals object',
    badge: 'Stage 1',
  },
  s1_summary: {
    title: 'Signal summary',
    doing: 'Packages matrix headline stats, sample posts, enrichment notes, and derived metrics into a narrative-ready summary for Stage 2.',
    lookFor: 'SignalSummaryFlow with follower count, post samples, and key metrics.',
    whyItMatters: 'This is the primary prompt context for all six debate agents.',
    inputs: 'Matrix + derived + enrichment',
    outputs: 'SignalSummary → Stage 2',
    badge: 'Stage 1',
  },
  s2_agents: {
    title: 'Agent hypotheses',
    doing: 'Six LLM agents analyse the signal summary in parallel, each from a specialist lens: psychology, sociology, narrative, economics, temporality, culture.',
    lookFor: 'AgentCouncilIntroPanel — six cards appear sequentially with hypothesis text and confidence.',
    whyItMatters: 'Parallel independent reads prevent single-frame blind spots.',
    deepDive: 'Agents: Psychographer, Sociologist, Narrative Analyst, Behavioural Economist, Temporal Analyst, Cultural Context Analyst.',
    inputs: 'Signal summary + matrix excerpts',
    outputs: '6 × AgentHypothesis',
    badge: 'Stage 2',
  },
  s2_challenge: {
    title: 'Round 1 — Challenges',
    doing: 'Each agent cross-examines every other agent’s hypothesis — 6×5 = 30 structured challenge calls with specific evidentiary objections.',
    lookFor: 'Round1LivePanel + animated challenge network. Timeline nests individual s2_ch_* items.',
    whyItMatters: 'Challenges surface contradictions and force agents to defend weak claims.',
    deepDive: 'Between callouts, watch challenges stream in at reduced speed — each line is one agent → target pair.',
    inputs: '6 original hypotheses',
    outputs: '30 Challenge objects',
    badge: 'Stage 2',
  },
  s2_defense: {
    title: 'Round 2 — Defenses',
    doing: 'Each agent revises their hypothesis after absorbing all incoming challenges — updated claims, confidence shifts, concession notes.',
    lookFor: 'Round2LivePanel with before/after confidence and revision summaries.',
    whyItMatters: 'Revision round separates robust inferences from initial LLM fluency.',
    inputs: 'Hypotheses + challenges',
    outputs: '6 × RevisedHypothesis',
    badge: 'Stage 2',
  },
  s2_synthesis: {
    title: 'Round 3 — Synthesis',
    doing: 'Merges six revised analyses into synthesis claim cards and debate trajectory visualizations — the evidentiary merge, not yet the full persona tab layout.',
    lookFor: 'Round3LivePanel claim cards with supporting evidence tags.',
    whyItMatters: 'Synthesis is the evidentiary merge before structural persona modeling.',
    inputs: 'Revised hypotheses + debate record',
    outputs: 'Synthesis claims + PersonaModel seed',
    badge: 'Stage 2',
  },
  s2_persona: {
    title: 'Unified persona model',
    doing: 'Structures identity, psychology, social strategy, narrative arc, preferences, and estimated 6D behavioural state into one PersonaModel object.',
    lookFor: 'SynthesisPanel / Persona tab — spider charts, dimension cards, identity block.',
    whyItMatters: 'This structured model is the bridge object Stage 3 consumes for state initialization.',
    deepDive: 'PersonaModel includes identity_statement, psychological_profile, social_strategy, narrative_arc, content_preferences, and state_vector estimate.',
    inputs: 'Synthesis output',
    outputs: 'PersonaModel → Stage 3',
    badge: 'Stage 2',
  },
  s3_state: {
    title: 'State vector estimation',
    doing: 'Maps each post onto six dimensions: valence, arousal, stability, connectivity, engagement intensity, ideological salience — then fuses measured vs LLM-inferred state.',
    lookFor: 'StateVector chart + behavioural fusion panel (measured / inferred / fused).',
    whyItMatters: 'The 6D state is the coordinate system for all Stage 3 dynamics.',
    deepDive: 'Fusion weight balances observable engagement signals with persona-informed inference. Demo: 55% measured, 45% inferred.',
    inputs: 'Signal matrix + persona model',
    outputs: 'Fused 6D state time series',
    badge: 'Stage 3',
  },
  s3_ou: {
    title: 'OU parameter fitting',
    doing: 'Fits a calendar-aware Ornstein–Uhlenbeck model per dimension — speed of mean reversion (θ), volatility (σ), and long-run mean toward equilibrium.',
    lookFor: 'Math explainer, OU parameter table, half-lives in days, per-dimension R².',
    whyItMatters: 'OU captures how quickly the profile returns to baseline after emotional/topical shocks.',
    deepDive: 'Block-diagonal fitting with calendar Δt (actual days between posts). Demo R² ≈ 0.67 overall.',
    inputs: 'State time series',
    outputs: 'OuParameters',
    badge: 'Stage 3',
  },
  s3_portrait: {
    title: 'Phase portrait',
    doing: 'Computes valence × arousal vector fields, equilibrium fixed point, mean reversion rates, and historical trajectory through state space.',
    lookFor: 'PhasePortraitCanvas — streamlines, equilibrium dot, trajectory path, slice selector.',
    whyItMatters: 'Phase portraits make dynamical behaviour intuitive — where the profile sits and where it is pulled.',
    deepDive: 'Three 2D slices available (valence×arousal, stability×engagement, connectivity×ideological). Fixed point type: stable node in demo.',
    inputs: 'OU parameters + state history',
    outputs: 'PhasePortrait',
    badge: 'Stage 3',
  },
  s3_strains: {
    title: 'Narrative themes (belief strains)',
    doing: 'Clusters hashtags/captions into recurring themes and fits SIR-style momentum models — β (spread), γ (decay), R₀, activation history.',
    lookFor: 'StrainCards — politics/election, institutional/justice, fitness/wellness with trend labels and sparklines.',
    whyItMatters: 'Strains capture which narrative clusters are expanding, stable, or fading — independent of OU mood dynamics.',
    deepDive: 'Demo profile: politics strain R₀≈2.1 expanding; wellness R₀≈0.7 contracting. Strains inject shocks into Monte Carlo.',
    inputs: 'Captions + hashtags time series',
    outputs: '3 × PersonalR0Estimate',
    badge: 'Stage 3',
  },
  s3_monte: {
    title: 'Monte Carlo simulation',
    doing: 'Integrates 10,000 perturbed stochastic paths day-by-day for 365 calendar days — coupling OU drift with strain shock injections.',
    lookFor: 'Progress ticks to 10,000 paths. MonteCarloCharts: fan chart, sample paths, scenario probabilities, audit panel.',
    whyItMatters: 'Single deterministic forecasts hide uncertainty. Ensemble paths produce confidence bands.',
    deepDive: 'Perturbations: lognormal α/σ noise, Gaussian state noise, SIR β/γ jitter, calendar shocks. Demo elapsed ~85s simulated.',
    inputs: 'OU params + strains + fused state',
    outputs: 'FutureStateDistribution (horizons 30/90/180/365d)',
    badge: 'Stage 3',
  },
  s3_narrative: {
    title: 'Future narrative & goals',
    doing: 'LLM synthesises plain-language outlooks for 30/90/180/365-day horizons, then a strategic goals agent infers likely focus areas from projected state.',
    lookFor: 'FutureNarrative panel — horizon paragraphs, epistemic limits, goals outlook cards.',
    whyItMatters: 'Quantitative projections need human-readable interpretation and actionable strategic framing.',
    deepDive: 'Narratives explicitly state epistemic limits — no clinical diagnosis, public-data-only constraints.',
    inputs: 'MC distribution + persona + strains',
    outputs: 'FutureStateNarrative + goals outlook',
    badge: 'Stage 3',
  },
};

const COMPLETE_CONTENT: CalloutContent = {
  title: 'Analysis complete',
  doing: 'All three stages finished. The Persona Dynamics report bundles signal summary, debate record, persona model, projections, and narratives.',
  lookFor: 'Detail panel switches to the Full Report tab — consolidated export view with all sections.',
  whyItMatters: 'This is the deliverable artifact — shareable, inspectable, rerunnable by stage.',
  badge: 'Done',
};

export function isGuidedIntroCheckpoint(event: PipelineEvent): boolean {
  if (event.type === 'STAGE_START' || event.type === 'STAGE_COMPLETE' || event.type === 'JOB_COMPLETE') {
    return true;
  }
  if (event.type === 'SUBSTEP_START') {
    return CANONICAL_SUBSTEPS.has(String(event.data.id));
  }
  return false;
}

export function isGuidedReviewCheckpoint(event: PipelineEvent): boolean {
  return event.type === 'SUBSTEP_COMPLETE' && CANONICAL_SUBSTEPS.has(String(event.data.id));
}

export function highlightForCallout(callout: DemoCallout): DemoHighlight {
  if (callout.kind === 'complete') return { mode: 'complete' };
  if (callout.kind === 'stage') return { stage: callout.stage, mode: 'stage' };
  if (callout.kind === 'stage_done') return { stage: callout.stage, mode: 'stage_done' };
  if (callout.kind === 'review') return { stage: callout.stage, substepId: callout.substepId, mode: 'review' };
  return { stage: callout.stage, substepId: callout.substepId, mode: 'up_next' };
}

export function introCalloutFromEvent(event: PipelineEvent): DemoCallout | null {
  if (event.type === 'STAGE_START') {
    const stage = event.data.stage as number;
    const meta = STAGE_CALLOUTS[stage];
    if (!meta) return null;
    const momentId = `stage_${stage}_start`;
    return {
      kind: 'stage',
      stage,
      pipelineState: pipelineStateLabel(stage),
      stateLabel: 'Up next — stage begins',
      ...meta,
      ...baseMeta(momentId),
    };
  }

  if (event.type === 'STAGE_COMPLETE') {
    const stage = event.data.stage as number;
    const meta = STAGE_DONE[stage];
    if (!meta) return null;
    return {
      kind: 'stage_done',
      stage,
      pipelineState: pipelineStateLabel(stage),
      stateLabel: 'Stage complete — review outputs',
      ...meta,
      ...baseMeta(`stage_${stage}_done`),
    };
  }

  if (event.type === 'JOB_COMPLETE') {
    return {
      kind: 'complete',
      pipelineState: 'Pipeline · All stages complete',
      stateLabel: 'Report ready',
      ...COMPLETE_CONTENT,
      ...baseMeta('job_complete'),
    };
  }

  if (event.type === 'SUBSTEP_START') {
    const id = String(event.data.id);
    const meta = SUBSTEP_CALLOUTS[id];
    if (!meta) return null;
    const stage = stageFromSubstep(id);
    return {
      kind: 'substep',
      stage,
      substepId: id,
      pipelineState: pipelineStateLabel(stage, id, meta.title),
      stateLabel: 'Up next — substep will run',
      ...meta,
      ...baseMeta(`${id}_intro`),
    };
  }

  return null;
}

export function reviewCalloutFromEvent(event: PipelineEvent): DemoCallout | null {
  if (event.type !== 'SUBSTEP_COMPLETE') return null;
  const id = String(event.data.id);
  const meta = SUBSTEP_CALLOUTS[id];
  if (!meta) return null;
  const stage = stageFromSubstep(id);
  return {
    kind: 'review',
    stage,
    substepId: id,
    title: `Review · ${meta.title}`,
    pipelineState: pipelineStateLabel(stage, id, meta.title),
    stateLabel: 'Complete — inspect the output panel',
    doing: `This substep finished running. The detail panel on the right now shows the ${meta.title.toLowerCase()} output. Take a moment to read the visualization before continuing.`,
    lookFor: meta.lookFor,
    whyItMatters: meta.whyItMatters,
    deepDive: meta.deepDive,
    outputs: meta.outputs,
    badge: meta.badge,
    ...baseMeta(`${id}_review`),
  };
}

/** @deprecated use introCalloutFromEvent */
export function calloutFromEvent(event: PipelineEvent): DemoCallout | null {
  return introCalloutFromEvent(event);
}

export function isGuidedCheckpoint(event: PipelineEvent): boolean {
  return isGuidedIntroCheckpoint(event);
}
