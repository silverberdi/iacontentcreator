import { listReviewCandidates } from "../api/assetReviewApi";
import type { IngestProfile } from "../types/ingestProfiles";

/**
 * Delete eligibility is based on assets in canonical_asset_registry.
 * There is no direct ingest_profiles → assets FK in the dashboard API layer.
 * We probe via POST /assets/review-candidates (avatar + scene + assetType),
 * which reads the same registry the review UI uses.
 */
export function ingestProfileAssetKey(profile: Pick<IngestProfile, "avatar" | "scene" | "assetType">): string {
  return `${profile.avatar}|${profile.scene}|${profile.assetType}`;
}

export async function profileHasAssociatedAssets(
  profile: Pick<IngestProfile, "avatar" | "scene" | "assetType">,
): Promise<boolean> {
  const result = await listReviewCandidates({
    avatar: profile.avatar,
    scene: profile.scene,
    assetType: profile.assetType,
    limit: 1,
  });

  const count = result.count ?? result.candidates?.length ?? 0;
  return count > 0;
}

export async function buildProfileAssetFlags(
  profiles: IngestProfile[],
): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};

  await Promise.all(
    profiles.map(async (profile) => {
      const id = profile.profileId;
      if (!id) return;

      try {
        flags[id] = await profileHasAssociatedAssets(profile);
      } catch {
        // If the check fails, block delete until the server can validate.
        flags[id] = true;
      }
    }),
  );

  return flags;
}
