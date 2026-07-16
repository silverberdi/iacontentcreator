export type AssetCandidate = {
  assetId: string;
  avatar: string;
  scene: string;
  assetType: string;
  url: string;
  bucket: string;
  objectPath: string;
  mimeType: string;
  status: "raw" | "selected" | "canonical" | "rejected" | string;
  isCanonical: boolean;
  sha256: string;
  canonicalGroup: string;
  reviewNotes: string | null;
  createdAt: string;
};

export type ReviewCandidatesResponse = {
  status: "ok";
  count: number;
  avatar: string;
  scene: string;
  assetType: string;
  candidates: AssetCandidate[];
};

export type CanonicalAsset = {
  found: true;
  assetId: string;
  avatar: string;
  scene: string;
  assetType: string;
  url: string;
  bucket: string;
  objectPath: string;
  mimeType: string;
  status: string;
  sha256: string;
  canonicalGroup: string;
  reviewNotes: string | null;
  createdAt: string;
};

export type GetCanonicalResponse =
  | CanonicalAsset
  | {
      found: false;
      avatar: string;
      scene: string;
      assetType: string;
      reason: string;
    };

export type PromoteCanonicalResponse = {
  promoted: boolean;
  assetId: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  url?: string;
  bucket?: string;
  objectPath?: string;
  mimeType?: string;
  status?: string;
  sha256?: string;
  canonicalGroup?: string;
  reviewNotes?: string | null;
  createdAt?: string;
  reason?: string;
};

export type SelectAssetRequest = {
  assetId: string;
  reviewNotes: string;
};

export type SelectAssetPayload = {
  assetId: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  url?: string;
  bucket?: string;
  objectPath?: string;
  mimeType?: string;
  status?: string;
  isCanonical?: boolean;
  sha256?: string;
  canonicalGroup?: string;
  reviewNotes?: string | null;
  createdAt?: string;
};

export type SelectAssetResponse = {
  selected: boolean;
  assetId: string | null;
  ok?: boolean;
  statusCode?: number;
  skipQuery?: boolean;
  error?: string;
  reason?: string;
  asset?: SelectAssetPayload;
  avatar?: string;
  scene?: string;
  assetType?: string;
  url?: string;
  bucket?: string;
  objectPath?: string;
  mimeType?: string;
  status?: string;
  isCanonical?: boolean;
  sha256?: string;
  canonicalGroup?: string;
  reviewNotes?: string | null;
  createdAt?: string;
};

export type RejectAssetResponse = {
  rejected: boolean;
  assetId: string;
  avatar?: string;
  scene?: string;
  assetType?: string;
  url?: string;
  bucket?: string;
  objectPath?: string;
  mimeType?: string;
  status?: string;
  sha256?: string;
  canonicalGroup?: string;
  reviewNotes?: string | null;
  createdAt?: string;
  reason?: string;
};

export type StatusFilter = "all" | "raw" | "selected" | "canonical" | "rejected";

export type ReviewFilters = {
  avatar: string;
  scene: string;
  assetType: string;
  limit: number;
  showCanonicalInCandidates: boolean;
  statusFilter: StatusFilter;
};

export type ApiFilters = Pick<
  ReviewFilters,
  "avatar" | "scene" | "assetType" | "limit"
>;

export type ReviewActionType = "promote" | "select" | "reject";

export type ConfirmAction =
  | { type: "promote"; asset: AssetCandidate }
  | { type: "select"; asset: AssetCandidate }
  | { type: "reject"; asset: AssetCandidate };
