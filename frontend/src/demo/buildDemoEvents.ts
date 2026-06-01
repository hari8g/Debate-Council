import type { PipelineEvent } from '../types/report';
import { buildDemoFixture, DEMO_JOB_ID, DEMO_USERNAME, type DemoFixture } from './buildDemoFixture';

const STAGE_META: Record<number, { title: string; description: string }> = {
  1: { title: 'Profile Signal Extraction', description: 'Extracting temporal signal matrix from Instagram profile' },
  2: { title: 'Multi-Agent Debate Council', description: 'Six agents debate to stress-test persona hypotheses' },
  3: { title: 'Future State Projection', description: 'Dynamical systems modelling and Monte Carlo simulation' },
};

const S1_LABELS: Record<string, string> = {
  s1_resolve: 'Resolve profile',
  s1_metadata: 'Fetch profile metadata',
  s1_posts: 'Fetch posts',
  s1_stories: 'Stories & highlights',
  s1_engagement: 'Post engagement depth',
  s1_matrix: 'Build signal matrix',
  s1_derived: 'Compute derived signals',
  s1_summary: 'Signal summary',
};

const AGENTS = [
  'psychographer',
  'sociologist',
  'narrative_analyst',
  'behavioural_economist',
  'temporal_analyst',
  'cultural_analyst',
];

function evt(type: PipelineEvent['type'], data: Record<string, unknown>, ts: number): PipelineEvent {
  return { type, job_id: DEMO_JOB_ID, timestamp: ts, data };
}

let cachedFixture: DemoFixture | null = null;
let cachedEvents: PipelineEvent[] | null = null;
/** Bump when event sequencing changes so hot-reload picks up new demo timelines. */
const DEMO_EVENTS_BUILD_ID = 4;
let cachedEventsBuildId: number | null = null;

export function getDemoFixture(): DemoFixture {
  if (!cachedFixture) cachedFixture = buildDemoFixture();
  return cachedFixture;
}

