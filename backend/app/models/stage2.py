from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentHypothesis(BaseModel):
    agent: str
    analysis: dict[str, Any] = Field(default_factory=dict)


class Challenge(BaseModel):
    challenger: str
    target: str
    challenge_text: str | dict[str, Any] = ""


class RevisedHypothesis(BaseModel):
    agent: str
    original: AgentHypothesis
    challenges_received: list[Challenge] = Field(default_factory=list)
    revised_analysis: dict[str, Any] = Field(default_factory=dict)


class PersonaClaim(BaseModel):
    claim: str
    confidence: float
    evidence: str = ""
    speculative: bool = False


class PersonaSection(BaseModel):
    title: str
    claims: list[PersonaClaim] = Field(default_factory=list)
    summary: str = ""


class PsychologicalState(BaseModel):
    valence: float = 0.0
    arousal: float = 0.0
    stability: float = 0.0
    connectivity: float = 0.0
    engagement: float = 0.0
    ideological: float = 0.0


class PersonaModel(BaseModel):
    summary: str = ""
    core_identity: PersonaSection = Field(default_factory=lambda: PersonaSection(title="Core Identity"))
    psychological_profile: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Psychological Profile")
    )
    social_strategy: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Social Strategy and Capital")
    )
    narrative_self_model: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Narrative Self-Model")
    )
    revealed_preferences: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Revealed Preferences")
    )
    cultural_identity: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Cultural Identity and Tribal Affiliations")
    )
    temporal_state: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Temporal State")
    )
    genuine_uncertainties: PersonaSection = Field(
        default_factory=lambda: PersonaSection(title="Genuine Uncertainties")
    )
    key_insight: str = ""
    current_state: PsychologicalState = Field(default_factory=PsychologicalState)
    big_five: dict[str, float] = Field(default_factory=dict)


class DebateRecord(BaseModel):
    original_hypotheses: list[AgentHypothesis] = Field(default_factory=list)
    challenges: list[Challenge] = Field(default_factory=list)
    revised_hypotheses: list[RevisedHypothesis] = Field(default_factory=list)
    synthesis: Optional[PersonaModel] = None
