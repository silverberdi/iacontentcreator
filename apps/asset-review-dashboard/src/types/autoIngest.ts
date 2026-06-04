export type AutoIngestPipelinePayload = {
  avatar: string;
  avatarShort: string;
  scene: string;
  assetType: string;
  workflow: string;
  model: string;
  seed: number;
  version: number;
  autoPromoteLatest: boolean;
};

export type RunPipelineResponse = {
  ok?: boolean;
  status: string;
  message?: string;
  movedCount: number;
  registeredCount?: number;
  duplicatesCount?: number;
  pipelineExecuted: boolean;
};

export type AutoIngestPreviewResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  movedCount?: number;
  registeredCount?: number;
  duplicatesCount?: number;
  pendingCount?: number;
  files?: unknown[];
  pendingFiles?: unknown[];
  [key: string]: unknown;
};

export type WatcherActiveProfile = {
  profileName?: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  workflow?: string;
  model?: string;
  seed?: number;
};

export type WatcherLastRun = {
  status?: string;
  reason?: string;
  pipelineExecuted?: boolean;
  previewCount?: number;
  finishedAt?: string;
  message?: string;
};

export type WatcherStatusResponse = {
  ok?: boolean;
  enabled: boolean;
  running: boolean;
  busy: boolean;
  startedAt?: string | null;
  pendingFiles?: { count: number };
  activeProfile?: WatcherActiveProfile | null;
  lastRun?: WatcherLastRun | null;
  message?: string;
  reason?: string;
};

export type WatcherActionResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  reason?: string;
  [key: string]: unknown;
};
