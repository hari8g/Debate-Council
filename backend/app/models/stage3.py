from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.stage2 import PsychologicalState


class BehavioralProfile(BaseModel):
    """Deterministic posting-behavior taxonomy from Stage 1 signals."""

    rhythm: str = "unknown"
    engagement_strategy: str = "unknown"
    content_mode: str = "unknown"
    topic_commitment: str = "unknown"
    affect_pattern: str = "unknown"
    summary: str = ""


class BehavioralStateModel(BaseModel):
    measured_state: PsychologicalState = Field(default_factory=PsychologicalState)
    inferred_state: PsychologicalState = Field(default_factory=PsychologicalState)
    fused_state: PsychologicalState = Field(default_factory=PsychologicalState)
    fusion_weight_measured: float = 0.5
    behavioral_profile: BehavioralProfile = Field(default_factory=BehavioralProfile)
    calendar_span_days: float = 0.0
    mean_post_interval_days: float = 7.0


class ProjectionQuality(BaseModel):
    overall: float = 0.0
    data_coverage: float = 0.0
    ou_fit: float = 0.0
    strain_stability: float = 0.0
    state_agreement: float = 0.0
    horizon_confidence: dict[str, float] = Field(default_factory=dict)
    horizon_decay_tau: float = 90.0
    notes: list[str] = Field(default_factory=list)


class PhasePortraitSlice(BaseModel):
    dim1: int = 0
    dim2: int = 1
    dim1_label: str = "Valence"
    dim2_label: str = "Arousal"
    v_grid: list[list[float]] = Field(default_factory=list)
    a_grid: list[list[float]] = Field(default_factory=list)
    dv: list[list[float]] = Field(default_factory=list)
    da: list[list[float]] = Field(default_factory=list)
    equilibrium_v: float = 0.0
    equilibrium_a: float = 0.0
    mean_reversion_rate_v: float = 0.0
    mean_reversion_rate_a: float = 0.0
    historical_trajectory: list[list[float]] = Field(default_factory=list)
    fixed_point_type: str = "stable_node"
    half_life_v_days: float = 0.0
    half_life_a_days: float = 0.0


class PhasePortrait(BaseModel):
    v_grid: list[list[float]] = Field(default_factory=list)
    a_grid: list[list[float]] = Field(default_factory=list)
    dv: list[list[float]] = Field(default_factory=list)
    da: list[list[float]] = Field(default_factory=list)
    equilibrium_v: float = 0.0
    equilibrium_a: float = 0.0
    mean_reversion_rate_v: float = 0.0
    mean_reversion_rate_a: float = 0.0
    historical_trajectory: list[list[float]] = Field(default_factory=list)
    slices: list[PhasePortraitSlice] = Field(default_factory=list)
    cyclicality_score: float = 0.0
    cyclicality_detected: bool = False
    fixed_point_type: str = "stable_node"


class PersonalR0Estimate(BaseModel):
    strain_type: str
    label: str = ""
    keywords: list[str] = Field(default_factory=list)
    beta: float = 0.0
    gamma: float = 0.0
    r0: float = 0.0
    uncertainty: list[float] = Field(default_factory=list)
    data_quality: str = "limited"
    trajectory: str = "stable"
    activation_history: list[float] = Field(default_factory=list)
    peak_post_index: int = -1
    evidence_captions: list[str] = Field(default_factory=list)
    interpretation: str = ""
    posts_active: int = 0
    posts_total: int = 0
    plain_summary: str = ""
    momentum_ratio: float = 1.0
    trend_label: str = "steady"
    prevalence_pct: float = 0.0
    early_activation: float = 0.0
    recent_activation: float = 0.0
    relevance_score: float = 0.0
    sir_fit_r2: float = 0.0
    metric_confidence: str = "low"
    sir_reliable: bool = False
    changepoint_indices: list[int] = Field(default_factory=list)
    projected_activation_30d: float = 0.0
    projected_activation_90d: float = 0.0
    projected_activation_180d: float = 0.0


