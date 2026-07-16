export type ContentCycleContext = {
  avatar: string;
  scene: string;
  platform: string;
  /** Optional creative direction for prompt and publication draft. */
  postIntent: string;
};

export type SceneBriefData = {
  visualIntent?: string;
  allowedMood?: string | string[];
  positivePrompt?: string;
  negativePrompt?: string;
  referenceImages?: string[];
  [key: string]: unknown;
};

export type IdentityPackData = {
  [key: string]: unknown;
};

export type PromptPackData = {
  positivePrompt?: string;
  negativePrompt?: string;
  referenceImages?: string[];
  [key: string]: unknown;
};

export type GenerationJobData = {
  jobId?: string;
  status?: string;
  runMode?: string;
  startedAt?: string;
  promptPack?: PromptPackData;
  [key: string]: unknown;
};

export type GeneratedCandidate = {
  generatedAssetId: string;
  assetId?: string;
  avatar?: string;
  scene?: string;
  status?: string;
  url?: string;
  imageUrl?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type PublicationDraft = {
  draftId: string;
  caption?: string;
  hashtags?: string | string[];
  status?: string;
  imageUrl?: string;
  url?: string;
  createdAt?: string;
  approvedAt?: string;
  generatedAssetId?: string;
  [key: string]: unknown;
};

export type ManualExportResult = {
  imageUrl?: string;
  caption?: string;
  hashtags?: string | string[];
  manualInstructions?: string;
  [key: string]: unknown;
};

export type EndpointDebugState = {
  loading: boolean;
  error: string | null;
  response: unknown;
};
