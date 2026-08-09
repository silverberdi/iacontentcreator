export type CharacterOnboardingStatus =
  | "draft"
  | "references-needed"
  | "identity-review"
  | "ready-for-tests"
  | "ready";

export type CharacterAvatarType = "influencer" | "gfe-bfe" | "authority";

export type CharacterCanonStatus =
  | "draft"
  | "proposed"
  | "proposed-import"
  | "operator-reviewed"
  | "approved"
  | "superseded";

export type CharacterCanonSectionStatus = "missing" | "draft" | "review-needed" | "approved";

export type AiProviderTrace = {
  task: string;
  provider: string;
  model: string;
  promptProfile?: string;
  timestamp?: string;
  fallbackUsed?: boolean;
  status?: string;
  latencyMs?: number | null;
  errorSummary?: string | null;
};

export type CharacterCanonSection = {
  key: string;
  label: string;
  status: CharacterCanonSectionStatus;
  summary: string;
  data: Record<string, unknown>;
  sourceRefs?: string[];
  providerTrace?: AiProviderTrace | null;
};

export type CharacterCanonRecord = {
  id?: string;
  avatar: string;
  canonVersion: number;
  schemaVersion: string;
  status: CharacterCanonStatus;
  canonJson: {
    avatar: string;
    avatarType: CharacterAvatarType;
    displayName: string;
    sections: CharacterCanonSection[];
    extensions?: Record<string, unknown>;
    providerTrace?: AiProviderTrace | null;
    source?: {
      kind: "conversation" | "markdown-import" | "manual";
      importedFrom?: string[];
      importedAt?: string;
    };
  };
  canonMarkdown: string;
  conversationSummary?: string;
  importSummary?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ReferencePolicy = {
  identityCanon: boolean;
  sceneCanon: boolean;
  supportingReference: boolean;
  rejectedReference: boolean;
};

export type CharacterReferenceClassification =
  | "identity-candidate"
  | "identity-canon"
  | "scene-candidate"
  | "scene-canon"
  | "supporting-reference"
  | "rejected-reference";

export type CharacterReferenceRecord = {
  assetId: string;
  avatar: string;
  scene: string;
  classification: CharacterReferenceClassification;
  status: string;
  isCanonical: boolean;
  bucket: string;
  objectPath: string;
  url: string;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CharacterSceneDraft = {
  scene: string;
  displayName: string;
  description?: string;
};

export type CharacterOnboardingRecord = {
  avatar: string;
  avatarType: CharacterAvatarType;
  avatarShort: string;
  displayName: string;
  businessProfile: string;
  primaryObjective: string;
  contentPillars: string[];
  captionTone: string[];
  brandFit: string[];
  publishingLimits: string[];
  reviewTriggers: string[];
  referencePolicy: ReferencePolicy;
  scenes: CharacterSceneDraft[];
  status: CharacterOnboardingStatus;
  readiness: {
    profileComplete: boolean;
    hasScenes: boolean;
    hasReferencePlan: boolean;
    hasApprovedCanon?: boolean;
    readyForPublication: boolean;
  };
  approvedCanon?: CharacterCanonRecord | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CharacterOnboardingListResponse = {
  ok?: boolean;
  characters?: CharacterOnboardingRecord[];
  message?: string;
  reason?: string;
};

export type CharacterOnboardingSavePayload = Omit<
  CharacterOnboardingRecord,
  "readiness" | "createdAt" | "updatedAt"
>;

export type CharacterOnboardingSaveResponse = {
  ok?: boolean;
  character?: CharacterOnboardingRecord;
  message?: string;
  reason?: string;
};

export type CharacterCanonListPayload = {
  avatar: string;
};

export type CharacterCanonListResponse = {
  ok?: boolean;
  canons?: CharacterCanonRecord[];
  approvedCanon?: CharacterCanonRecord | null;
  message?: string;
  reason?: string;
};

export type CharacterCanonSavePayload = {
  avatar: string;
  avatarType: CharacterAvatarType;
  displayName: string;
  status: CharacterCanonStatus;
  schemaVersion?: string;
  canonJson: CharacterCanonRecord["canonJson"];
  canonMarkdown: string;
  conversationSummary?: string;
  importSummary?: string;
};

export type CharacterCanonSaveResponse = {
  ok?: boolean;
  canon?: CharacterCanonRecord;
  message?: string;
  reason?: string;
};

export type CharacterCanonChatPayload = {
  avatar: string;
  avatarType: CharacterAvatarType;
  displayName: string;
  currentCanon?: CharacterCanonRecord["canonJson"] | null;
  conversation?: Array<{ role: "operator" | "assistant"; content: string }>;
  operatorMessage: string;
};

export type CharacterCanonChatResponse = {
  ok?: boolean;
  assistantMessage?: string;
  suggestedQuestions?: string[];
  extractedSignals?: Record<string, unknown>;
  sectionUpdates?: CharacterCanonSection[];
  providerTrace?: AiProviderTrace;
  error?: string;
  message?: string;
  reason?: string;
};

export type CharacterReferencesListPayload = {
  avatar: string;
};

export type CharacterReferencesListResponse = {
  ok?: boolean;
  references?: CharacterReferenceRecord[];
  summary?: {
    identityCanonCount: number;
    sceneCanonCount: number;
    candidateCount: number;
    rejectedCount: number;
  };
  message?: string;
  reason?: string;
};

export type CharacterReferenceRegisterPayload = {
  avatar: string;
  scene?: string;
  classification: CharacterReferenceClassification;
  objectPathOrUrl: string;
  bucket?: string;
  reviewNotes?: string;
};

export type CharacterReferenceRegisterResponse = {
  ok?: boolean;
  reference?: CharacterReferenceRecord;
  message?: string;
  reason?: string;
};

export type CharacterReferenceUploadResponse = {
  ok?: boolean;
  upload?: {
    bucket: string;
    objectPath: string;
    publicUrl: string;
    sha256: string;
    byteLength: number;
    mimeType: string;
    sourceFilename?: string;
    classification?: string;
    scene?: string;
  };
  error?: string;
  message?: string;
  reason?: string;
};

export type CharacterCanonPortraitJob = {
  jobId?: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  platform?: string;
  status?: string;
  runMode?: string;
  startedAt?: string;
  createdAt?: string;
};

export type CharacterCanonPortraitPromptPack = {
  positivePrompt: string;
  negativePrompt: string;
  referenceImages?: string[];
  [key: string]: unknown;
};

export type CharacterCanonPortraitQueuePayload = {
  avatar: string;
  displayName: string;
  avatarType: CharacterAvatarType;
  businessProfile: string;
  primaryObjective: string;
  contentPillars: string[];
  captionTone: string[];
  brandFit: string[];
  publishingLimits: string[];
  reviewTriggers: string[];
  approvedCanon?: CharacterCanonRecord | null;
  notes?: string;
};

export type CharacterCanonPortraitQueueResponse = {
  ok?: boolean;
  queued?: boolean;
  job?: CharacterCanonPortraitJob;
  promptPack?: CharacterCanonPortraitPromptPack;
  message?: string;
  reason?: string;
  error?: string;
};

export type CharacterCanonPortraitRunResponse = {
  ok?: boolean;
  running?: boolean;
  manual?: boolean;
  job?: CharacterCanonPortraitJob;
  promptPack?: CharacterCanonPortraitPromptPack;
  instructions?: string[];
  message?: string;
  reason?: string;
  error?: string;
};

export type CharacterCanonPortraitIngestPayload = {
  jobId: string;
  outputUrl: string;
};

export type CharacterCanonPortraitIngestResponse = {
  ok?: boolean;
  reference?: CharacterReferenceRecord;
  generationJob?: CharacterCanonPortraitJob;
  message?: string;
  reason?: string;
  error?: string;
};
