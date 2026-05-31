import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Callable, Coroutine

from app.models.report import PersonaDynamicsReport
from app.streaming.events import PipelineEvent


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class JobState:
    job_id: str
    url: str
    lookback_days: int
    fetch_all_posts: bool = True
    status: JobStatus = JobStatus.PENDING
    events: list[PipelineEvent] = field(default_factory=list)
    report: PersonaDynamicsReport | None = None
    error: str | None = None
    current_stage: int | None = None
    current_substep_id: str | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    _subscribers: list[asyncio.Queue[PipelineEvent | None]] = field(default_factory=list)
    _task_running: bool = False

    def append_event(self, event: PipelineEvent) -> None:
        from app.streaming.events import EventType

        if event.type == EventType.SUBSTEP_START:
            self.current_stage = event.data.get("stage")
            self.current_substep_id = event.data.get("id")
        self.events.append(event)
        for q in self._subscribers:
            q.put_nowait(event)

    def subscribe(self) -> asyncio.Queue[PipelineEvent | None]:
        q: asyncio.Queue[PipelineEvent | None] = asyncio.Queue()
        for event in self.events:
            q.put_nowait(event)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[PipelineEvent | None]) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    def finish_rerun(self, event: PipelineEvent) -> None:
        """Apply updated report after a stage rerun without closing SSE subscribers."""
        self.append_event(event)
        self.status = JobStatus.COMPLETE
        self.error = None

    def complete(self, event: PipelineEvent) -> None:
        self.append_event(event)
        self.status = JobStatus.COMPLETE
        for q in self._subscribers:
            q.put_nowait(None)

    def fail(self, event: PipelineEvent) -> None:
        self.append_event(event)
        self.status = JobStatus.ERROR
        self.error = event.data.get("message", "Unknown error")
        for q in self._subscribers:
            q.put_nowait(None)


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, JobState] = {}
        self._lock = asyncio.Lock()

    async def create_job(self, url: str, lookback_days: int, fetch_all_posts: bool = True) -> JobState:
        job_id = str(uuid.uuid4())
        job = JobState(job_id=job_id, url=url, lookback_days=lookback_days, fetch_all_posts=fetch_all_posts)
        async with self._lock:
            self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> JobState | None:
        return self._jobs.get(job_id)

    async def start_pipeline(
        self,
        job: JobState,
        pipeline_fn: Callable[[JobState], Coroutine[Any, Any, None]],
    ) -> None:
        if job._task_running:
            raise RuntimeError("Job is already running")
        job.status = JobStatus.RUNNING
        job._task_running = True
        asyncio.create_task(self._run_pipeline(job, pipeline_fn))

    async def rerun_stage(
        self,
        job: JobState,
        stage_num: int,
        rerun_fn: Callable[[JobState, int], Coroutine[Any, Any, None]],
    ) -> None:
        if job._task_running:
            raise RuntimeError("Job is already running")
        job.status = JobStatus.RUNNING
        job.error = None
        job._task_running = True
        asyncio.create_task(self._run_stage_rerun(job, stage_num, rerun_fn))

    async def _run_stage_rerun(
        self,
        job: JobState,
        stage_num: int,
        rerun_fn: Callable[[JobState, int], Coroutine[Any, Any, None]],
    ) -> None:
        try:
            await rerun_fn(job, stage_num)
        except Exception as e:
            import time
            import traceback as tb

            from app.streaming.events import error_event

            msg = str(e).strip() or f"{type(e).__name__} (no message — see traceback)"
            recoverable = type(e).__name__ in (
                "ConnectTimeout",
                "ReadTimeout",
                "ConnectError",
                "RemoteProtocolError",
                "PoolTimeout",
            ) or "LLM API unreachable" in msg

            job.fail(
                error_event(
                    job.job_id,
                    time.time(),
                    msg,
                    stage=stage_num,
                    substep_id=job.current_substep_id,
                    error_type=type(e).__name__,
                    traceback=tb.format_exc(),
                    recoverable=recoverable,
                )
            )
        finally:
            job._task_running = False

    async def _run_pipeline(
        self,
        job: JobState,
        pipeline_fn: Callable[[JobState], Coroutine[Any, Any, None]],
    ) -> None:
        try:
            await pipeline_fn(job)
        except Exception as e:
            import time
            import traceback as tb

            from app.streaming.events import error_event

            msg = str(e).strip() or f"{type(e).__name__} (no message — see traceback)"
            recoverable = type(e).__name__ in (
                "ConnectTimeout",
                "ReadTimeout",
                "ConnectError",
                "RemoteProtocolError",
                "PoolTimeout",
            ) or "LLM API unreachable" in msg

            job.fail(
                error_event(
                    job.job_id,
                    time.time(),
                    msg,
                    stage=job.current_stage,
                    substep_id=job.current_substep_id,
                    error_type=type(e).__name__,
                    traceback=tb.format_exc(),
                    recoverable=recoverable,
                )
            )
        finally:
            job._task_running = False


job_store = JobStore()


async def stream_job_events(job: JobState) -> AsyncIterator[str]:
    q = job.subscribe()
    try:
        while True:
            event = await q.get()
            if event is None:
                break
            yield f"data: {event.model_dump_json()}\n\n"
    finally:
        job.unsubscribe(q)
