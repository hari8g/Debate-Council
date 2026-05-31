import type {
  AgentHypothesis,
  Challenge,
  DerivedSignals,
  FutureStateDistribution,
  FutureStateNarrative,
  HorizonDistribution,
  MonteCarloAudit,
  OuParameters,
  PersonaDynamicsReport,
  PersonaModel,
  PersonalR0Estimate,
  PhasePortrait,
  PhasePortraitSlice,
  PostDetail,
  PostSample,
  ProfileSignalMatrix,
  RevisedHypothesis,
  SignalSummary,
} from '../types/report';

export const DEMO_USERNAME = 'demo_creator';
export const DEMO_JOB_ID = 'demo-walkthrough';
export const DEMO_PROFILE_URL = 'https://www.instagram.com/demo_creator/';

const AGENTS = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
] as const;

type AgentId = (typeof AGENTS)[number];

export interface DemoFixture {
  report: PersonaDynamicsReport;
  // intermediate payloads keyed by substep or dynamic id
  intermediate_payloads: Record<string, Record<string, unknown>>;
}

function linspace(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => start + step * i);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 3): number {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

function toIsoDay(base: Date, offsetDays: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(10 + (offsetDays % 7), 15, 0, 0);
  return d.toISOString();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function generateStateHistory(length: number, dims: number, xStar: number[]): number[][] {
  return Array.from({ length }, (_, t) =>
    Array.from({ length: dims }, (_, d) => {
      const seasonal = 0.12 * Math.sin((2 * Math.PI * t) / (18 + d * 2) + d * 0.4);
      const cycle = 0.08 * Math.cos((2 * Math.PI * t) / (31 + d * 3) - d * 0.2);
      const trend = (t / length - 0.5) * (0.14 - d * 0.01);
      return round(clamp(xStar[d] + seasonal + cycle + trend, -1, 1), 4);
    }),
  );
}

function makePhaseSlice(
  dim1: number,
  dim2: number,
  dim1Label: string,
  dim2Label: string,
  equilibriumV: number,
  equilibriumA: number,
  meanReversionV: number,
  meanReversionA: number,
): PhasePortraitSlice {
  const axis = linspace(-1.1, 1.1, 12);
  const vGrid = axis.map((v) => axis.map(() => round(v, 4)));
  const aGrid = axis.map(() => axis.map((a) => round(a, 4)));
  const dv = axis.map((v) =>
    axis.map((a) => round(-meanReversionV * (v - equilibriumV) + 0.05 * Math.sin(a * 1.4), 4)),
  );
  const da = axis.map((v) =>
    axis.map((a) => round(-meanReversionA * (a - equilibriumA) + 0.05 * Math.cos(v * 1.1), 4)),
  );
  const trajectory = linspace(0, 1, 36).map((u) => [
    round(equilibriumV - 0.45 * Math.exp(-u * 2.3) * Math.cos(u * 7.2), 4),
    round(equilibriumA + 0.35 * Math.exp(-u * 2.1) * Math.sin(u * 7.2), 4),
  ]);

  return {
    dim1,
    dim2,
    dim1_label: dim1Label,
    dim2_label: dim2Label,
    v_grid: vGrid,
    a_grid: aGrid,
    dv,
    da,
    equilibrium_v: equilibriumV,
    equilibrium_a: equilibriumA,
    mean_reversion_rate_v: meanReversionV,
    mean_reversion_rate_a: meanReversionA,
    historical_trajectory: trajectory,
    fixed_point_type: 'stable_node',
    half_life_v_days: round(Math.log(2) / meanReversionV, 2),
    half_life_a_days: round(Math.log(2) / meanReversionA, 2),
  };
}

function buildCaption(topic: string, idx: number): string {
  const motifs = [
    'Public institutions need transparent accountability, not spectacle.',
    'Election season amplifies emotion but policy memory must stay long.',
    'Tamil civic discourse can be sharp and humane at the same time.',
    'Debate is strongest when data, dignity, and local context coexist.',
    'The council room is noisy, but reform still starts with patient listening.',
    'Leadership without ethical consistency collapses during stress cycles.',
  ];
  const suffix =
    idx % 3 === 0
      ? 'Watching how narratives shift between outrage and repair.'
      : idx % 3 === 1
        ? 'Trying to keep nuance alive in a feed that rewards extremes.'
        : 'Documenting this for people who still believe institutions can improve.';
  return `${motifs[idx % motifs.length]} ${topic}. ${suffix}`;
}

function buildDemoMatrix(): ProfileSignalMatrix {
  const postCount = 72;
  const startDate = new Date('2025-05-21T00:00:00.000Z');
  const dayOffsets = Array.from({ length: postCount }, (_, i) => {
    const base = i * 5.1;
    const modulation = 1.8 * Math.sin(i / 5.3) + 0.9 * Math.cos(i / 9.1);
    const burstAdjustment = i === 25 || i === 46 || i === 62 ? -2.4 : 0;
    return Math.round(base + modulation + burstAdjustment);
  });

  const timestamps = dayOffsets.map((offset) => toIsoDay(startDate, clamp(offset, 0, 364)));
  const topicCycle = [
    'Parliament accountability',
    'Election reform',
    'Tamil civic participation',
    'Institutional justice',
    'Regional youth mobilisation',
    'Policy literacy',
    'Local governance',
    'Media framing bias',
  ];
  const postTypes = ['image', 'reel', 'carousel'];

  const captions = Array.from({ length: postCount }, (_, i) => buildCaption(topicCycle[i % topicCycle.length], i));
  const hashtagSets = Array.from({ length: postCount }, (_, i) => {
    const base = ['politics', 'election', 'tamil'];
    if (i % 2 === 0) base.push('democracy');
    if (i % 3 === 0) base.push('justice');
    if (i % 4 === 0) base.push('policy');
    if (i % 5 === 0) base.push('civicvoice');
    if (i % 6 === 0) base.push('southindia');
    return base;
  });

  const likes = Array.from({ length: postCount }, (_, i) =>
    Math.round(clamp(760 + 260 * Math.sin(i / 4.8) + 120 * Math.cos(i / 8.6), 400, 1200)),
  );
  const commentsCounts = Array.from({ length: postCount }, (_, i) =>
    Math.round(clamp(52 + 22 * Math.cos(i / 6.4) + 11 * Math.sin(i / 3.7), 18, 150)),
  );
  const engagementRates = likes.map((likeCount, i) =>
    round((likeCount + commentsCounts[i] * 3.5) / 24800, 4),
  );
  const postingIntervalsHours = timestamps.map((ts, i) => {
    if (i === 0) return 120;
    const prev = new Date(timestamps[i - 1]).getTime();
    const curr = new Date(ts).getTime();
    return round((curr - prev) / (1000 * 60 * 60), 2);
  });
  const captionLengths = captions.map((c) => wordCount(c));
  const hashtagCounts = hashtagSets.map((set) => set.length);

  return {
    username: DEMO_USERNAME,
    bio: 'Digital commentator decoding politics, culture, and civic life in Tamil + English.',
    post_timestamps: timestamps,
    captions,
    hashtag_sets: hashtagSets,
    post_types: Array.from({ length: postCount }, (_, i) => postTypes[i % postTypes.length]),
    likes,
    comments_counts: commentsCounts,
    follower_count: 24800,
    following_count: 890,
    posting_intervals_hours: postingIntervalsHours,
    engagement_rates: engagementRates,
    caption_lengths: captionLengths,
    hashtag_counts: hashtagCounts,
  };
}

function buildSignalSummary(matrix: ProfileSignalMatrix): SignalSummary {
  const sampleIndexes = [4, 11, 19, 27, 36, 48, 58, 69];
  const postSamples: PostSample[] = sampleIndexes.map((idx) => ({
    index: idx,
    timestamp: matrix.post_timestamps[idx],
    caption_excerpt: matrix.captions[idx].slice(0, 150),
    post_type: matrix.post_types[idx],
    likes: matrix.likes[idx],
    comments: matrix.comments_counts[idx],
    engagement_rate: matrix.engagement_rates[idx],
    hashtags: matrix.hashtag_sets[idx],
    views: 3200 + idx * 37,
    saves: 45 + (idx % 7) * 4,
    location: idx % 2 === 0 ? 'Chennai' : 'Coimbatore',
    shortcode: `DC${1000 + idx}`,
  }));

  const postDetails: PostDetail[] = Array.from({ length: 10 }, (_, i) => ({
    media_id: `media_${9100 + i}`,
    shortcode: `DCX${300 + i}`,
    post_index: i + 55,
    likes: matrix.likes[i + 55],
    comments_count: matrix.comments_counts[i + 55],
    views: 4100 + i * 220,
    saves: 60 + i * 5,
    shares: 18 + i * 2,
    location_name: i % 2 === 0 ? 'Chennai' : 'Madurai',
    mentions: i % 3 === 0 ? ['@citizensforum'] : ['@policytrack'],
    tagged_users: i % 2 === 0 ? ['@southvoices'] : ['@reformcollective'],
    is_carousel: i % 3 === 0,
    carousel_count: i % 3 === 0 ? 4 : 1,
    like_and_view_counts_disabled: false,
    top_comments: [
      { username: `follower_${i}_a`, text: 'Strong framing, thanks for context.', likes: 28 + i },
      { username: `follower_${i}_b`, text: 'Can you share source links next time?', likes: 14 + i },
    ],
    liker_sample: [`engaged_${i}`, `reader_${i + 1}`, `activist_${i + 2}`],
    music_title: i % 4 === 0 ? 'Instrumental Pulse' : undefined,
    accessibility_caption: 'Political commentary post discussing institutional accountability.',
    post_url: `${DEMO_PROFILE_URL}p/DCX${300 + i}/`,
  }));

  return {
    username: DEMO_USERNAME,
    bio: 'Digital commentator | institutions, elections, Tamil civic discourse',
    follower_count: 24800,
    following_count: 890,
    posts_analysed: 72,
    analysis_period_days: 365,
    fetch_all_posts: true,
    post_samples: postSamples,
    enrichment: {
      metadata: {
        username: DEMO_USERNAME,
        full_name: 'Demo Creator',
        user_id: '2780011123',
        biography:
          'Digital commentator. Politics, elections, and civic culture through a Tamil-English lens.',
        bio_links: [{ url: 'https://example.org/newsletter', title: 'Civic Notes' }],
        external_url: 'https://example.org/demo-creator',
        profile_pic_url: 'https://cdn.example.org/demo_creator/avatar.jpg',
        is_verified: false,
        is_private: false,
        is_business: false,
        is_professional: true,
        follower_count: 24800,
        following_count: 890,
        media_count: 142,
        highlight_reel_count: 2,
        reels_count: 38,
        category: 'Digital creator',
        business_category: 'Public commentary',
        pronouns: ['she', 'her'],
        account_age_days: 1660,
        follower_following_ratio: round(24800 / 890, 2),
        posts_per_follower: round(142 / 24800, 4),
        mutual_followers_count: 59,
        has_guides: true,
        has_channel: false,
        data_sources: ['profile_metadata', 'posts_api', 'stories_snapshot'],
        capture_timestamp: new Date('2026-05-22T08:40:00.000Z').toISOString(),
      },
      stories: [
        {
          id: 'story_1',
          taken_at: '2026-05-20T12:05:00.000Z',
          media_type: 'image',
          expires_at: '2026-05-21T12:05:00.000Z',
          viewer_count: 1900,
          caption: 'Polling booth walkthrough in Tamil.',
          mentions: ['@citizen_watch'],
        },
        {
          id: 'story_2',
          taken_at: '2026-05-19T08:30:00.000Z',
          media_type: 'video',
          expires_at: '2026-05-20T08:30:00.000Z',
          viewer_count: 1710,
          caption: 'Three reforms in 45 seconds.',
          mentions: [],
        },
        {
          id: 'story_3',
          taken_at: '2026-05-17T18:10:00.000Z',
          media_type: 'image',
          expires_at: '2026-05-18T18:10:00.000Z',
          viewer_count: 1640,
          caption: 'Tamil press clipping + commentary.',
          mentions: ['@policytrack'],
        },
        {
          id: 'story_4',
          taken_at: '2026-05-16T14:45:00.000Z',
          media_type: 'video',
          expires_at: '2026-05-17T14:45:00.000Z',
          viewer_count: 1820,
          caption: 'Why turnout data matters.',
          link_url: 'https://example.org/voter-data',
          mentions: ['@southvoices'],
        },
      ],
      highlights: [
        { id: 'hl_1', title: 'Election Notes', cover_url: 'https://cdn.example.org/highlight/elections.jpg', item_count: 18 },
        { id: 'hl_2', title: 'Tamil Threads', cover_url: 'https://cdn.example.org/highlight/tamil.jpg', item_count: 12 },
      ],
      post_details: postDetails,
      capture_report: {
        posts_fetched: 72,
        posts_enriched: 10,
        comments_fetched: 840,
        likers_sampled: 300,
        stories_fetched: 4,
        highlights_fetched: 2,
        feed_pages_scanned: 16,
        api_calls_made: 67,
        limitations: ['story archive partial', 'private DMs excluded', 'cross-platform posts unavailable'],
        quality_score: 0.74,
      },
    },
  };
}

function buildAgentHypotheses(): AgentHypothesis[] {
  return [
    {
      agent: 'psychographer',
      analysis: {
        confidence: 0.78,
        key_hypothesis:
          'The profile reflects a high-monitoring identity style: emotional arousal rises during civic conflict, but expression remains controlled to preserve council credibility.',
        traits: { conscientiousness: 0.71, neuroticism: 0.62, openness: 0.79 },
        evidence: ['caption-length slope +2.1 words/post', 'reactive bursts near high-stakes civic events', 'stable self-referential tone'],
        interpretation:
          'Debate council framing suggests inward pressure to be precise, not merely performative outrage.',
      },
    },
    {
      agent: 'sociologist',
      analysis: {
        confidence: 0.74,
        key_hypothesis:
          'The account is a bridge actor between regional Tamil publics and policy-centric urban audiences, converting cultural fluency into symbolic capital.',
        social_position: 'mid-tier civic influencer with rising institutional attention',
        evidence: ['code-switched captions', 'mentions of local collectives', 'follower growth around council-style explainer posts'],
        interpretation:
          'This is less private confession and more calibrated public pedagogy shaped by audience hierarchy.',
      },
    },
    {
      agent: 'narrative_analyst',
      analysis: {
        confidence: 0.76,
        key_hypothesis:
          'A recurring debate-council narrative arc dominates: public harm -> institutional lag -> citizen responsibility -> practical reform.',
        narrative_mode: 'contamination-to-redemption loop',
        evidence: ['repeated institutional justice motifs', 'high reuse of accountability lexicon', 'hero role assigned to civic communities'],
        interpretation:
          'The storyteller identity is coherent across the full year, despite topical drift in post subjects.',
      },
    },
    {
      agent: 'behavioural_economist',
      analysis: {
        confidence: 0.71,
        key_hypothesis:
          'The creator accepts an engagement tax to maintain value-consistent signalling; utility is weighted toward identity coherence over pure reach.',
        utility_weights: { conviction: 0.52, growth: 0.21, status: 0.16, novelty: 0.11 },
        evidence: ['negative engagement slope', 'political posts retained despite lower like efficiency', 'high effort in policy explainers'],
        interpretation:
          'The revealed preference profile supports principled persistence rather than algorithmic optimization.',
      },
    },
    {
      agent: 'temporal_analyst',
      analysis: {
        confidence: 0.73,
        key_hypothesis:
          'Three event-linked bursts and rising ideological fixation indicate a moderated acceleration regime, not a full instability regime.',
        change_points: ['2025-09-14', '2026-01-22', '2026-04-23'],
        evidence: ['topic drift 0.58', 'burst intervals compress around major events', 'mean post interval reduced in final quarter'],
        interpretation:
          'Debate council dynamics are event-sensitive, but baseline posting rhythm remains recoverable.',
      },
    },
    {
      agent: 'cultural_analyst',
      analysis: {
        confidence: 0.69,
        key_hypothesis:
          'Regional Tamil markers are becoming central identity anchors while maintaining pan-Indian political legibility.',
        cultural_signals: ['Tamil transliteration hashtags', 'local issue references', 'hybrid commentary aesthetics'],
        evidence: ['hashtag clusters include tamil + justice', 'highlight reels for Tamil threads', 'location cues in post details'],
        interpretation:
          'Cultural specificity acts as trust infrastructure for the broader reform narrative.',
      },
    },
  ];
}

function challengeTemplate(challenger: AgentId, target: AgentId, index: number): string {
  return `${challenger} questions ${target}: your claim underweights the debate-council evidence at index ${index}. Reconcile engagement drag, event timing, and Tamil audience segmentation without assuming a single motive.`;
}

function buildChallenges(): Challenge[] {
  const detailed = [
    'temporal_analyst->psychographer',
    'sociologist->narrative_analyst',
    'behavioural_economist->sociologist',
  ];
  const detailedText: Record<string, string> = {
    'temporal_analyst->psychographer':
      'Your anxiety-first interpretation breaks on timing. Burst windows cluster within 48 hours of external election shocks (Sept 14, Jan 22, Apr 23). A debate-council model should prioritize exogenous triggers before inferring stable internal dysregulation.',
    'sociologist->narrative_analyst':
      'The institutional-failure arc may be strategic role occupancy, not purely autobiographical narrative identity. During coalition debates, the same frame appears in posts with lower intimacy markers but higher coalition-tag density, indicating audience work.',
    'behavioural_economist->sociologist':
      'Capital accumulation alone cannot explain action. Political explainers underperform lifestyle posts on immediate rewards, yet supply increased. This reveals a utility function where ideological consistency and council legitimacy outrank short-term engagement yield.',
  };

  const output: Challenge[] = [];
  let idx = 0;
  for (const challenger of AGENTS) {
    for (const target of AGENTS) {
      if (challenger === target) continue;
      const key = `${challenger}->${target}`;
      output.push({
        challenger,
        target,
        challenge_text: detailed.includes(key) ? detailedText[key] : challengeTemplate(challenger, target, idx),
      });
      idx += 1;
    }
  }
  return output;
}

function buildRevisedHypotheses(
  hypotheses: AgentHypothesis[],
  challenges: Challenge[],
): RevisedHypothesis[] {
  const confidence: Record<AgentId, number> = {
    psychographer: 0.69,
    sociologist: 0.72,
    narrative_analyst: 0.75,
    behavioural_economist: 0.7,
    temporal_analyst: 0.74,
    cultural_analyst: 0.68,
  };
  const revisedText: Record<AgentId, string> = {
    psychographer:
      'Reframed from trait-centric to context-amplified: emotional reactivity is event-gated, while chronic pressure appears in caption expansion and defensive precision.',
    sociologist:
      'Adjusted toward dual-purpose signalling: status work exists, but conviction-maintenance explains persistence under weak engagement rewards.',
    narrative_analyst:
      'Maintained core arc but added strategic layer: narrative continuity is genuine and simultaneously useful for coalition coherence.',
    behavioural_economist:
      'Revised utility model to include social legitimacy constraints; not purely individual payoff maximization.',
    temporal_analyst:
      'Confirmed moderated-acceleration regime with bounded mean reversion; regime shift remains possible under sustained negative shocks.',
    cultural_analyst:
      'Strengthened claim that Tamil identity signalling is infrastructural rather than decorative in the current debate council trajectory.',
  };

  return AGENTS.map((agent) => {
    const original = hypotheses.find((h) => h.agent === agent) as AgentHypothesis;
    const received = challenges.filter((c) => c.target === agent);
    const validChallenges = received
      .slice(0, 3)
      .map((c) => `${c.challenger}->${c.target}`)
      .join(', ');
    return {
      agent,
      original,
      challenges_received: received,
      revised_analysis: {
        confidence: confidence[agent],
        revised_hypothesis: revisedText[agent],
        valid_challenges: validChallenges,
      },
    };
  });
}

function buildPersonaModel(): PersonaModel {
  const makeClaims = (entries: Array<[string, number, string, boolean?]>) =>
    entries.map(([claim, confidence, evidence, speculative]) => ({
      claim,
      confidence,
      evidence,
      speculative,
    }));

  return {
    summary:
      'A civically committed digital commentator balancing ideological clarity with public accountability, increasingly rooted in Tamil institutional discourse.',
    key_insight:
      'Identity-consistent political expression continues despite declining short-term engagement, indicating conviction-weighted strategy.',
    core_identity: {
      title: 'Core Identity',
      claims: makeClaims([
        ['Sees self as a public explainer in civic disputes.', 0.78, 'consistent explainer captions + highlight structure'],
        ['Protects credibility through explicit sourcing language.', 0.71, 'repeated calls for policy evidence and references'],
      ]),
      summary: 'Civic explainer identity is central and reinforced by posting choices over one year.',
    },
    psychological_profile: {
      title: 'Psychological Profile',
      claims: makeClaims([
        ['Moderate stress reactivity under political shocks.', 0.69, 'three burst events with arousal spikes'],
        ['High cognitive control in language even when valence dips.', 0.72, 'longer captions with structured argument format'],
      ]),
      summary: 'Reactive to events yet controlled in expression; no evidence of persistent dysregulated posting.',
    },
    social_strategy: {
      title: 'Social Strategy',
      claims: makeClaims([
        ['Targets both activist and policy audiences through code-switching.', 0.75, 'Tamil-English blends and segmented tags'],
        ['Trades short-term likes for long-term legitimacy.', 0.73, 'negative engagement slope but stable political frequency'],
      ]),
      summary: 'Bridge strategy: retain local trust while scaling policy-oriented influence.',
    },
    narrative_self_model: {
      title: 'Narrative Self Model',
      claims: makeClaims([
        ['Frames institutions as reformable, not irredeemable.', 0.74, 'repeated reform language after critiques'],
        ['Positions audience as civic participants, not spectators.', 0.7, 'calls to verify, attend, and discuss'],
      ]),
      summary: 'Narrative arc emphasizes accountable action over pure outrage cycles.',
    },
    revealed_preferences: {
      title: 'Revealed Preferences',
      claims: makeClaims([
        ['Prioritizes civic clarity over engagement optimization.', 0.76, 'high-effort explainers persist despite underperformance'],
        ['Values discourse continuity during election windows.', 0.72, 'stable posting during volatile news periods'],
      ]),
      summary: 'Behavior indicates conviction and continuity preferences are dominant.',
    },
    cultural_identity: {
      title: 'Cultural Identity',
      claims: makeClaims([
        ['Tamil civic references are increasing in salience.', 0.7, 'hashtag and language trends in last 90 days'],
        ['Regional grounding is used to establish trust.', 0.68, 'location-linked stories and local institutional topics'],
      ]),
      summary: 'Cultural specificity functions as a trust layer for political messaging.',
    },
    temporal_state: {
      title: 'Temporal State',
      claims: makeClaims([
        ['Current regime is moderately accelerated but mean-reverting.', 0.74, 'OU alpha structure and phase trajectories'],
        ['Risk of polarization increases with repeated election shocks.', 0.63, 'future distribution ideological upper quantiles', true],
      ]),
      summary: 'System is not unstable yet, but shock sensitivity remains material.',
    },
    genuine_uncertainties: {
      title: 'Genuine Uncertainties',
      claims: makeClaims([
        ['Private motivations behind caption expansion cannot be confirmed.', 0.56, 'public-only data boundary', true],
        ['Cross-platform behavior could significantly alter inferred strategy.', 0.59, 'instagram-only observational lens', true],
      ]),
      summary: 'Major uncertainty comes from private/off-platform context not observable in this dataset.',
    },
    current_state: {
      valence: -0.17,
      arousal: 0.63,
      stability: 0.57,
      connectivity: 0.69,
      engagement: 0.52,
      ideological: 0.71,
    },
    big_five: {
      openness: 0.79,
      conscientiousness: 0.71,
      extraversion: 0.52,
      agreeableness: 0.48,
      neuroticism: 0.62,
    },
  };
}

function buildOuParameters(xStar: number[]): OuParameters {
  const alpha = [
    [0.33, 0.04, 0.01, 0.0, 0.03, 0.02],
    [0.03, 0.27, 0.02, 0.02, 0.04, 0.01],
    [0.02, 0.03, 0.21, 0.02, 0.01, 0.01],
    [0.01, 0.02, 0.03, 0.24, 0.04, 0.03],
    [0.02, 0.04, 0.02, 0.03, 0.29, 0.02],
    [0.01, 0.02, 0.01, 0.03, 0.03, 0.31],
  ];
  const sigma = [0.14, 0.17, 0.12, 0.1, 0.16, 0.13];
  const stateHistory = generateStateHistory(72, 6, xStar);
  const inputMatrixB = [
    [0.22, -0.08, 0.11, -0.05],
    [0.12, 0.19, 0.06, 0.07],
    [-0.07, -0.03, 0.15, 0.06],
    [0.09, 0.04, 0.08, 0.12],
    [0.15, 0.11, 0.05, 0.04],
    [0.06, 0.09, 0.12, 0.18],
  ];

  return {
    alpha,
    x_star: xStar,
    sigma,
    r_squared: 0.67,
    state_history: stateHistory,
    fit_method: 'block_diagonal_calendar',
    n_observations: 72,
    input_matrix_b: inputMatrixB,
    input_labels: ['engagement_delta', 'topic_drift', 'burst_signal', 'cultural_salience'],
    mean_input: [0.02, 0.58, 0.11, 0.46],
    dt_days_series: linspace(3.2, 6.1, 72).map((d) => round(d, 3)),
    mean_dt_days: 5.07,
    calendar_span_days: 365,
    per_dimension_r2: [0.71, 0.66, 0.64, 0.69, 0.67, 0.65],
    half_lives_days: [2.1, 2.57, 3.3, 2.89, 2.39, 2.24],
    model_scores: { ou: 0.67, random_walk: 0.42, ar1: 0.58 },
  };
}

function buildPhasePortrait(): PhasePortrait {
  const slice1 = makePhaseSlice(0, 1, 'Valence', 'Arousal', -0.12, 0.58, 0.33, 0.27);
  const slice2 = makePhaseSlice(2, 4, 'Stability', 'Engagement', 0.61, 0.48, 0.21, 0.29);
  const slice3 = makePhaseSlice(3, 5, 'Connectivity', 'Ideological', 0.72, 0.64, 0.24, 0.31);
  return {
    v_grid: slice1.v_grid,
    a_grid: slice1.a_grid,
    dv: slice1.dv,
    da: slice1.da,
    equilibrium_v: slice1.equilibrium_v,
    equilibrium_a: slice1.equilibrium_a,
    mean_reversion_rate_v: slice1.mean_reversion_rate_v,
    mean_reversion_rate_a: slice1.mean_reversion_rate_a,
    historical_trajectory: slice1.historical_trajectory,
    slices: [slice1, slice2, slice3],
    cyclicality_score: 0.23,
    cyclicality_detected: false,
    fixed_point_type: 'stable_node',
  };
}

function buildStrains(): PersonalR0Estimate[] {
  return [
    {
      strain_type: 'politics_election',
      label: '#politics · #election',
      keywords: ['politics', 'election', 'campaign', 'vote'],
      beta: 0.42,
      gamma: 0.2,
      r0: 2.1,
      uncertainty: [1.85, 2.34],
      data_quality: 'moderate',
      trajectory: 'expanding',
      activation_history: [0.12, 0.14, 0.16, 0.2, 0.24, 0.25, 0.28, 0.31, 0.34, 0.37, 0.4, 0.43, 0.46, 0.49, 0.53, 0.56, 0.58, 0.61, 0.65, 0.69],
      peak_post_index: 68,
      evidence_captions: ['Election accountability thread', 'Council post on manifesto transparency'],
      interpretation: 'Election-linked discourse is broadening and repeatedly reactivated.',
      posts_active: 31,
      posts_total: 72,
      plain_summary: 'This theme is expanding and likely to remain dominant through near-term civic cycles.',
      momentum_ratio: 1.58,
      trend_label: 'growing',
      prevalence_pct: 38,
      early_activation: 0.17,
      recent_activation: 0.66,
      relevance_score: 0.79,
      sir_fit_r2: 0.7,
      metric_confidence: 'moderate',
      sir_reliable: true,
      changepoint_indices: [25, 46, 62],
      projected_activation_30d: 0.73,
      projected_activation_90d: 0.76,
      projected_activation_180d: 0.71,
    },
    {
      strain_type: 'institutional_justice',
      label: '#institutional · #justice',
      keywords: ['institutional', 'justice', 'rights', 'reform'],
      beta: 0.29,
      gamma: 0.21,
      r0: 1.38,
      uncertainty: [1.22, 1.54],
      data_quality: 'moderate',
      trajectory: 'stable',
      activation_history: [0.31, 0.32, 0.33, 0.31, 0.3, 0.29, 0.3, 0.32, 0.34, 0.33, 0.32, 0.31, 0.33, 0.34, 0.35, 0.34, 0.33, 0.32, 0.34, 0.35],
      peak_post_index: 61,
      evidence_captions: ['Institutional lag explainer', 'Justice-system accountability post'],
      interpretation: 'Core frame is stable and provides continuity across topical shifts.',
      posts_active: 24,
      posts_total: 72,
      plain_summary: 'This strain is stable and likely to remain the structural backbone of the narrative.',
      momentum_ratio: 1.04,
      trend_label: 'steady',
      prevalence_pct: 24,
      early_activation: 0.32,
      recent_activation: 0.34,
      relevance_score: 0.73,
      sir_fit_r2: 0.66,
      metric_confidence: 'moderate',
      sir_reliable: true,
      changepoint_indices: [46],
      projected_activation_30d: 0.35,
      projected_activation_90d: 0.36,
      projected_activation_180d: 0.34,
    },
    {
      strain_type: 'fitness_wellness',
      label: '#fitness · #wellness',
      keywords: ['fitness', 'wellness', 'routine', 'health'],
      beta: 0.16,
      gamma: 0.23,
      r0: 0.7,
      uncertainty: [0.58, 0.82],
      data_quality: 'moderate',
      trajectory: 'contracting',
      activation_history: [0.22, 0.21, 0.2, 0.2, 0.19, 0.18, 0.17, 0.17, 0.16, 0.16, 0.15, 0.14, 0.14, 0.13, 0.12, 0.11, 0.11, 0.1, 0.09, 0.08],
      peak_post_index: 10,
      evidence_captions: ['Weekend routine post', 'Wellness reflection'],
      interpretation: 'Lifestyle expression is receding as civic identity becomes dominant.',
      posts_active: 8,
      posts_total: 72,
      plain_summary: 'This theme is contracting and likely to stay secondary unless a personal pivot occurs.',
      momentum_ratio: 0.52,
      trend_label: 'fading',
      prevalence_pct: 11,
      early_activation: 0.21,
      recent_activation: 0.09,
      relevance_score: 0.41,
      sir_fit_r2: 0.61,
      metric_confidence: 'moderate',
      sir_reliable: true,
      changepoint_indices: [25, 58],
      projected_activation_30d: 0.07,
      projected_activation_90d: 0.06,
      projected_activation_180d: 0.05,
    },
  ];
}

function buildHorizonDistribution(
  horizonDays: number,
  median: number[],
  mean: number[],
  p10: number[],
  p90: number[],
  confidence: number,
): HorizonDistribution {
  return {
    horizon_days: horizonDays,
    median,
    mean,
    p10,
    p90,
    p_positive_valence: horizonDays === 30 ? 0.29 : horizonDays === 90 ? 0.36 : horizonDays === 180 ? 0.44 : 0.48,
    p_high_arousal: horizonDays === 30 ? 0.61 : horizonDays === 90 ? 0.54 : horizonDays === 180 ? 0.46 : 0.39,
    p_low_stability: horizonDays === 30 ? 0.52 : horizonDays === 90 ? 0.45 : horizonDays === 180 ? 0.38 : 0.33,
    p_high_ideological: horizonDays === 30 ? 0.69 : horizonDays === 90 ? 0.71 : horizonDays === 180 ? 0.66 : 0.59,
    p_valence_cross_zero: horizonDays === 30 ? 0.21 : horizonDays === 90 ? 0.29 : horizonDays === 180 ? 0.37 : 0.42,
    p_regime_persistence: horizonDays === 30 ? 0.74 : horizonDays === 90 ? 0.63 : horizonDays === 180 ? 0.52 : 0.41,
    confidence,
  };
}

function buildFutureState(strains: PersonalR0Estimate[]): FutureStateDistribution {
  const horizons: Record<string, HorizonDistribution> = {
    '30': buildHorizonDistribution(
      30,
      [-0.21, 0.66, 0.56, 0.71, 0.54, 0.73],
      [-0.19, 0.64, 0.57, 0.7, 0.53, 0.72],
      [-0.45, 0.42, 0.31, 0.44, 0.28, 0.51],
      [0.04, 0.83, 0.79, 0.88, 0.74, 0.9],
      0.79,
    ),
    '90': buildHorizonDistribution(
      90,
      [-0.14, 0.61, 0.53, 0.69, 0.5, 0.75],
      [-0.11, 0.59, 0.54, 0.67, 0.49, 0.73],
      [-0.5, 0.36, 0.24, 0.39, 0.21, 0.47],
      [0.19, 0.82, 0.81, 0.87, 0.76, 0.92],
      0.71,
    ),
    '180': buildHorizonDistribution(
      180,
      [-0.05, 0.53, 0.49, 0.64, 0.46, 0.7],
      [-0.02, 0.52, 0.5, 0.62, 0.45, 0.69],
      [-0.49, 0.28, 0.18, 0.31, 0.16, 0.39],
      [0.31, 0.79, 0.79, 0.84, 0.75, 0.9],
      0.59,
    ),
    '365': buildHorizonDistribution(
      365,
      [0.03, 0.45, 0.47, 0.59, 0.42, 0.63],
      [0.05, 0.46, 0.48, 0.58, 0.41, 0.62],
      [-0.42, 0.2, 0.13, 0.24, 0.1, 0.31],
      [0.43, 0.74, 0.77, 0.8, 0.72, 0.86],
      0.44,
    ),
  };

  const sampleValencePaths: MonteCarloAudit['sample_valence_paths'] = Array.from({ length: 6 }, (_, sim) => ({
    sim_index: sim * 137 + 11,
    valence_every_30d: Array.from({ length: 13 }, (_, i) =>
      round(-0.18 + 0.02 * i + 0.14 * Math.sin(i / 2.3 + sim * 0.6) - 0.05 * Math.cos(i / 3.1), 3),
    ),
  }));

  const fanChartDays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 365];
  const fanChart = fanChartDays.map((day, idx) => {
    const center = round(-0.17 + 0.0006 * day - 0.04 * Math.sin(idx / 2.4), 3);
    const spread = round(0.12 + day / 1600, 3);
    return {
      day,
      p10: round(center - spread, 3),
      p50: center,
      p90: round(center + spread, 3),
    };
  });

  return {
    horizons,
    dominant_future_strains: strains,
    projection_confidence: 0.67,
    projection_quality: {
      overall: 0.67,
      data_coverage: 0.74,
      ou_fit: 0.67,
      strain_stability: 0.69,
      state_agreement: 0.63,
      horizon_confidence: { '30': 0.79, '90': 0.71, '180': 0.59, '365': 0.44 },
      horizon_decay_tau: 93,
      notes: [
        'Calendar-aware OU fit improves short-horizon calibration.',
        'Confidence decays after 180 days due to shock sensitivity.',
        'Strain projections remain robust for top two narrative clusters.',
      ],
    },
    scenario_paths: [
      {
        name: 'Amplified Civic Advocate',
        probability: 0.44,
        description:
          'Election and institutional themes intensify; ideological salience remains high while valence slowly recovers through community reinforcement.',
      },
      {
        name: 'Measured Continuity',
        probability: 0.31,
        description:
          'Posting rhythm normalizes, debate framing persists, and engagement stabilizes without major narrative pivots.',
      },
      {
        name: 'Selective Rebalance',
        probability: 0.25,
        description:
          'A controlled shift toward wellness and personal routines lowers arousal while maintaining periodic policy commentary.',
      },
    ],
    fan_chart: fanChart,
    simulation_audit: {
      n_simulations: 10000,
      horizons_days: [30, 90, 180, 365],
      state_dimensions: 6,
      elapsed_ms: 85000,
      random_seed: 92417,
      total_timestep_updates: 3650000,
      ou_r_squared: 0.67,
      ou_fit_method: 'block_diagonal_calendar',
      ou_n_observations: 72,
      model: 'coupled_ou_sir',
      progress_updates: 20,
      valence_std_by_horizon: { '30': 0.16, '90': 0.22, '180': 0.27, '365': 0.31 },
      convergence_ok: true,
      sample_valence_paths: sampleValencePaths,
      calendar_integrated_days: 365,
      mean_post_interval_days: 5.07,
      per_dimension_r2: [0.71, 0.66, 0.64, 0.69, 0.67, 0.65],
      half_lives_days: [2.1, 2.57, 3.3, 2.89, 2.39, 2.24],
      entropy_sources: [
        'lognormal alpha perturbation',
        'lognormal sigma perturbation',
        'gaussian fused-state noise',
        'sir beta/gamma perturbation',
        'calendar shock injection',
      ],
      mean_valence_spread: 0.24,
      paths_integrated: 10000,
    },
    behavioral_state: {
      measured_state: {
        valence: -0.2,
        arousal: 0.65,
        stability: 0.55,
        connectivity: 0.7,
        engagement: 0.53,
        ideological: 0.72,
      },
      inferred_state: {
        valence: -0.13,
        arousal: 0.61,
        stability: 0.59,
        connectivity: 0.67,
        engagement: 0.51,
        ideological: 0.7,
      },
      fused_state: {
        valence: -0.17,
        arousal: 0.63,
        stability: 0.57,
        connectivity: 0.69,
        engagement: 0.52,
        ideological: 0.71,
      },
      fusion_weight_measured: 0.55,
      behavioral_profile: {
        rhythm: 'event-reactive with moderate baseline regularity',
        engagement_strategy: 'conviction-first with selective audience broadening',
        content_mode: 'long-form explanatory captions with periodic reels',
        topic_commitment: 'high commitment to civic and institutional discourse',
        affect_pattern: 'elevated arousal with recovering valence trend',
        summary: 'Behavioral fusion indicates principled continuity under moderate volatility.',
      },
      calendar_span_days: 365,
      mean_post_interval_days: 5.07,
    },
  };
}

function buildFutureNarrative(): FutureStateNarrative {
  return {
    next_30_days:
      'Expect continued election and accountability commentary with elevated arousal. Posting intensity is likely to rise around civic flashpoints while maintaining a structured explainer tone.',
    next_90_days:
      'Topic drift near 0.58 suggests a branching path: either deeper institutional specialization or a tactical balance with broader social themes to recover engagement.',
    six_month_horizon:
      'By six months, the profile likely consolidates as a debate-council style civic voice. Valence remains sensitive to external events, but stability improves if posting cadence remains regular.',
    long_horizon:
      'At one year, baseline state trends toward moderate arousal and stronger ideological coherence; uncertainty increases with macro-political shocks and platform algorithm shifts.',
    epistemic_limits:
      'Inferences are constrained to public Instagram traces. No clinical conclusions, private motivations, or offline network dynamics are directly observable.',
    profile_context:
      'The account sits at the intersection of political commentary and regional cultural discourse, with Tamil identity cues functioning as trust architecture.',
    strain_outlook:
      '#politics·#election remains expansionary, #institutional·#justice remains structurally stable, and #fitness·#wellness likely stays peripheral unless personal priorities shift.',
    goals_outlook: {
      strategic_summary:
        'Most probable strategy is to deepen civic authority while preserving linguistic and cultural accessibility for Tamil-speaking audiences.',
      instagram_trajectory:
        'Longer caption explainers, event-reactive reels, and selective highlight curation around reform topics.',
      focus_areas: [
        {
          area: 'Institutional literacy content',
          rationale: 'Highest persistence across signals and narrative layers.',
          confidence: 0.74,
        },
        {
          area: 'Tamil civic bridge-building',
          rationale: 'Cultural analysis suggests this is a differentiating trust channel.',
          confidence: 0.69,
        },
        {
          area: 'Engagement quality over volume',
          rationale: 'Behavioral utility prioritizes coherence over raw reach.',
          confidence: 0.65,
        },
      ],
      likely_goals: [
        {
          goal: 'Build a recognizable civic explainer series',
          timeframe: '30-90 days',
          reasoning: 'Caption structure and highlight use already support serialized communication.',
        },
        {
          goal: 'Expand coalition dialogue without diluting stance',
          timeframe: '90-180 days',
          reasoning: 'Bridge-audience strategy requires cross-group legibility.',
        },
        {
          goal: 'Stabilize emotional volatility while preserving urgency',
          timeframe: '6-12 months',
          reasoning: 'OU projections indicate benefits from cadence regularization.',
        },
      ],
      reasoning_trace:
        'Combined evidence from derived signals, revised hypotheses, OU dynamics, and Monte Carlo scenario weights.',
    },
  };
}

export function buildDemoFixture(): DemoFixture {
  const signalMatrix = buildDemoMatrix();

  const derivedSignals: DerivedSignals = {
    posting_regularity: 0.42,
    engagement_slope: -0.003,
    caption_length_slope: 2.1,
    hashtag_slope: 0.04,
    emotional_volatility: 0.61,
    burst_events: [
      {
        start_index: 24,
        end_index: 27,
        multiplier: 2.8,
        start_date: '2025-09-14T00:00:00.000Z',
        description: 'Election commission controversy triggered accelerated commentary burst.',
      },
      {
        start_index: 45,
        end_index: 48,
        multiplier: 3.1,
        start_date: '2026-01-22T00:00:00.000Z',
        description: 'High-profile institutional justice verdict drove concentrated posting.',
      },
      {
        start_index: 61,
        end_index: 64,
        multiplier: 2.6,
        start_date: '2026-04-23T00:00:00.000Z',
        description: 'Regional protest wave prompted sustained civic explainer cycle.',
      },
    ],
    topic_drift_score: 0.58,
    persona_consistency_score: 0.55,
  };

  const signalSummary = buildSignalSummary(signalMatrix);
  const hypotheses = buildAgentHypotheses();
  const challenges = buildChallenges();
  const revisedHypotheses = buildRevisedHypotheses(hypotheses, challenges);
  const personaModel = buildPersonaModel();
  const xStar = [-0.12, 0.58, 0.61, 0.72, 0.48, 0.64];
  const ouParameters = buildOuParameters(xStar);
  const phasePortrait = buildPhasePortrait();
  const strains = buildStrains();
  const futureState = buildFutureState(strains);
  const futureNarrative = buildFutureNarrative();

  const projectionConfidence = {
    short_term_30d: 0.79,
    medium_term_90d: 0.71,
    long_term_180d: 0.59,
    annual_365d: 0.44,
  };

  const report: PersonaDynamicsReport = {
    profile_url: DEMO_PROFILE_URL,
    username: DEMO_USERNAME,
    analysis_period_days: 365,
    posts_analysed: 72,
    signal_summary: signalSummary,
    derived_signals: derivedSignals,
    signal_matrix: signalMatrix,
    agent_hypotheses: hypotheses,
    debate_record: {
      original_hypotheses: hypotheses,
      challenges,
      revised_hypotheses: revisedHypotheses,
      synthesis: personaModel,
    },
    persona_model: personaModel,
    ou_parameters: ouParameters,
    phase_portrait: phasePortrait,
    belief_strain_profiles: strains,
    future_state: futureState,
    future_narrative: futureNarrative,
    data_quality_score: 0.71,
    model_fit_r_squared: 0.67,
    projection_confidence: projectionConfidence,
    ethical_flags: [
      'public_profile_only',
      'no_clinical_diagnosis',
      'cross_platform_blind_spot',
      'forecast_uncertainty_degrades_over_time',
    ],
    generated_at: new Date().toISOString(),
  };

  const intermediatePayloads: Record<string, Record<string, unknown>> = {
    s1_matrix: signalMatrix as unknown as Record<string, unknown>,
    s1_derived: derivedSignals as unknown as Record<string, unknown>,
    s1_summary: signalSummary as unknown as Record<string, unknown>,
    s2_agents: { hypotheses },
    s2_challenge: { challenges },
    s2_defense: { revised_hypotheses: revisedHypotheses },
    s2_synthesis: personaModel as unknown as Record<string, unknown>,
    s2_persona: personaModel as unknown as Record<string, unknown>,
    s3_state: {
      dimensions: 6,
      points: signalMatrix.captions.length,
      behavioral_profile: futureState.behavioral_state?.behavioral_profile,
      behavioral_state: futureState.behavioral_state,
      calendar_span_days: futureState.behavioral_state?.calendar_span_days ?? 365,
      fusion_weight_measured: futureState.behavioral_state?.fusion_weight_measured ?? 0.55,
    },
    s3_ou: ouParameters as unknown as Record<string, unknown>,
    s3_portrait: phasePortrait as unknown as Record<string, unknown>,
    s3_strains: { strains },
    s3_monte: futureState as unknown as Record<string, unknown>,
    s3_narrative: futureNarrative as unknown as Record<string, unknown>,
  };

  hypotheses.forEach((h) => {
    intermediatePayloads[`s2_agent_${h.agent}`] = { hypothesis: h };
  });
  challenges.forEach((c) => {
    intermediatePayloads[`s2_ch_${c.challenger}_${c.target}`] = c as unknown as Record<string, unknown>;
  });
  revisedHypotheses.forEach((r) => {
    intermediatePayloads[`s2_defense_${r.agent}`] = r as unknown as Record<string, unknown>;
  });
  strains.forEach((strain) => {
    intermediatePayloads[`s3_strain_${strain.strain_type}`] = strain as unknown as Record<string, unknown>;
  });

  return {
    report,
    intermediate_payloads: intermediatePayloads,
  };
}
