/** Plain-language explanation of each pipeline sub-phase. */
export const SUBSTEP_EXPLAIN: Record<string, { title: string; did: string }> = {
  s1_resolve: {
    title: 'Resolve profile',
    did: 'Parsed the Instagram URL into a canonical username for all downstream steps.',
  },
  s1_metadata: {
    title: 'Profile metadata',
    did: 'Fetched public profile fields — bio, follower counts, verification status, and post totals.',
  },
  s1_posts: {
    title: 'Fetch posts',
    did: 'Collected posts (full archive or lookback window) from timeline, feed, and clips; deduplicated by media ID.',
  },
  s1_stories: {
    title: 'Stories & highlights',
    did: 'Captured active stories and highlight reels for short-form context not visible in the feed alone.',
  },
  s1_engagement: {
    title: 'Engagement depth',
    did: 'Sampled comments and likers on recent posts to enrich audience interaction signals.',
  },
  s1_matrix: {
    title: 'Signal matrix',
    did: 'Assembled a chronological matrix of captions, hashtags, engagement rates, and posting intervals.',
  },
  s1_derived: {
    title: 'Derived signals',
    did: 'Computed aggregate metrics — posting regularity, emotional volatility, engagement slope, topic drift.',
  },
  s1_summary: {
    title: 'Signal summary',
    did: 'Packaged matrix stats, post samples, and enrichment into a human-readable summary for Stage 2.',
  },
  s2_agents: {
    title: 'Agent hypotheses',
    did: 'Six specialist agents independently analysed the signal matrix and produced initial hypotheses.',
  },
  s2_challenge: {
    title: 'Round 1 — Challenges',
    did: 'Each agent cross-examined every other agent’s hypothesis (30 challenge calls).',
  },
  s2_defense: {
    title: 'Round 2 — Defenses',
    did: 'Each agent revised their position after receiving incoming challenges.',
  },
  s2_synthesis: {
    title: 'Round 3 — Synthesis',
    did: 'Merged revised agent analyses into synthesis claim cards and debate trajectory charts.',
  },
  s2_persona: {
    title: 'Unified persona model',
    did: 'Structured persona profile — identity, psychology, social strategy, narrative, preferences, and 6D state.',
  },
  s3_state: {
    title: 'State vector estimation',
    did: 'Mapped each post to a 6-dimensional psychological state (valence, arousal, stability, etc.).',
  },
  s3_ou: {
    title: 'OU parameter fitting',
    did: 'Fitted an Ornstein–Uhlenbeck model — how the profile reverts to their emotional baseline over time.',
  },
  s3_portrait: {
    title: 'Phase portrait',
    did: 'Visualised valence × arousal dynamics and historical trajectory toward equilibrium.',
  },
  s3_strains: {
    title: 'Narrative themes',
    did: 'Discovered recurring themes from hashtags/captions and measured momentum across post history.',
  },
  s3_monte: {
    title: 'Monte Carlo simulation',
    did: 'Runs 10,000+ perturbed stochastic paths integrating OU dynamics and SIR strains day-by-day; outputs percentiles and scenarios.',
  },
  s3_narrative: {
    title: 'Future narrative',
    did: 'Synthesised horizon narratives plus a strategic agent inferring focus areas and likely goals.',
  },
};

export function explainSubstep(id: string): { title: string; did: string } {
  if (SUBSTEP_EXPLAIN[id]) return SUBSTEP_EXPLAIN[id];
  if (id.startsWith('s2_agent_')) {
    return { title: 'Agent hypothesis', did: 'This agent produced an independent analysis of the profile.' };
  }
  if (id.startsWith('s2_ch_')) {
    return { title: 'Cross-examination', did: 'One agent challenged another agent’s hypothesis.' };
  }
  if (id.startsWith('s2_defense_')) {
    return { title: 'Agent defense', did: 'This agent revised their position after receiving challenges.' };
  }
  if (id.startsWith('s3_strain_')) {
    return { title: 'Theme profile', did: 'A discovered narrative theme with momentum and evidence.' };
  }
  return { title: id, did: 'Pipeline sub-phase output.' };
}
