const API_BASE = '/api';

export async function startAnalysis(
  url: string,
  lookbackDays: number,
  fetchAllPosts = true,
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, lookback_days: lookbackDays, fetch_all_posts: fetchAllPosts }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function rerunStage(jobId: string, stage: number): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/analyze/${jobId}/rerun/${stage}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function createEventSource(jobId: string): EventSource {
  return new EventSource(`${API_BASE}/analyze/${jobId}/stream`);
}

export async function fetchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/analyze/${jobId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
