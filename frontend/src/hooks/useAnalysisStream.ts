import { useCallback } from 'react';
import { rerunPipelineStage, startFullAnalysis, stopAnalysisStream } from '../lib/analysisStreamManager';

export function useAnalysisStream() {
  const analyze = useCallback(
    (url: string, lookbackDays: number, fetchAllPosts = true) =>
      startFullAnalysis(url, lookbackDays, fetchAllPosts),
    [],
  );

  const rerunStage = useCallback((stage: number) => rerunPipelineStage(stage), []);

  const stop = useCallback(() => stopAnalysisStream(), []);

  return { analyze, rerunStage, stop };
}
