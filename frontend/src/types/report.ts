export interface CommentData {
  username: string;
  text: string;
  likes: number;
}

export interface BurstEvent {
  start_index: number;
  end_index: number;
  multiplier: number;
  start_date?: string;
  description: string;
}

export interface DerivedSignals {
  posting_regularity: number;
  engagement_slope: number;
  caption_length_slope: number;
  hashtag_slope: number;
  emotional_volatility: number;
  burst_events: BurstEvent[];
  topic_drift_score: number;
  persona_consistency_score: number;
}

export interface PostSample {
  index: number;
  timestamp: string;
  caption_excerpt: string;
  post_type: string;
  likes: number;
  comments: number;
  engagement_rate: number;
  hashtags: string[];
  views?: number;
  saves?: number;
  location?: string;
  shortcode?: string;
}

export interface ProfileMetadata {
  username: string;
  full_name?: string;
  user_id?: string;
  biography?: string;
  bio_links: { url: string; title: string }[];
  external_url?: string;
  profile_pic_url?: string;
  is_verified: boolean;
  is_private: boolean;
  is_business: boolean;
  is_professional: boolean;
  follower_count: number;
  following_count: number;
  media_count: number;
  highlight_reel_count: number;
  reels_count?: number;
  category?: string;
  business_category?: string;
  pronouns: string[];
  account_age_days?: number;
  follower_following_ratio: number;
  posts_per_follower: number;
  mutual_followers_count?: number;
  has_guides: boolean;
  has_channel: boolean;
  data_sources: string[];
  capture_timestamp?: string;
}

export interface StorySnapshot {
  id: string;
  taken_at?: string;
  media_type: string;
  expires_at?: string;
  viewer_count?: number;
  caption?: string;
  link_url?: string;
  mentions: string[];
}

export interface HighlightSnapshot {
  id: string;
  title: string;
  cover_url?: string;
  item_count: number;
}

export interface PostDetail {
  media_id: string;
  shortcode: string;
  post_index: number;
  likes: number;
  comments_count: number;
  views?: number;
  saves?: number;
  shares?: number;
  location_name?: string;
  mentions: string[];
  tagged_users: string[];
  is_carousel: boolean;
  carousel_count: number;
  like_and_view_counts_disabled: boolean;
  top_comments: CommentData[];
  liker_sample: string[];
  music_title?: string;
  accessibility_caption?: string;
  post_url?: string;
}

export interface DataCaptureReport {
  posts_fetched: number;
  posts_enriched: number;
  comments_fetched: number;
  likers_sampled: number;
  stories_fetched: number;
  highlights_fetched: number;
  feed_pages_scanned: number;
  api_calls_made: number;
  limitations: string[];
  quality_score: number;
}

export interface ProfileEnrichment {
  metadata: ProfileMetadata;
  stories: StorySnapshot[];
  highlights: HighlightSnapshot[];
  post_details: PostDetail[];
  capture_report: DataCaptureReport;
}

export interface SignalSummary {
  username: string;
  bio?: string;
  follower_count: number;
  following_count: number;
  posts_analysed: number;
  analysis_period_days: number;
  fetch_all_posts?: boolean;
  post_samples: PostSample[];
  enrichment?: ProfileEnrichment;
}

export interface ProfileSignalMatrix {
  username: string;
  bio?: string;
  post_timestamps: string[];
  captions: string[];
  hashtag_sets: string[][];
  post_types: string[];
  likes: number[];
  comments_counts: number[];
  follower_count: number;
  following_count: number;
  posting_intervals_hours: number[];
  engagement_rates: number[];
  caption_lengths: number[];
  hashtag_counts: number[];
}

export interface AgentHypothesis {
  agent: string;
  analysis: Record<string, unknown>;
}

export interface Challenge {
  challenger: string;
  target: string;
  challenge_text: string | Record<string, unknown>;
}

export interface RevisedHypothesis {
  agent: string;
  original: AgentHypothesis;
  challenges_received: Challenge[];
  revised_analysis: Record<string, unknown>;
}

export interface PersonaClaim {
  claim: string;
  confidence: number;
  evidence: string;
  speculative?: boolean;
}

export interface PersonaSection {
  title: string;
  claims: PersonaClaim[];
  summary: string;
}

