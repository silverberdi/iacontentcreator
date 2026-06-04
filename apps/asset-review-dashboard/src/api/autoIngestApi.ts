import { postN8nJson } from "./n8nClient";
import type {
  AutoIngestPreviewResponse,
  RunPipelineResponse,
  WatcherActionResponse,
  WatcherStatusResponse,
} from "../types/autoIngest";

export async function getAutoIngestPreview(): Promise<AutoIngestPreviewResponse> {
  return postN8nJson<AutoIngestPreviewResponse>("/admin/auto-ingest/preview", {});
}

export async function runAutoIngestPipeline(): Promise<RunPipelineResponse> {
  return postN8nJson<RunPipelineResponse>("/admin/auto-ingest/run-pipeline", {});
}

export async function getWatcherStatus(): Promise<WatcherStatusResponse> {
  return postN8nJson<WatcherStatusResponse>("/admin/auto-ingest/watcher-status", {});
}

export async function startWatcher(): Promise<WatcherActionResponse> {
  return postN8nJson<WatcherActionResponse>("/admin/auto-ingest/watcher-start", {});
}

export async function stopWatcher(): Promise<WatcherActionResponse> {
  return postN8nJson<WatcherActionResponse>("/admin/auto-ingest/watcher-stop", {});
}

export async function runWatcherOnce(): Promise<WatcherActionResponse> {
  return postN8nJson<WatcherActionResponse>("/admin/auto-ingest/watcher-run-once", {});
}
