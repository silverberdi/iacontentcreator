export type CharacterOnboardingStatus =
  | "draft"
  | "references-needed"
  | "identity-review"
  | "ready-for-tests"
  | "ready";

export type ReferencePolicy = {
  identityCanon: boolean;
  sceneCanon: boolean;
  supportingReference: boolean;
  rejectedReference: boolean;
};

export type CharacterSceneDraft = {
  scene: string;
  displayName: string;
  description?: string;
};

export type CharacterOnboardingRecord = {
  avatar: string;
  avatarShort: string;
  displayName: string;
  businessProfile: string;
  primaryObjective: string;
  contentPillars: string[];
  captionTone: string[];
  brandFit: string[];
  publishingLimits: string[];
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
