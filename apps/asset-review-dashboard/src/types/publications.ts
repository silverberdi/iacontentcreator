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
  objectPath?: string;
  url?: string;
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

export type GeneratePublicationImagesPayload = {
  publicationJobId: string;
  mode?: string;
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
