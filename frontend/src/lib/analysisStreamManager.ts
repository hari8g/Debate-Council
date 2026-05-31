import { createEventSource, rerunStage as apiRerunStage, startAnalysis } from '../api/client';
import { useAnalysisStore, startAnalysisSession } from '../store/analysisStore';
import type { PipelineEvent } from '../types/report';

let activeStream: EventSource | null = null;

function closeStream() {
  activeStream?.close();
  activeStream = null;
}

function attachStream(jobId: string) {
  if (activeStream) return;

  const { handleEvent, appendErrorLog } = useAnalysisStore.getState();
  const es = createEventSource(jobId);
  activeStream = es;

  es.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as PipelineEvent;
      handleEvent(event);
      if (event.type === 'JOB_COMPLETE' || event.type === 'ERROR') {
        closeStream();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to parse SSE event';
      appendErrorLog({
        timestamp: Date.now(),
        source: 'client',
        severity: 'error',
        message: `SSE parse error: ${message}`,
        errorType: e instanceof Error ? e.name : 'ParseError',
        raw: { data: msg.data?.slice?.(0, 500) },
      });
    }
  };

  es.onerror = () => {
    if (useAnalysisStore.getState().status === 'running') {
      appendErrorLog({
        timestamp: Date.now(),
        source: 'sse',
        severity: 'error',
        message: 'Event stream connection closed unexpectedly. The pipeline may still be running on the server.',
        errorType: 'EventSourceError',
      });
    }
    closeStream();
  };
}

export async function startFullAnalysis(url: string, lookbackDays: number, fetchAllPosts = true) {
  closeStream();
  useAnalysisStore.getState().reset();
  const { job_id } = await startAnalysis(url, lookbackDays, fetchAllPosts);
  startAnalysisSession(job_id);
  attachStream(job_id);
}

export async function rerunPipelineStage(stage: number) {
  const { jobId, prepareStageRerun, appendErrorLog } = useAnalysisStore.getState();
  if (!jobId) return;

  prepareStageRerun(stage);
  attachStream(jobId);

  try {
    await apiRerunStage(jobId, stage);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to start stage rerun';
    appendErrorLog({
      timestamp: Date.now(),
      source: 'client',
      severity: 'error',
      message,
      stage,
      errorType: 'RerunError',
    });
    useAnalysisStore.setState({ status: 'error', error: message, rerunningStage: null });
  }
}

export function stopAnalysisStream() {
  closeStream();
}
