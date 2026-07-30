export type CharacterOnboardingStatus =
  | "draft"
  | "references-needed"
  | "identity-review"
  | "ready-for-tests"
  | "ready";

export type CharacterAvatarType = "influencer" | "gfe-bfe" | "authority";

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
    readyForPublication: boolean;
  };
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