class HorizonDistribution(BaseModel):
    horizon_days: int
    median: list[float] = Field(default_factory=list)
    mean: list[float] = Field(default_factory=list)
    p10: list[float] = Field(default_factory=list)
    p90: list[float] = Field(default_factory=list)
    p_positive_valence: float = 0.0
    p_high_arousal: float = 0.0
    p_low_stability: float = 0.0
    p_high_ideological: float = 0.0
    p_valence_cross_zero: float = 0.0
    p_regime_persistence: float = 0.0
    confidence: float = 0.0


class FanChartPoint(BaseModel):
    day: int
    p10: float = 0.0
    p50: float = 0.0
    p90: float = 0.0


class MonteCarloAudit(BaseModel):
    n_simulations: int = 0
    horizons_days: list[int] = Field(default_factory=list)
    state_dimensions: int = 6
    elapsed_ms: float = 0.0
    random_seed: int = 0
    total_timestep_updates: int = 0
    ou_r_squared: float = 0.0
    ou_fit_method: str = "diagonal_ar1"
    ou_n_observations: int = 0
    model: str = ""
    progress_updates: int = 0
    valence_std_by_horizon: dict[str, float] = Field(default_factory=dict)
    convergence_ok: bool = True
    sample_valence_paths: list[dict[str, Any]] = Field(default_factory=list)
    calendar_integrated_days: int = 0
    mean_post_interval_days: float = 7.0
    per_dimension_r2: list[float] = Field(default_factory=list)
    half_lives_days: list[float] = Field(default_factory=list)
    entropy_sources: list[str] = Field(default_factory=list)
    mean_valence_spread: float = 0.0
    paths_integrated: int = 0


class FutureStateDistribution(BaseModel):
    horizons: dict[str, HorizonDistribution] = Field(default_factory=dict)
    dominant_future_strains: list[PersonalR0Estimate] = Field(default_factory=list)
    projection_confidence: float = 0.0
    projection_quality: Optional[ProjectionQuality] = None
    scenario_paths: list[dict[str, Any]] = Field(default_factory=list)
    simulation_audit: Optional[MonteCarloAudit] = None
    fan_chart: list[FanChartPoint] = Field(default_factory=list)
    behavioral_state: Optional[BehavioralStateModel] = None


class FutureGoalsOutlook(BaseModel):
    strategic_summary: str = ""
    instagram_trajectory: str = ""
    focus_areas: list[dict[str, Any]] = Field(default_factory=list)
    likely_goals: list[dict[str, Any]] = Field(default_factory=list)
    reasoning_trace: str = ""


class FutureStateNarrative(BaseModel):
    next_30_days: str = ""
    next_90_days: str = ""
    six_month_horizon: str = ""
    long_horizon: str = ""
    epistemic_limits: str = ""
    profile_context: str = ""
    strain_outlook: str = ""
    goals_outlook: Optional[FutureGoalsOutlook] = None


class OuParameters(BaseModel):
    alpha: list[list[float]] = Field(default_factory=list)
    x_star: list[float] = Field(default_factory=list)
    sigma: list[float] = Field(default_factory=list)
    r_squared: float = 0.0
    state_history: list[list[float]] = Field(default_factory=list)
    fit_method: str = "diagonal_ar1"
    n_observations: int = 0
    input_matrix_b: list[list[float]] = Field(default_factory=list)
    input_labels: list[str] = Field(default_factory=list)
    mean_input: list[float] = Field(default_factory=list)
    dt_days_series: list[float] = Field(default_factory=list)
    mean_dt_days: float = 1.0
    calendar_span_days: float = 0.0
    per_dimension_r2: list[float] = Field(default_factory=list)
    half_lives_days: list[float] = Field(default_factory=list)
    model_scores: dict[str, float] = Field(default_factory=dict)