export interface PsychologicalState {
  valence: number;
  arousal: number;
  stability: number;
  connectivity: number;
  engagement: number;
  ideological: number;
}

export interface PersonaModel {
  summary: string;
  key_insight: string;
  core_identity: PersonaSection;
  psychological_profile: PersonaSection;
  social_strategy: PersonaSection;
  narrative_self_model: PersonaSection;
  revealed_preferences: PersonaSection;
  cultural_identity: PersonaSection;
  temporal_state: PersonaSection;
  genuine_uncertainties: PersonaSection;
  current_state: PsychologicalState;
  big_five: Record<string, number>;
}

export interface DebateRecord {
  original_hypotheses: AgentHypothesis[];
  challenges: Challenge[];
  revised_hypotheses: RevisedHypothesis[];
  synthesis?: PersonaModel;
}

export interface PhasePortraitSlice {
  dim1: number;
  dim2: number;
  dim1_label: string;
  dim2_label: string;
  v_grid: number[][];
  a_grid: number[][];
  dv: number[][];
  da: number[][];
  equilibrium_v: number;
  equilibrium_a: number;
  mean_reversion_rate_v: number;
  mean_reversion_rate_a: number;
  historical_trajectory: number[][];
  fixed_point_type?: string;
  half_life_v_days?: number;
  half_life_a_days?: number;
}

export interface PhasePortrait {
  v_grid: number[][];
  a_grid: number[][];
  dv: number[][];
  da: number[][];
  equilibrium_v: number;
  equilibrium_a: number;
  mean_reversion_rate_v: number;
  mean_reversion_rate_a: number;
  historical_trajectory: number[][];
  slices?: PhasePortraitSlice[];
  cyclicality_score?: number;
  cyclicality_detected?: boolean;
  fixed_point_type?: string;
}

export interface PersonalR0Estimate {
  strain_type: string;
  label?: string;
  keywords?: string[];
  beta: number;
  gamma: number;
  r0: number;
  uncertainty: number[];
  data_quality: string;
  trajectory: string;
  activation_history?: number[];
  peak_post_index?: number;
  evidence_captions?: string[];
  interpretation?: string;
  posts_active?: number;
  posts_total?: number;
  plain_summary?: string;
  momentum_ratio?: number;
  trend_label?: 'growing' | 'fading' | 'steady' | string;
  prevalence_pct?: number;
  early_activation?: number;
  recent_activation?: number;
  relevance_score?: number;
  sir_fit_r2?: number;
  metric_confidence?: 'high' | 'moderate' | 'low' | string;
  sir_reliable?: boolean;
  changepoint_indices?: number[];
  projected_activation_30d?: number;
  projected_activation_90d?: number;
  projected_activation_180d?: number;
}

export interface BehavioralProfile {
  rhythm: string;
  engagement_strategy: string;
  content_mode: string;
  topic_commitment: string;
  affect_pattern: string;
  summary: string;
}

export interface BehavioralStateModel {
  measured_state: PsychologicalState;
  inferred_state: PsychologicalState;
  fused_state: PsychologicalState;
  fusion_weight_measured: number;
  behavioral_profile: BehavioralProfile;
  calendar_span_days: number;
  mean_post_interval_days: number;
}

export interface ProjectionQuality {
  overall: number;
  data_coverage: number;
  ou_fit: number;
  strain_stability: number;
  state_agreement: number;
  horizon_confidence: Record<string, number>;
  horizon_decay_tau: number;
  notes: string[];
}

export interface HorizonDistribution {
  horizon_days: number;
  median: number[];
  mean: number[];
  p10: number[];
  p90: number[];
  p_positive_valence: number;
  p_high_arousal: number;
  p_low_stability: number;
  p_high_ideological: number;
  p_valence_cross_zero?: number;
  p_regime_persistence?: number;
  confidence?: number;
}

