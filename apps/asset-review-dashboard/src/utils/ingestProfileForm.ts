import type { IngestProfile, IngestProfileDraft } from "../types/ingestProfiles";
import { NEW_PROFILE_DEFAULTS } from "../types/ingestProfiles";
import type { CatalogOptionsBundle } from "../types/catalogs";
import {
  findAvatarShort,
  optionLabel,
  scenesForAvatar,
  staticFallbackOptions,
} from "./catalogNormalize";

export function readProfileId(
  profile: Partial<IngestProfile> & Record<string, unknown>,
): string | undefined {
  const id = profile.profileId ?? profile.profile_id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return undefined;
}

export function generateProfileName(
  catalogOptions: CatalogOptionsBundle,
  fields: Pick<IngestProfileDraft, "avatar" | "avatarShort" | "scene" | "assetType">,
): string {
  const avatarLabel =
    optionLabel(catalogOptions.avatars, fields.avatar) ||
    fields.avatarShort.trim() ||
    fields.avatar;
  const sceneLabel =
    optionLabel(scenesForAvatar(catalogOptions.scenes, fields.avatar), fields.scene) ||
    fields.scene;
  const assetTypeLabel =
    optionLabel(catalogOptions.assetTypes, fields.assetType) || fields.assetType;
  return `${avatarLabel} / ${sceneLabel} / ${assetTypeLabel}`;
}

export function withGeneratedProfileName(
  catalogOptions: CatalogOptionsBundle,
  draft: IngestProfileDraft,
): IngestProfileDraft {
  return {
    ...draft,
    profileName: generateProfileName(catalogOptions, draft),
  };
}

export function newProfileDraft(catalogOptions?: CatalogOptionsBundle): IngestProfileDraft {
  const options = catalogOptions ?? staticFallbackOptions();
  const avatar = options.avatars[0]?.value ?? NEW_PROFILE_DEFAULTS.avatar;
  const avatarScenes = scenesForAvatar(options.scenes, avatar);
  const scene = avatarScenes[0]?.value ?? NEW_PROFILE_DEFAULTS.scene;
  const assetType = options.assetTypes[0]?.value ?? NEW_PROFILE_DEFAULTS.assetType;
  const workflow = options.workflows[0]?.value ?? NEW_PROFILE_DEFAULTS.workflow;
  const model = options.models[0]?.value ?? NEW_PROFILE_DEFAULTS.model;

  const base: IngestProfileDraft = {
    ...NEW_PROFILE_DEFAULTS,
    avatar,
    avatarShort: findAvatarShort(options, avatar) || NEW_PROFILE_DEFAULTS.avatarShort,
    scene,
    assetType,
    workflow,
    model,
  };
  return withGeneratedProfileName(options, base);
}

export function profileToDraft(profile: Partial<IngestProfile> | null | undefined): IngestProfileDraft {
  if (!profile) {
    return newProfileDraft();
  }

  return withGeneratedProfileName(staticFallbackOptions(), {
    profileName: profile.profileName ?? "",
    avatar: profile.avatar ?? NEW_PROFILE_DEFAULTS.avatar,
    avatarShort: profile.avatarShort ?? NEW_PROFILE_DEFAULTS.avatarShort,
    scene: profile.scene ?? NEW_PROFILE_DEFAULTS.scene,
    assetType: profile.assetType ?? NEW_PROFILE_DEFAULTS.assetType,
    workflow: profile.workflow ?? NEW_PROFILE_DEFAULTS.workflow,
    model: profile.model ?? NEW_PROFILE_DEFAULTS.model,
    seed: String(profile.seed ?? NEW_PROFILE_DEFAULTS.seed),
    version: String(profile.version ?? NEW_PROFILE_DEFAULTS.version),
    autoPromoteLatest: profile.autoPromoteLatest ?? false,
    setActive: profile.setActive ?? profile.isActive ?? false,
    isEnabled: profile.isEnabled ?? true,
  });
}

