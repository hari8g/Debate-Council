from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.stage1 import DerivedSignals, ProfileSignalMatrix, SignalSummary
from app.models.stage2 import AgentHypothesis, DebateRecord, PersonaModel
from app.models.stage3 import (
    FutureStateDistribution,
    FutureStateNarrative,
    OuParameters,
    PersonalR0Estimate,
    PhasePortrait,
)


class PersonaDynamicsReport(BaseModel):
    profile_url: str
    username: str
    analysis_period_days: int
    posts_analysed: int
    signal_summary: SignalSummary
    derived_signals: DerivedSignals
    signal_matrix: Optional[ProfileSignalMatrix] = None
    agent_hypotheses: list[AgentHypothesis] = Field(default_factory=list)
    debate_record: Optional[DebateRecord] = None
    persona_model: Optional[PersonaModel] = None
    ou_parameters: Optional[OuParameters] = None
    phase_portrait: Optional[PhasePortrait] = None
    belief_strain_profiles: list[PersonalR0Estimate] = Field(default_factory=list)
    future_state: Optional[FutureStateDistribution] = None
    future_narrative: Optional[FutureStateNarrative] = None
    data_quality_score: float = 0.0
    model_fit_r_squared: float = 0.0
    projection_confidence: dict[str, float] = Field(default_factory=dict)
    ethical_flags: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    def model_dump_json_safe(self) -> dict[str, Any]:
        return self.model_dump(mode="json")