export interface FanChartPoint {
  day: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface MonteCarloAudit {
  n_simulations: number;
  horizons_days: number[];
  state_dimensions: number;
  elapsed_ms: number;
  random_seed: number;
  total_timestep_updates: number;
  ou_r_squared: number;
  ou_fit_method: string;
  ou_n_observations: number;
  model: string;
  progress_updates: number;
  valence_std_by_horizon: Record<string, number>;
  convergence_ok: boolean;
  sample_valence_paths: { sim_index: number; valence_every_30d: number[] }[];
  calendar_integrated_days?: number;
  mean_post_interval_days?: number;
  per_dimension_r2?: number[];
  half_lives_days?: number[];
  entropy_sources?: string[];
  mean_valence_spread?: number;
  paths_integrated?: number;
}

export interface FutureStateDistribution {
  horizons: Record<string, HorizonDistribution>;
  dominant_future_strains: PersonalR0Estimate[];
  projection_confidence: number;
  projection_quality?: ProjectionQuality;
  scenario_paths: { name: string; probability: number; description: string }[];
  simulation_audit?: MonteCarloAudit;
  fan_chart?: FanChartPoint[];
  behavioral_state?: BehavioralStateModel;
}

export interface FutureGoalsOutlook {
  strategic_summary: string;
  instagram_trajectory: string;
  focus_areas: { area: string; rationale: string; confidence: number }[];
  likely_goals: { goal: string; timeframe: string; reasoning: string }[];
  reasoning_trace: string;
}

export interface FutureStateNarrative {
  next_30_days: string;
  next_90_days: string;
  six_month_horizon: string;
  long_horizon?: string;
  epistemic_limits: string;
  profile_context?: string;
  strain_outlook?: string;
  goals_outlook?: FutureGoalsOutlook;
}

export interface OuParameters {
  alpha: number[][];
  x_star: number[];
  sigma: number[];
  r_squared: number;
  state_history: number[][];
  fit_method?: string;
  n_observations?: number;
  input_matrix_b?: number[][];
  input_labels?: string[];
  mean_input?: number[];
  dt_days_series?: number[];
  mean_dt_days?: number;
  calendar_span_days?: number;
  per_dimension_r2?: number[];
  half_lives_days?: number[];
  model_scores?: Record<string, number>;
}

export interface PersonaDynamicsReport {
  profile_url: string;
  username: string;
  analysis_period_days: number;
  posts_analysed: number;
  signal_summary: SignalSummary;
  derived_signals: DerivedSignals;
  signal_matrix?: ProfileSignalMatrix;
  agent_hypotheses: AgentHypothesis[];
  debate_record?: DebateRecord;
  persona_model?: PersonaModel;
  ou_parameters?: OuParameters;
  phase_portrait?: PhasePortrait;
  belief_strain_profiles: PersonalR0Estimate[];
  future_state?: FutureStateDistribution;
  future_narrative?: FutureStateNarrative;
  data_quality_score: number;
  model_fit_r_squared: number;
  projection_confidence: Record<string, number>;
  ethical_flags: string[];
  generated_at: string;
}

export type EventType =
  | 'STAGE_START'
  | 'STAGE_RERUN_START'
  | 'SUBSTEP_START'
  | 'SUBSTEP_PROGRESS'
  | 'SUBSTEP_COMPLETE'
  | 'STAGE_COMPLETE'
  | 'REPORT_UPDATE'
  | 'ERROR'
  | 'JOB_COMPLETE';

export interface PipelineEvent {
  type: EventType;
  job_id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export type ErrorLogSource = 'pipeline' | 'sse' | 'client';
export type ErrorLogSeverity = 'error' | 'warning';

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  source: ErrorLogSource;
  severity: ErrorLogSeverity;
  message: string;
  errorType?: string;
  stage?: number;
  substepId?: string;
  substepLabel?: string;
  traceback?: string;
  raw?: Record<string, unknown>;
}

export type SubstepStatus = 'pending' | 'running' | 'complete' | 'error';

export interface SubstepState {
  id: string;
  stage: number;
  label: string;
  status: SubstepStatus;
  message?: string;
  percent?: number;
  payload?: Record<string, unknown>;
}

export interface StageState {
  stage: number;
  title: string;
  description: string;
  status: SubstepStatus;
  substeps: Record<string, SubstepState>;
}

export const AGENT_LABELS: Record<string, string> = {
  psychographer: 'Psychographer',
  sociologist: 'Sociologist',
  narrative_analyst: 'Narrative Analyst',
  behavioural_economist: 'Behavioural Economist',
  temporal_analyst: 'Temporal Pattern Analyst',
  cultural_analyst: 'Cultural Context Analyst',
};

export const STATE_LABELS = [
  'Valence',
  'Arousal',
  'Stability',
  'Connectivity',
  'Engagement',
  'Ideological',
];
