from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class EventType(str, Enum):
    STAGE_START = "STAGE_START"
    SUBSTEP_START = "SUBSTEP_START"
    SUBSTEP_PROGRESS = "SUBSTEP_PROGRESS"
    SUBSTEP_COMPLETE = "SUBSTEP_COMPLETE"
    STAGE_COMPLETE = "STAGE_COMPLETE"
    STAGE_RERUN_START = "STAGE_RERUN_START"
    REPORT_UPDATE = "REPORT_UPDATE"
    ERROR = "ERROR"
    JOB_COMPLETE = "JOB_COMPLETE"


class PipelineEvent(BaseModel):
    type: EventType
    job_id: str
    timestamp: float
    data: dict[str, Any] = Field(default_factory=dict)


def stage_start(job_id: str, ts: float, stage: int, title: str, description: str) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.STAGE_START,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage, "title": title, "description": description},
    )


def substep_start(job_id: str, ts: float, stage: int, substep_id: str, label: str) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.SUBSTEP_START,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage, "id": substep_id, "label": label},
    )


def substep_progress(
    job_id: str,
    ts: float,
    stage: int,
    substep_id: str,
    message: str,
    percent: float | None = None,
) -> PipelineEvent:
    data: dict[str, Any] = {"stage": stage, "id": substep_id, "message": message}
    if percent is not None:
        data["percent"] = percent
    return PipelineEvent(type=EventType.SUBSTEP_PROGRESS, job_id=job_id, timestamp=ts, data=data)


def substep_complete(
    job_id: str, ts: float, stage: int, substep_id: str, payload: dict[str, Any]
) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.SUBSTEP_COMPLETE,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage, "id": substep_id, "payload": payload},
    )


def stage_complete(job_id: str, ts: float, stage: int, payload: dict[str, Any]) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.STAGE_COMPLETE,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage, "payload": payload},
    )


def error_event(
    job_id: str,
    ts: float,
    message: str,
    stage: int | None = None,
    substep_id: str | None = None,
    error_type: str | None = None,
    traceback: str | None = None,
    recoverable: bool = False,
) -> PipelineEvent:
    data: dict[str, Any] = {"message": message, "recoverable": recoverable}
    if stage is not None:
        data["stage"] = stage
    if substep_id is not None:
        data["substep_id"] = substep_id
    if error_type is not None:
        data["error_type"] = error_type
    if traceback is not None:
        data["traceback"] = traceback
    return PipelineEvent(type=EventType.ERROR, job_id=job_id, timestamp=ts, data=data)


def job_complete(job_id: str, ts: float, report: dict[str, Any]) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.JOB_COMPLETE,
        job_id=job_id,
        timestamp=ts,
        data={"report": report},
    )


def stage_rerun_start(job_id: str, ts: float, stage: int) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.STAGE_RERUN_START,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage},
    )


def report_update(job_id: str, ts: float, stage: int, report: dict[str, Any]) -> PipelineEvent:
    return PipelineEvent(
        type=EventType.REPORT_UPDATE,
        job_id=job_id,
        timestamp=ts,
        data={"stage": stage, "report": report},
    )
