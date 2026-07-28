export type PublicationFormat = "feed-post" | "story" | "reel" | "carousel";

export type PublicationJobStatus =
  | "draft"
  | "brief-ready"
  | "prompt-ready"
  | "generating"
  | "review-ready"
  | "assets-ready"
  | "copy-ready"
  | "ready-to-publish"
  | "published"
  | "failed"
  | string;

export type PublicationJob = {
  publicationJobId: string;
  avatar: string;
  scene: string;
  format: PublicationFormat | string;
  objective: string;
  businessProfile: string;
  assetType: string;
  status: PublicationJobStatus;
  brief?: PublicationBrief | null;
  promptPack?: PublicationPromptPack | null;
  publishingPack?: PublicationCopyPack | null;
  publishingExport?: PublicationPublishingExport | null;
  publishedRecord?: PublicationPublishedRecord | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicationGenerationSubmission = {
  generationJobId: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  platform?: string;
  status?: string;
  runMode?: string;
  startedAt?: string;
  promptPack?: PublicationPromptPack;
  instructions?: string[];
  [key: string]: unknown;
};

export type PublicationGenerationRefreshResult = {
  ok?: boolean;
  autoIngested?: boolean;
  error?: string | null;
  job?: PublicationJob | null;
  generation?: PublicationGenerationSubmission | null;
  provider?: Record<string, unknown> | null;
  ingest?: IngestComfyOutputResult | Record<string, unknown> | null;
  message?: string;
  reason?: string;
};

export type CreatePublicationJobPayload = {
  avatar: string;
  scene: string;
  format: PublicationFormat;
  objective: string;
};

export type CreatePublicationJobResponse = {
  ok?: boolean;
  job?: PublicationJob;
  message?: string;
  error?: string;
  reason?: string;
};

export type PublicationBrief = {
  visualIntent: string;
  captionAngle: string;
  emotionalTone: string;
  avoidRules: string[];
  suggestedFormat: PublicationFormat | string;
  contentPillars?: string[];
  sceneNotes?: string;
  captionSeeds?: string[];
  generationNotes?: string;
  [key: string]: unknown;
};

export type GeneratePublicationBriefPayload = {
  publicationJobId: string;
  brief?: PublicationBrief;
  briefFeedback?: {
    notes: string;
    currentBrief?: PublicationBrief;
    createdAt?: string;
  };
};

export type GeneratePublicationBriefResponse = {
  ok?: boolean;
  job?: PublicationJob;
  brief?: PublicationBrief;
  message?: string;
  error?: string;
  reason?: string;
};

export type PublicationReferenceImage = {
  assetId?: string;
  status?: string;
  isCanonical?: boolean;
  minioBucket?: string;
  minioObjectPath?: string;
  objectPath?: string;
  url?: string;
  publicUrl?: string;
  comfyInputName?: string | null;
  comfyLoadable?: boolean;
  source?: string;
};

export type PublicationQualityReview = {
  contractVersion: "publication-quality-review-v1";
  decision: "select-for-publication" | "reject-for-publication" | "reject-as-canonical";
  criteria: Record<string, boolean>;
  reasons: string[];
  notes: string;
  reviewedAt: string;
};

export type PublicationQaResult = {
  contractVersion?: string;
  provider?: string;
  status?: "pass" | "review_required" | "blocked" | string;
  scores?: Record<string, number>;
  flags?: string[];
  notes?: string[];
  defectSeverity?: "none" | "review" | "blocked" | string;
  defectReasons?: string[];
  correctionRecommended?: boolean;
  correctionMode?: string | null;
  reviewedAt?: string;
  [key: string]: unknown;
};

export type PublicationQaRemediation = {
  policyVersion?: string;
  status?: string;
  reason?: string;
  sourceGenerationJobId?: string | null;
  sourceOutputUrl?: string | null;
  maxAttempts?: number;
  attemptsUsed?: number;
  nextAction?: string;
  promptDelta?: {
    avoid?: string[];
    instruction?: string;
    [key: string]: unknown;
  };
  attempts?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
  exhaustedAt?: string;
  passedAt?: string;
  [key: string]: unknown;
};

export type PublicationPromptPack = {
  positivePrompt: string;
  negativePrompt: string;
  identityReminders: string[];
  sceneDetails: string;
  visualAvoidRules: string[];
  referenceImages: PublicationReferenceImage[];
  suggestedFormat: PublicationFormat | string;
  comfyHints?: {
    aspectRatio?: string;
    outputIntent?: string;
    assetType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type GeneratePublicationPromptPackPayload = {
  publicationJobId: string;
  promptPack?: PublicationPromptPack;
};

export type GeneratePublicationPromptPackResponse = {
  ok?: boolean;
  job?: PublicationJob;
  promptPack?: PublicationPromptPack;
  message?: string;
  error?: string;
  reason?: string;
};

export type PublicationCopyPack = {
  primaryCaption: string;
  captionAlternatives: string[];
  hashtags: string[];
  storyText?: string[];
  ctaOptions?: string[];
  publishingNotes: string;
  platform?: string;
  tone?: string;
  language?: string;
  selectedAssetId?: string;
  selectedAssetObjectPath?: string | null;
  [key: string]: unknown;
};

export type PublicationPublishingExport = {
  publicationJobId: string;
  platform: string;
  status: string;
  imageUrl?: string | null;
  assetId?: string | null;
  bucket?: string | null;
  objectPath?: string | null;
  finalCaption: string;
  hashtags: string[];
  storyText?: string[];
  ctaOptions?: string[];
  publishingNotes?: string;
  metadata?: Record<string, unknown>;
  manualInstructions?: string[];
  exportedAt?: string;
  [key: string]: unknown;
};

export type PublicationPublishedRecord = {
  publicationJobId: string;
  platform: string;
  account?: string | null;
  publishedUrl: string;
  publishedAt: string;
  notes?: string | null;
  status: "published" | string;
  recordedAt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type PublicationTimelineEvent = {
  eventType: string;
  label: string;
  status: "completed" | "pending" | "failed" | string;
  createdAt?: string | null;
  payload?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

export type PublicationNextAction = {
  action: string;
  label: string;
  description: string;
};

export type PublicationJobTimeline = {
  publicationJobId: string;
  status: PublicationJobStatus;
  errorMessage?: string | null;
  nextAction: PublicationNextAction;
  events: PublicationTimelineEvent[];
};

export type PublicationJobSummary = {
  publicationJobId: string;
  avatar: string;
  scene: string;
  format: PublicationFormat | string;
  objective: string;
  businessProfile: string;
  status: PublicationJobStatus;
  createdAt: string;
  updatedAt: string;
  nextAction: PublicationNextAction;
  errorMessage?: string | null;
  generationJobId?: string | null;
  latestAssetId?: string | null;
  latestAssetBucket?: string | null;
  latestAssetObjectPath?: string | null;
  latestAssetStatus?: string | null;
  latestAssetUrl?: string | null;
  latestAssetQa?: PublicationQaResult | null;
  latestAssetDefective?: boolean | null;
  latestAssetDefectReasons?: string[] | null;
  selectedAssetId?: string | null;
  selectedAssetBucket?: string | null;
  selectedAssetObjectPath?: string | null;
  selectedAssetStatus?: string | null;
  selectedAssetUrl?: string | null;
  thumbnailUrl?: string | null;
  publishedUrl?: string | null;
};

export type PublicationJobSummaryGroup = {
  status: PublicationJobStatus;
  count: number;
  jobs: PublicationJobSummary[];
};

export type PublicationJobsSummary = {
  groups: PublicationJobSummaryGroup[];
  jobs: PublicationJobSummary[];
  counts: Record<string, number>;
};

export type LoadPublicationJobsSummaryPayload = {
  avatar?: string;
  scene?: string;
  includePublished?: boolean;
  limit?: number;
};

export type LoadPublicationJobsSummaryResponse = {
  ok?: boolean;
  summary?: PublicationJobsSummary;
  message?: string;
  error?: string;
  reason?: string;
};

export type LoadPublicationTimelinePayload = {
  publicationJobId: string;
};

export type LoadPublicationTimelineResponse = {
  ok?: boolean;
  timeline?: PublicationJobTimeline;
  message?: string;
  error?: string;
  reason?: string;
};

export type PublicationRetryStep =
  | "generate-brief"
  | "generate-prompt-pack"
  | "generate-images"
  | "generate-copy-pack"
  | "ingest-output"
  | "select-asset"
  | "export-pack"
  | "mark-published"
  | string;

export type RecordPublicationJobErrorPayload = {
  publicationJobId: string;
  failedStep: PublicationRetryStep;
  errorMessage: string;
  technicalDetails?: Record<string, unknown>;
};

export type RecordPublicationJobErrorResponse = {
  ok?: boolean;
  recorded?: boolean;
  job?: PublicationJob;
  error?: string;
  reason?: string;
  message?: string;
};

export type RetryPublicationJobPayload = {
  publicationJobId: string;
  retryStep?: PublicationRetryStep;
};

export type RetryPublicationJobResponse = {
  ok?: boolean;
  retry?: boolean;
  retryStep?: PublicationRetryStep;
  job?: PublicationJob;
  error?: string;
  reason?: string;
  message?: string;
};

export type GeneratePublicationCopyPackPayload = {
  publicationJobId: string;
  copyPack?: PublicationCopyPack;
};

export type GeneratePublicationCopyPackResponse = {
  ok?: boolean;
  job?: PublicationJob;
  copyPack?: PublicationCopyPack;
  publishingPack?: PublicationCopyPack;
  message?: string;
  error?: string;
  reason?: string;
};

export type ExportPublicationPackPayload = {
  publicationJobId: string;
  finalCaption?: string;
  hashtags?: string[];
  platform?: string;
  publishingNotes?: string;
};

export type ExportPublicationPackResponse = {
  ok?: boolean;
  exported?: boolean;
  job?: PublicationJob;
  publishingExport?: PublicationPublishingExport;
  exportPack?: PublicationPublishingExport;
  message?: string;
  error?: string;
  reason?: string;
};

export type MarkPublicationPublishedPayload = {
  publicationJobId: string;
  platform: string;
  publishedUrl: string;
  account?: string;
  publishedAt?: string;
  notes?: string;
};

export type MarkPublicationPublishedResponse = {
  ok?: boolean;
  published?: boolean;
  job?: PublicationJob;
  publishedRecord?: PublicationPublishedRecord;
  publication?: PublicationPublishedRecord;
  message?: string;
  error?: string;
  reason?: string;
};

export type GeneratePublicationImagesPayload = {
  publicationJobId: string;
  mode?: string;
  remediation?: PublicationQaRemediation;
};

export type GeneratePublicationImagesResponse = {
  ok?: boolean;
  submitted?: boolean;
  job?: PublicationJob;
  generation?: PublicationGenerationSubmission;
  message?: string;
  error?: string;
  reason?: string;
};

export type PreparePublicationReferencesPayload = {
  publicationJobId: string;
};

export type PreparePublicationReferencesResponse = {
  ok?: boolean;
  preparedCount?: number;
  failedCount?: number;
  prepared?: PublicationReferenceImage[];
  failed?: Record<string, unknown>[];
  job?: PublicationJob | null;
  message?: string;
  error?: string | null;
  reason?: string;
};

export type RefreshPublicationGenerationPayload = {
  publicationJobId: string;
  generationJobId?: string;
};

export type RefreshPublicationGenerationResponse = PublicationGenerationRefreshResult;

export type IngestComfyOutputPayload = {
  publicationJobId: string;
  generationJobId: string;
  outputUrl: string;
};

export type IngestComfyOutputResult = {
  assetId: string;
  generatedAssetId?: string | null;
  generationJobId?: string | null;
  publicationJobId?: string | null;
  publicationStatus?: string | null;
  generationStatus?: string | null;
  objectPath?: string | null;
  bucket?: string | null;
};

export type PublicationAssetSummary = {
  assetId?: string | null;
  objectPath?: string | null;
  bucket?: string | null;
  status?: string | null;
  createdAt?: string | null;
  reviewNotes?: string | null;
  qa?: PublicationQaResult | null;
  defective?: boolean | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type IngestComfyOutputResponse = {
  ok?: boolean;
  ingested?: boolean;
  assetId?: string;
  generatedAssetId?: string | null;
  generationJobId?: string | null;
  publicationJobId?: string | null;
  publicationStatus?: string | null;
  generationStatus?: string | null;
  objectPath?: string | null;
  bucket?: string | null;
  message?: string;
  error?: string;
  reason?: string;
};

export type PublicationJobLoadItem = {
  job: PublicationJob;
  generation?: PublicationGenerationSubmission | null;
  generationAttempts?: PublicationGenerationSubmission[];
  latestAsset?: PublicationAssetSummary | null;
  selectedAsset?: PublicationAssetSummary | null;
};

export type ListPublicationJobsPayload = {
  publicationJobId?: string;
  avatar?: string;
  scene?: string;
  limit?: number;
};

export type ListPublicationJobsResponse = {
  ok?: boolean;
  jobs?: PublicationJobLoadItem[];
  count?: number;
  message?: string;
  error?: string;
  reason?: string;
};

export type SelectPublicationAssetPayload = {
  publicationJobId: string;
  assetId: string;
  reviewNotes?: string;
};

export type SelectPublicationAssetResult = {
  selected: boolean;
  assetId: string;
  generatedAssetId?: string | null;
  publicationJobId: string;
  publicationStatus: string;
  asset?: PublicationAssetSummary | null;
  job?: PublicationJob | null;
};

export type SelectPublicationAssetResponse = {
  ok?: boolean;
  selected?: boolean;
  assetId?: string;
  generatedAssetId?: string | null;
  publicationJobId?: string;
  publicationStatus?: string;
  asset?: PublicationAssetSummary | null;
  job?: PublicationJob | null;
  message?: string;
  error?: string;
  reason?: string;
};
