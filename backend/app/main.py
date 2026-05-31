from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.jobs.store import JobStatus, job_store, stream_job_events
from app.pipeline.orchestrator import rerun_stage, run_pipeline


class AnalyzeRequest(BaseModel):
    url: str
    fetch_all_posts: bool = True
    lookback_days: int = Field(default=365, ge=90, le=730)


class AnalyzeResponse(BaseModel):
    job_id: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="North Star", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "mock_mode": settings.use_mock_pipeline}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def start_analysis(req: AnalyzeRequest):
    job = await job_store.create_job(req.url, req.lookback_days, req.fetch_all_posts)
    await job_store.start_pipeline(job, run_pipeline)
    return AnalyzeResponse(job_id=job.job_id)


@app.post("/api/analyze/{job_id}/rerun/{stage}", response_model=AnalyzeResponse)
async def rerun_analysis_stage(job_id: str, stage: int):
    if stage not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Stage must be 1, 2, or 3")
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if stage > 1 and not job.report:
        raise HTTPException(status_code=400, detail="Complete Stage 1 before rerunning this stage")
    if stage == 3 and (not job.report or not job.report.persona_model):
        raise HTTPException(status_code=400, detail="Complete Stage 2 before rerunning Stage 3")
    try:
        await job_store.rerun_stage(job, stage, rerun_stage)
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    return AnalyzeResponse(job_id=job.job_id)


@app.get("/api/analyze/{job_id}/stream")
async def stream_analysis(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return StreamingResponse(
        stream_job_events(job),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/analyze/{job_id}")
async def get_analysis(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job.job_id,
        "status": job.status.value,
        "error": job.error,
        "report": job.report.model_dump(mode="json") if job.report else None,
    }