export function buildDemoEvents(fixture = getDemoFixture()): PipelineEvent[] {
  if (cachedEvents && cachedEventsBuildId === DEMO_EVENTS_BUILD_ID) return cachedEvents;

  const { report, intermediate_payloads: p } = fixture;
  const events: PipelineEvent[] = [];
  let t = Date.now() / 1000;

  const bump = (sec = 0.35) => {
    t += sec;
    return t;
  };

  // ── Stage 1 ──
  events.push(evt('STAGE_START', { stage: 1, ...STAGE_META[1] }, bump(0.1)));

  for (const id of Object.keys(S1_LABELS)) {
    events.push(evt('SUBSTEP_START', { stage: 1, id, label: S1_LABELS[id] }, bump(0.05)));

    if (id === 's1_resolve') {
      events.push(evt('SUBSTEP_COMPLETE', { stage: 1, id, payload: { username: DEMO_USERNAME } }, bump(0.4)));
    } else if (id === 's1_metadata') {
      events.push(
        evt(
          'SUBSTEP_COMPLETE',
          {
            stage: 1,
            id,
            payload: {
              username: DEMO_USERNAME,
              follower_count: report.signal_summary.follower_count,
              following_count: report.signal_summary.following_count,
              bio: report.signal_summary.bio,
              is_verified: false,
              source: 'demo_fixture',
            },
          },
          bump(0.5),
        ),
      );
    } else if (id === 's1_posts') {
      for (let page = 1; page <= 4; page++) {
        events.push(
          evt(
            'SUBSTEP_PROGRESS',
            {
              stage: 1,
              id,
              message: `Page ${page}/4 · ${page * 18} posts collected (full archive)`,
              percent: (page / 4) * 100,
            },
            bump(0.25),
          ),
        );
      }
      events.push(
        evt(
          'SUBSTEP_COMPLETE',
          { stage: 1, id, payload: { posts_analysed: report.posts_analysed, fetch_all_posts: true } },
          bump(0.3),
        ),
      );
    } else if (id === 's1_stories') {
      events.push(
        evt(
          'SUBSTEP_COMPLETE',
          {
            stage: 1,
            id,
            payload: {
              stories: report.signal_summary.enrichment?.stories.length ?? 4,
              highlights: report.signal_summary.enrichment?.highlights.length ?? 2,
            },
          },
          bump(0.45),
        ),
      );
    } else if (id === 's1_engagement') {
      events.push(
        evt(
          'SUBSTEP_PROGRESS',
          { stage: 1, id, message: 'Enriching 10 recent posts with comments and likers…', percent: 50 },
          bump(0.2),
        ),
      );
      events.push(
        evt(
          'SUBSTEP_COMPLETE',
          {
            stage: 1,
            id,
            payload: {
              posts_enriched: report.signal_summary.enrichment?.capture_report.posts_enriched ?? 10,
              comments_fetched: report.signal_summary.enrichment?.capture_report.comments_fetched ?? 840,
            },
          },
          bump(0.5),
        ),
      );
    } else if (id === 's1_matrix') {
      events.push(evt('SUBSTEP_COMPLETE', { stage: 1, id, payload: p.s1_matrix }, bump(0.45)));
    } else if (id === 's1_derived') {
      events.push(
        evt(
          'SUBSTEP_PROGRESS',
          {
            stage: 1,
            id,
            message: 'Computing posting regularity & engagement slope…',
            percent: 38,
          },
          bump(0.1),
        ),
      );
      events.push(
        evt(
          'SUBSTEP_PROGRESS',
          {
            stage: 1,
            id,
            message: 'Scoring topic drift & emotional volatility (Stage 3 drivers)…',
            percent: 78,
          },
          bump(0.12),
        ),
      );
      events.push(evt('SUBSTEP_COMPLETE', { stage: 1, id, payload: p.s1_derived }, bump(0.32)));
    } else if (id === 's1_summary') {
      events.push(evt('SUBSTEP_COMPLETE', { stage: 1, id, payload: p.s1_summary }, bump(0.35)));
    }
  }

  events.push(
    evt(
      'STAGE_COMPLETE',
      {
        stage: 1,
        payload: {
          signal_summary: report.signal_summary,
          derived_signals: report.derived_signals,
        },
      },
      bump(0.2),
    ),
  );

  // ── Stage 2 ──
  events.push(evt('STAGE_START', { stage: 2, ...STAGE_META[2] }, bump(0.15)));
  events.push(evt('SUBSTEP_START', { stage: 2, id: 's2_agents', label: 'Agent hypotheses (6 parallel)' }, bump(0.05)));

  for (const agent of AGENTS) {
    events.push(
      evt('SUBSTEP_COMPLETE', { stage: 2, id: `s2_agent_${agent}`, payload: p[`s2_agent_${agent}`] }, bump(0.18)),
    );
  }
  events.push(evt('SUBSTEP_COMPLETE', { stage: 2, id: 's2_agents', payload: p.s2_agents }, bump(0.1)));

  events.push(evt('SUBSTEP_START', { stage: 2, id: 's2_challenge', label: 'Round 1: Challenges' }, bump(0.05)));
  const challenges = report.debate_record?.challenges ?? [];
  challenges.forEach((ch, i) => {
    events.push(
      evt(
        'SUBSTEP_PROGRESS',
        {
          stage: 2,
          id: 's2_challenge',
          message: `Challenge ${i + 1}/${challenges.length}: ${ch.challenger} → ${ch.target}`,
          percent: ((i + 1) / challenges.length) * 100,
        },
        bump(0.04),
      ),
    );
    events.push(
      evt(
        'SUBSTEP_COMPLETE',
        { stage: 2, id: `s2_ch_${ch.challenger}_${ch.target}`, payload: p[`s2_ch_${ch.challenger}_${ch.target}`] ?? ch },
        bump(0.02),
      ),
    );
  });
  events.push(evt('SUBSTEP_COMPLETE', { stage: 2, id: 's2_challenge', payload: { count: challenges.length } }, bump(0.1)));

  events.push(evt('SUBSTEP_START', { stage: 2, id: 's2_defense', label: 'Round 2: Defenses' }, bump(0.05)));
  const revised = report.debate_record?.revised_hypotheses ?? [];
  revised.forEach((r, i) => {
    events.push(
      evt(
        'SUBSTEP_PROGRESS',
        {
          stage: 2,
          id: 's2_defense',
          message: `Defense ${i + 1}/${revised.length}: ${r.agent}`,
          percent: ((i + 1) / revised.length) * 100,
        },
        bump(0.08),
      ),
    );
    events.push(
      evt('SUBSTEP_COMPLETE', { stage: 2, id: `s2_defense_${r.agent}`, payload: p[`s2_defense_${r.agent}`] ?? r }, bump(0.12)),
    );
  });
  events.push(evt('SUBSTEP_COMPLETE', { stage: 2, id: 's2_defense', payload: { count: revised.length } }, bump(0.1)));

  events.push(evt('SUBSTEP_START', { stage: 2, id: 's2_synthesis', label: 'Round 3: Synthesis' }, bump(0.05)));
  events.push(
    evt(
      'SUBSTEP_PROGRESS',
      {
        stage: 2,
        id: 's2_synthesis',
        message: 'Merging six revised analyses…',
        percent: 25,
      },
      bump(0.08),
    ),
  );
  events.push(
    evt(
      'SUBSTEP_PROGRESS',
      {
        stage: 2,
        id: 's2_synthesis',
        message: 'LLM synthesising unified PersonaModel…',
        percent: 55,
      },
      bump(0.12),
    ),
  );
  events.push(
    evt(
      'SUBSTEP_PROGRESS',
      {
        stage: 2,
        id: 's2_synthesis',
        message: 'Building synthesis claim cards…',
        percent: 88,
      },
      bump(0.1),
    ),
  );
  events.push(evt('SUBSTEP_COMPLETE', { stage: 2, id: 's2_synthesis', payload: p.s2_synthesis }, bump(0.28)));
  events.push(evt('SUBSTEP_START', { stage: 2, id: 's2_persona', label: 'Unified persona model' }, bump(0.05)));
  events.push(
    evt(
      'SUBSTEP_PROGRESS',
      {
        stage: 2,
        id: 's2_persona',
        message: 'Structuring identity, psychology & 6D state…',
        percent: 60,
      },
      bump(0.1),
    ),
  );
  events.push(evt('SUBSTEP_COMPLETE', { stage: 2, id: 's2_persona', payload: p.s2_persona }, bump(0.15)));

  events.push(
    evt(
      'STAGE_COMPLETE',
      { stage: 2, payload: { persona_model: report.persona_model, debate_summary: { agents: 6, challenges: 30 } } },
      bump(0.15),
    ),
  );

  // ── Stage 3 ──
  events.push(evt('STAGE_START', { stage: 3, ...STAGE_META[3] }, bump(0.15)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_state', label: 'State vector estimation' }, bump(0.05)));
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_state', payload: p.s3_state }, bump(0.5)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_ou', label: 'OU parameter fitting' }, bump(0.05)));
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_ou', payload: p.s3_ou }, bump(0.45)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_portrait', label: 'Phase portrait computation' }, bump(0.05)));
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_portrait', payload: p.s3_portrait }, bump(0.4)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_strains', label: 'Adaptive belief strain discovery' }, bump(0.05)));
  for (const strain of report.belief_strain_profiles) {
    events.push(
      evt(
        'SUBSTEP_COMPLETE',
        { stage: 3, id: `s3_strain_${strain.strain_type}`, payload: p[`s3_strain_${strain.strain_type}`] ?? strain },
        bump(0.15),
      ),
    );
  }
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_strains', payload: p.s3_strains }, bump(0.1)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_monte', label: 'Monte Carlo simulation' }, bump(0.05)));
  const mcSteps = [1000, 2000, 3500, 5000, 6500, 7500, 8500, 9200, 9600, 10000];
  mcSteps.forEach((paths, i) => {
    events.push(
      evt(
        'SUBSTEP_PROGRESS',
        {
          stage: 3,
          id: 's3_monte',
          message: `${paths.toLocaleString()} / 10,000 paths integrated`,
          percent: ((i + 1) / mcSteps.length) * 100,
        },
        bump(0.12),
      ),
    );
  });
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_monte', payload: p.s3_monte }, bump(0.2)));

  events.push(evt('SUBSTEP_START', { stage: 3, id: 's3_narrative', label: 'Future narrative generation' }, bump(0.05)));
  events.push(evt('SUBSTEP_COMPLETE', { stage: 3, id: 's3_narrative', payload: p.s3_narrative }, bump(0.55)));

  events.push(
    evt(
      'STAGE_COMPLETE',
      {
        stage: 3,
        payload: {
          ou_r_squared: report.model_fit_r_squared,
          projection_confidence: report.future_state?.projection_confidence,
        },
      },
      bump(0.1),
    ),
  );

  events.push(evt('JOB_COMPLETE', { report }, bump(0.1)));

  cachedEvents = events;
  cachedEventsBuildId = DEMO_EVENTS_BUILD_ID;
  return events;
}

