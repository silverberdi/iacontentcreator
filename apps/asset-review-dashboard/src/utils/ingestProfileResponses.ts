import type {
  ActiveIngestProfileResponse,
  DeleteIngestProfileResponse,
  IngestProfile,
  ListIngestProfilesResponse,
} from "../types/ingestProfiles";
import { PROFILE_DELETE_BLOCKED_MESSAGE } from "../types/ingestProfiles";
import { normalizeProfiles } from "./ingestProfileForm";

export type ParsedListProfilesResult = {
  profiles: IngestProfile[];
  succeeded: boolean;
  error: string | null;
};

export type ParsedActiveProfileResult = {
  profile: IngestProfile | null;
  found: boolean;
  error: string | null;
};

export function parseListIngestProfilesResponse(
  result: ListIngestProfilesResponse | null,
  httpOk: boolean,
  httpStatus: number,
): ParsedListProfilesResult {
  if (!result) {
    return {
      profiles: [],
      succeeded: false,
      error: `List profiles returned no data (HTTP ${httpStatus}).`,
    };
  }

  if (result.ok === false) {
    return {
      profiles: [],
      succeeded: false,
      error:
        result.message ??
        result.reason ??
        `List profiles failed (HTTP ${httpStatus}).`,
    };
  }

  if (!httpOk && result.ok !== true) {
    return {
      profiles: [],
      succeeded: false,
      error:
        result.message ??
        result.reason ??
        `List profiles request failed (HTTP ${httpStatus}).`,
    };
  }

  if (!Array.isArray(result.profiles)) {
    const count = typeof result.count === "number" ? result.count : 0;
    if (count > 0) {
      return {
        profiles: [],
        succeeded: false,
        error: `List response reported count=${count} but profiles array is missing.`,
      };
    }
    return {
      profiles: [],
      succeeded: true,
      error: null,
    };
  }

  return {
    profiles: normalizeProfiles(result.profiles),
    succeeded: true,
    error: null,
  };
}

export function parseActiveIngestProfileResponse(
  result: ActiveIngestProfileResponse | null,
  httpOk: boolean,
  httpStatus: number,
): ParsedActiveProfileResult {
  if (!result) {
    return {
      profile: null,
      found: false,
      error: httpOk
        ? "Active profile response was empty."
        : `Active profile failed (HTTP ${httpStatus}).`,
    };
  }

  if (!httpOk && result.found !== true && !result.profile) {
    const noItem =
      typeof result.message === "string" &&
      result.message.toLowerCase().includes("no item");
    return {
      profile: null,
      found: false,
      error:
        result.error ??
        result.message ??
        result.reason ??
        (noItem ? "No active ingest profile." : `Active profile failed (HTTP ${httpStatus}).`),
    };
  }

  if (result.found === false) {
    return {
      profile: null,
      found: false,
      error: result.error ?? result.message ?? result.reason ?? null,
    };
  }

  if (result.ok === false && result.found !== true) {
    return {
      profile: null,
      found: false,
      error:
        result.error ??
        result.message ??
        result.reason ??
        `No active ingest profile (HTTP ${httpStatus}).`,
    };
  }

  const rawProfile = result.profile;
  if (!rawProfile) {
    return {
      profile: null,
      found: false,
      error: result.error ?? result.message ?? "No active profile in response.",
    };
  }

  const [profile] = normalizeProfiles([rawProfile]);
  return {
    profile: profile ?? null,
    found: Boolean(profile),
    error: null,
  };
}

export function activeProfileDisplayName(
  responseProfile: IngestProfile | null | undefined,
  rowProfile: IngestProfile,
): string {
  return responseProfile?.profileName?.trim() || rowProfile.profileName;
}

export type ParsedDeleteProfileResult = {
  deleted: boolean;
  error: string | null;
  profileName?: string;
};

export function parseDeleteIngestProfileResponse(
  body: DeleteIngestProfileResponse | null,
  rawText: string,
  httpOk: boolean,
): ParsedDeleteProfileResult {
  if (!body) {
    if (rawText.trim()) {
      console.error("[deleteIngestProfile] Non-JSON response:", rawText);
    }
    return {
      deleted: false,
      error: "Delete endpoint returned an invalid response.",
    };
  }

  if (body.deleted === true) {
    return {
      deleted: true,
      error: null,
      profileName: body.profileName,
    };
  }

  if (body.ok === false || body.deleted === false) {
    const assetBlocked =
      typeof body.assetCount === "number" &&
      body.assetCount > 0 &&
      !body.error?.trim();
    const message =
      body.error?.trim() ||
      body.message?.trim() ||
      body.reason?.trim() ||
      (assetBlocked ? PROFILE_DELETE_BLOCKED_MESSAGE : null) ||
      (!httpOk ? `Delete failed (HTTP error).` : "Failed to delete profile");

    return { deleted: false, error: message };
  }

  if (!httpOk) {
    return {
      deleted: false,
      error:
        body.error?.trim() ||
        body.message?.trim() ||
        body.reason?.trim() ||
        "Failed to delete profile",
    };
  }

  return {
    deleted: false,
    error: body.error?.trim() || body.message?.trim() || "Failed to delete profile",
  };
}
