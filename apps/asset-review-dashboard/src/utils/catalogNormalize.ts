import {
  assetTypes as staticAssetTypes,
  avatars as staticAvatars,
  scenes as staticScenes,
} from "../data/catalogs";
import type {
  AssetTypeCatalogItem,
  AvatarCatalogItem,
  CatalogKind,
  CatalogListBundle,
  CatalogOptionsBundle,
  CatalogOptionsResponse,
  CatalogSelectOption,
  ModelCatalogItem,
  SceneCatalogItem,
  WorkflowCatalogItem,
} from "../types/catalogs";

const EMPTY_OPTIONS: CatalogOptionsBundle = {
  avatars: [],
  scenes: [],
  assetTypes: [],
  workflows: [],
  models: [],
};

function slugFromItem(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function labelFromItem(item: Record<string, unknown>, slug: string): string {
  const displayName = item.displayName;
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }
  return slug;
}

function normalizeAvatarOptions(items: AvatarCatalogItem[] | undefined): CatalogSelectOption[] {
  if (!Array.isArray(items)) return [];

  const options: CatalogSelectOption[] = [];
  for (const item of items) {
    const slug = slugFromItem(item as Record<string, unknown>, ["avatar", "value", "slug", "id"]);
    if (!slug) continue;
    options.push({
      value: slug,
      label: labelFromItem(item as Record<string, unknown>, slug),
      avatarShort:
        typeof item.avatarShort === "string" && item.avatarShort.trim()
          ? item.avatarShort.trim()
          : undefined,
    });
  }
  return options;
}