export function eventsForStage(allEvents: PipelineEvent[], stage: number): PipelineEvent[] {
  const out: PipelineEvent[] = [];
  let inStage = false;
  for (const e of allEvents) {
    if (e.type === 'STAGE_RERUN_START' && e.data.stage === stage) {
      inStage = true;
      out.push(e);
      continue;
    }
    if (e.type === 'STAGE_START' && e.data.stage === stage) {
      inStage = true;
      out.push(e);
      continue;
    }
    if (inStage && e.type === 'STAGE_START' && e.data.stage !== stage) break;
    if (inStage && e.type === 'JOB_COMPLETE') break;
    if (inStage) out.push(e);
    if (inStage && e.type === 'STAGE_COMPLETE' && e.data.stage === stage) break;
  }
  return out;
}

/** Stage 2 only — used by the interactive debate council demo (Stage 1 pre-seeded). */
export function buildDebateCouncilEvents(fixture = getDemoFixture()): PipelineEvent[] {
  return eventsForStage(buildDemoEvents(fixture), 2);
}

export function buildStage1SeedEvents(fixture = getDemoFixture()): PipelineEvent[] {
  return eventsForStage(buildDemoEvents(fixture), 1);
}

export function rerunEventsForStage(stage: number, fixture = getDemoFixture()): PipelineEvent[] {
  const report = fixture.report;
  const stageEvents = eventsForStage(buildDemoEvents(fixture), stage);
  return [
    evt('STAGE_RERUN_START', { stage }, Date.now() / 1000),
    ...stageEvents,
    evt('REPORT_UPDATE', { stage, report }, Date.now() / 1000 + 1),
  ];
}
