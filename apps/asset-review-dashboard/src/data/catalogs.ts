export const avatars = [
  { id: "estefania-montealegre", label: "Estefanía Montealegre", short: "estefania" },
  { id: "diana-duarte", label: "Diana Duarte", short: "diana" },
  { id: "andres-ferrer", label: "Andrés Ferrer", short: "andres" },
  { id: "donovan-j-scott", label: "Donovan J. Scott", short: "donovan" },
] as const;

export const scenes = [
  { id: "coffee-rain", label: "Coffee Rain" },
  { id: "portrait", label: "Portrait" },
  { id: "midshot", label: "Midshot" },
  { id: "fullbody", label: "Full Body" },
  { id: "public-identity", label: "Public Identity" },
  { id: "private-rock", label: "Private Rock" },
] as const;

export const assetTypes = [
  { id: "raw-image", label: "Raw Image" },
  { id: "generated", label: "Generated" },
  { id: "select", label: "Select" },
  { id: "canonical", label: "Canonical" },
] as const;

export const statusFilters = [
  { id: "all", label: "All" },
  { id: "raw", label: "Raw" },
  { id: "selected", label: "Selected" },
  { id: "canonical", label: "Canonical" },
  { id: "rejected", label: "Rejected" },
] as const;

export const defaultFilters = {
  avatar: "estefania-montealegre",
  scene: "coffee-rain",
  assetType: "raw-image",
  limit: 50,
  showCanonicalInCandidates: false,
  statusFilter: "all",
} as const;

export function getAvatarLabel(id: string): string {
  return avatars.find((a) => a.id === id)?.label ?? id;
}

export function getSceneLabel(id: string): string {
  return scenes.find((s) => s.id === id)?.label ?? id;
}

export function getAssetTypeLabel(id: string): string {
  return assetTypes.find((t) => t.id === id)?.label ?? id;
}
