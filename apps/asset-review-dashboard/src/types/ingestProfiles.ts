export type IngestProfile = {
  profileId?: string;
  profileName: string;
  avatar: string;
  avatarShort: string;
  scene: string;
  assetType: string;
  workflow: string;
  model: string;
  seed: number;
  version: number;
  autoPromoteLatest: boolean;
  setActive?: boolean;
  isEnabled?: boolean;
  updatedAt?: string;
  isActive?: boolean;
};

export type IngestProfileDraft = {
  profileName: string;
  avatar: string;
  avatarShort: string;
  scene: string;
  assetType: string;
  workflow: string;
  model: string;
  seed: string;
  version: string;
  autoPromoteLatest: boolean;
  setActive: boolean;
  isEnabled: boolean;
};

export type ActiveIngestProfileResponse = {
  ok?: boolean;
  found?: boolean;
  profile?: IngestProfile | null;
  error?: string;
  message?: string;
  reason?: string;
};

export type ListIngestProfilesResponse = {
  ok?: boolean;
  profiles?: IngestProfile[];
  count?: number;
  message?: string;
  reason?: string;
};

export type UpsertIngestProfileResponse = {
  ok?: boolean;
  profile?: IngestProfile;
  message?: string;
  reason?: string;
  errors?: string[];
  validationErrors?: string[] | Record<string, string>;
};

export type SetActiveIngestProfileResponse = {
  ok?: boolean;
  profileId?: string;
  profileName?: string;
  profile?: IngestProfile;
  message?: string;
  reason?: string;
  error?: string;
};

export type DeleteIngestProfileResponse = {
  ok?: boolean;
  deleted?: boolean;
  profileId?: string;
  profileName?: string;
  assetCount?: number;
  message?: string;
  reason?: string;
  error?: string;
};

export const PROFILE_DELETE_BLOCKED_MESSAGE =
  "This profile cannot be deleted because assets already exist for it.";

export const NEW_PROFILE_DEFAULTS: IngestProfileDraft = {
  profileName: "Estefanía / New Scene / Raw Image",
  avatar: "estefania-montealegre",
  avatarShort: "estefania",
  scene: "coffee-rain",
  assetType: "raw-image",
  workflow: "flux-krea-dev",
  model: "flux-krea-dev",
  seed: "847362",
  version: "1",
  autoPromoteLatest: false,
  setActive: false,
  isEnabled: true,
};
