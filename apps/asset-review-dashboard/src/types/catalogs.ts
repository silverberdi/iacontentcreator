export type CatalogKind = "avatars" | "scenes" | "assetTypes" | "workflows" | "models";

export type CatalogSelectOption = {
  value: string;
  label: string;
  /** Scene catalog: owning avatar slug */
  avatar?: string;
  avatarShort?: string;
  provider?: string;
};

export type CatalogOptionsBundle = {
  avatars: CatalogSelectOption[];
  scenes: CatalogSelectOption[];
  assetTypes: CatalogSelectOption[];
  workflows: CatalogSelectOption[];
  models: CatalogSelectOption[];
};

export type CatalogBaseItem = {
  displayName?: string;
  description?: string;
  isEnabled?: boolean;
  updatedAt?: string;
  disabledAt?: string;
  disabledReason?: string;
};

export type AvatarCatalogItem = CatalogBaseItem & {
  avatar: string;
  avatarShort?: string;
  avatarKind?: string;
};

export type SceneCatalogItem = CatalogBaseItem & {
  scene: string;
  avatar?: string;
};

export type AssetTypeCatalogItem = CatalogBaseItem & {
  assetType: string;
};

export type WorkflowCatalogItem = CatalogBaseItem & {
  workflow: string;
};

export type ModelCatalogItem = CatalogBaseItem & {
  model: string;
  provider?: string;
};

export type CatalogListBundle = {
  avatars: AvatarCatalogItem[];
  scenes: SceneCatalogItem[];
  assetTypes: AssetTypeCatalogItem[];
  workflows: WorkflowCatalogItem[];
  models: ModelCatalogItem[];
};

export type CatalogOptionsResponse = {
  ok?: boolean;
  avatars?: AvatarCatalogItem[];
  scenes?: SceneCatalogItem[];
  assetTypes?: AssetTypeCatalogItem[];
  workflows?: WorkflowCatalogItem[];
  models?: ModelCatalogItem[];
  message?: string;
  reason?: string;
};

export type CatalogListResponse = CatalogOptionsResponse;

export type CatalogInitResponse = {
  ok?: boolean;
  message?: string;
  reason?: string;
};

export type CatalogUpsertPayload =
  | {
      catalog: "avatars";
      avatar: string;
      avatarShort?: string;
      avatarKind?: string;
      displayName?: string;
      description?: string;
    }
  | {
      catalog: "scenes";
      /** Wire field expected by catalog upsert workflow */
      catalogType: "scenes";
      avatar: string;
      scene: string;
      displayName: string;
      description?: string;
      isEnabled: boolean;
    }
  | {
      catalog: "assetTypes";
      assetType: string;
      displayName?: string;
      description?: string;
    }
  | {
      catalog: "workflows";
      workflow: string;
      displayName?: string;
      description?: string;
    }
  | {
      catalog: "models";
      model: string;
      provider?: string;
      displayName?: string;
      description?: string;
    };

export type CatalogUpsertResponse = {
  ok?: boolean;
  catalog?: CatalogKind;
  item?: Record<string, unknown>;
  message?: string;
  reason?: string;
};

export type CatalogSetStatusPayload = {
  catalog: CatalogKind;
  isEnabled: boolean;
  disabledReason?: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  workflow?: string;
  model?: string;
};

export type CatalogSetStatusResponse = {
  ok?: boolean;
  message?: string;
  reason?: string;
};

/** Default avatar for legacy scene_catalog rows missing avatar. */
export const DEFAULT_SCENE_AVATAR = "estefania-montealegre";

export const CATALOG_KINDS: { id: CatalogKind; label: string; description: string }[] = [
  { id: "avatars", label: "Avatars", description: "Characters / avatars available for ingest and review." },
  { id: "scenes", label: "Scenes", description: "Scene slugs tied to avatar content sets." },
  {
    id: "assetTypes",
    label: "Asset types",
    description: "Asset categories such as raw-image, reference-image, post-image, story-image, or training-image.",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Generation templates/pipelines (Comfy/n8n flows), e.g. flux-krea-dev.",
  },
  {
    id: "models",
    label: "Models",
    description: "Base checkpoints/models used by workflows, e.g. flux1-dev.",
  },
];

export const DEFAULT_DISABLE_REASON = "Disabled from dashboard";