export function profileToDraftWithCatalog(
  profile: Partial<IngestProfile> | null | undefined,
  catalogOptions: CatalogOptionsBundle,
): IngestProfileDraft {
  if (!profile) return newProfileDraft(catalogOptions);
  const draft: IngestProfileDraft = {
    profileName: profile.profileName ?? "",
    avatar: profile.avatar ?? NEW_PROFILE_DEFAULTS.avatar,
    avatarShort: profile.avatarShort ?? NEW_PROFILE_DEFAULTS.avatarShort,
    scene: profile.scene ?? NEW_PROFILE_DEFAULTS.scene,
    assetType: profile.assetType ?? NEW_PROFILE_DEFAULTS.assetType,
    workflow: profile.workflow ?? NEW_PROFILE_DEFAULTS.workflow,
    model: profile.model ?? NEW_PROFILE_DEFAULTS.model,
    seed: String(profile.seed ?? NEW_PROFILE_DEFAULTS.seed),
    version: String(profile.version ?? NEW_PROFILE_DEFAULTS.version),
    autoPromoteLatest: profile.autoPromoteLatest ?? false,
    setActive: profile.setActive ?? profile.isActive ?? false,
    isEnabled: profile.isEnabled ?? true,
  };
  return withGeneratedProfileName(catalogOptions, draft);
}

export function draftToProfile(draft: IngestProfileDraft): IngestProfile {
  const seed = Number.parseInt(draft.seed, 10);
  const version = Number.parseInt(draft.version, 10);

  return {
    profileName: draft.profileName.trim(),
    avatar: draft.avatar.trim(),
    avatarShort: draft.avatarShort.trim(),
    scene: draft.scene.trim(),
    assetType: draft.assetType.trim(),
    workflow: draft.workflow.trim(),
    model: draft.model.trim(),
    seed: Number.isFinite(seed) ? seed : 847362,
    version: Number.isFinite(version) && version > 0 ? version : 1,
    autoPromoteLatest: draft.autoPromoteLatest,
    setActive: draft.setActive,
    isEnabled: draft.isEnabled,
  };
}

export function normalizeProfiles(profiles: IngestProfile[] | undefined): IngestProfile[] {
  if (!Array.isArray(profiles)) return [];

  return profiles.map((profile, index) => {
    const raw = profile as Partial<IngestProfile> & Record<string, unknown>;
    return {
    profileId: readProfileId(raw),
    profileName: profile.profileName?.trim() || `unnamed-profile-${index + 1}`,
    avatar: profile.avatar ?? "",
    avatarShort: profile.avatarShort ?? "",
    scene: profile.scene ?? "",
    assetType: profile.assetType ?? "",
    workflow: profile.workflow ?? "",
    model: profile.model ?? "",
    seed: typeof profile.seed === "number" ? profile.seed : 847362,
    version: typeof profile.version === "number" ? profile.version : 1,
    autoPromoteLatest: profile.autoPromoteLatest ?? false,
    setActive: profile.setActive ?? false,
    isEnabled: profile.isEnabled ?? true,
    updatedAt: profile.updatedAt,
    isActive: profile.isActive ?? false,
  };
  });
}

/** Source of truth for active row UI — compares profileId only (ignores stale list isActive). */
export function isRowActive(
  profile: IngestProfile,
  activeProfile: IngestProfile | null,
): boolean {
  const activeId = activeProfile?.profileId;
  const rowId = profile.profileId;
  if (!activeId || !rowId) return false;
  return activeId === rowId;
}

export function syncProfilesWithActive(
  profiles: IngestProfile[],
  activeProfile: IngestProfile | null,
): IngestProfile[] {
  const activeId = activeProfile?.profileId;
  return profiles.map((p) => ({
    ...p,
    isActive: Boolean(activeId && p.profileId && p.profileId === activeId),
  }));
}