/** Read avatar slug from API/DB record (snake_case and camelCase). */
export function readSceneAvatarFromRecord(
  item: SceneCatalogItem | Record<string, unknown>,
): string | null {
  const raw = item as Record<string, unknown>;
  const keys = ["avatar", "avatar_slug", "avatarSlug", "owner_avatar", "ownerAvatar"];
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readOptionalString(item: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readEnabledFlag(item: Record<string, unknown>): boolean | undefined {
  if (typeof item.isEnabled === "boolean") return item.isEnabled;
  if (typeof item.is_enabled === "boolean") return item.is_enabled;
  if (item.is_active === true || item.is_active === false) return item.is_active;
  if (item.isActive === true || item.isActive === false) return item.isActive;
  return undefined;
}

/** Normalize one scene row from /admin/catalogs/list or /options. */
export function normalizeSceneListItem(raw: unknown): SceneCatalogItem {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scene = slugFromItem(item, ["scene", "value", "slug", "id"]);
  const avatar = readSceneAvatarFromRecord(item);

  return {
    scene,
    avatar: avatar ?? undefined,
    displayName: readOptionalString(item, ["displayName", "display_name"]),
    description: readOptionalString(item, ["description"]),
    isEnabled: readEnabledFlag(item),
    updatedAt: readOptionalString(item, ["updatedAt", "updated_at"]),
    disabledAt: readOptionalString(item, ["disabledAt", "disabled_at"]),
    disabledReason: readOptionalString(item, ["disabledReason", "disabled_reason"]),
  };
}

export function sceneRowKey(item: SceneCatalogItem): string {
  return item.scene;
}

function normalizeSceneOptions(
  items: Array<Record<string, unknown>> | undefined,
): CatalogSelectOption[] {
  if (!Array.isArray(items)) return [];

  const options: CatalogSelectOption[] = [];
  for (const raw of items) {
    const item = normalizeSceneListItem(raw);
    if (!item.scene) continue;
    options.push({
      value: item.scene,
      label: item.displayName?.trim() || item.scene,
      avatar: item.avatar,
    });
  }
  return options;
}

/** Avatar present on API/DB record; null if missing from response. */
export function sceneAvatarPersisted(item: SceneCatalogItem): string | null {
  return readSceneAvatarFromRecord(item);
}

export function scenesForAvatar(
  scenes: CatalogSelectOption[],
  avatar: string,
): CatalogSelectOption[] {
  const scopedScenes = avatar.trim()
    ? scenes.filter((scene) => !scene.avatar || scene.avatar === avatar)
    : scenes;
  const deduped = new Map<string, CatalogSelectOption>();
  for (const scene of scopedScenes) {
    if (!deduped.has(scene.value) || scene.avatar === avatar) {
      deduped.set(scene.value, scene);
    }
  }
  return [...deduped.values()];
}

function normalizeSlugOptions(
  items: Array<Record<string, unknown>> | undefined,
  slugKeys: string[],
  extra?: (item: Record<string, unknown>) => Partial<CatalogSelectOption>,
): CatalogSelectOption[] {
  if (!Array.isArray(items)) return [];

  const options: CatalogSelectOption[] = [];
  for (const item of items) {
    const slug = slugFromItem(item, slugKeys);
    if (!slug) continue;
    options.push({
      value: slug,
      label: labelFromItem(item, slug),
      ...extra?.(item),
    });
  }
  return options;
}

export function normalizeCatalogOptions(
  response: CatalogOptionsResponse | null | undefined,
): CatalogOptionsBundle {
  if (!response || response.ok === false) {
    return staticFallbackOptions();
  }

  const avatars = normalizeAvatarOptions(response.avatars);
  const scenes = normalizeSceneOptions(
    response.scenes as Array<Record<string, unknown>> | undefined,
  );
  const assetTypes = normalizeSlugOptions(
    response.assetTypes as Array<Record<string, unknown>> | undefined,
    ["assetType", "value", "slug", "id"],
  );
  const workflows = normalizeSlugOptions(
    response.workflows as Array<Record<string, unknown>> | undefined,
    ["workflow", "value", "slug", "id"],
  );
  const models = normalizeSlugOptions(
    response.models as Array<Record<string, unknown>> | undefined,
    ["model", "value", "slug", "id"],
    (item) => ({
      provider:
        typeof item.provider === "string" && item.provider.trim()
          ? item.provider.trim()
          : undefined,
    }),
  );

  const bundle = { avatars, scenes, assetTypes, workflows, models };

  if (
    bundle.avatars.length === 0 &&
    bundle.scenes.length === 0 &&
    bundle.assetTypes.length === 0
  ) {
    return staticFallbackOptions();
  }

  return bundle;
}

export function staticFallbackOptions(): CatalogOptionsBundle {
  return {
    avatars: staticAvatars.map((a) => ({
      value: a.id,
      label: a.label,
      avatarShort: a.short,
    })),
    scenes: staticScenes.map((s) => ({
      value: s.id,
      label: s.label,
    })),
    assetTypes: staticAssetTypes.map((t) => ({ value: t.id, label: t.label })),
    workflows: [{ value: "flux-krea-dev", label: "flux-krea-dev" }],
    models: [{ value: "flux-krea-dev", label: "flux-krea-dev", provider: "comfy" }],
  };
}

export function normalizeCatalogList(
  response: CatalogOptionsResponse | null | undefined,
): CatalogListBundle {
  return {
    avatars: Array.isArray(response?.avatars) ? response.avatars : [],
    scenes: Array.isArray(response?.scenes)
      ? response.scenes.map((row) => normalizeSceneListItem(row))
      : [],
    assetTypes: Array.isArray(response?.assetTypes) ? response.assetTypes : [],
    workflows: Array.isArray(response?.workflows) ? response.workflows : [],
    models: Array.isArray(response?.models) ? response.models : [],
  };
}

export function getCatalogItemSlug(
  catalog: CatalogKind,
  item: Record<string, unknown>,
): string {
  switch (catalog) {
    case "avatars":
      return slugFromItem(item, ["avatar", "value", "slug"]);
    case "scenes":
      return slugFromItem(item, ["scene", "value", "slug"]);
    case "assetTypes":
      return slugFromItem(item, ["assetType", "value", "slug"]);
    case "workflows":
      return slugFromItem(item, ["workflow", "value", "slug"]);
    case "models":
      return slugFromItem(item, ["model", "value", "slug"]);
    default:
      return "";
  }
}

export function findAvatarShort(
  options: CatalogOptionsBundle,
  avatarValue: string,
): string {
  const match = options.avatars.find((a) => a.value === avatarValue);
  return match?.avatarShort ?? "";
}

export function optionLabel(
  options: CatalogSelectOption[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function ensureFilterValue(
  value: string,
  options: CatalogSelectOption[],
  fallback: string,
): string {
  if (!options.length) return value || fallback;
  if (options.some((o) => o.value === value)) return value;
  return options[0]?.value ?? fallback;
}

export function emptyCatalogOptions(): CatalogOptionsBundle {
  return { ...EMPTY_OPTIONS };
}

export type CatalogRow =
  | { kind: "avatars"; item: AvatarCatalogItem }
  | { kind: "scenes"; item: SceneCatalogItem }
  | { kind: "assetTypes"; item: AssetTypeCatalogItem }
  | { kind: "workflows"; item: WorkflowCatalogItem }
  | { kind: "models"; item: ModelCatalogItem };
