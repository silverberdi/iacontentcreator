import type {
  ActiveIngestProfileResponse,
  DeleteIngestProfileResponse,
  IngestProfile,
  ListIngestProfilesResponse,
  SetActiveIngestProfileResponse,
  UpsertIngestProfileResponse,
} from "../types/ingestProfiles";
import { PROFILE_DELETE_BLOCKED_MESSAGE } from "../types/ingestProfiles";
import { normalizeProfiles, readProfileId } from "./ingestProfileForm";

export type IngestProfilesFetchResult<T> = {
  httpOk: boolean;
  httpStatus: number;
  body: T | null;
  rawText: string;
};

/** Unwrap n8n JSON: single object, or first element of an array. */
export function unwrapN8nBody(data: unknown): Record<string, unknown> | null {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return {};
    const first = data[0];
    if (first && typeof first === "object") {
      return first as Record<string, unknown>;
    }
    return null;
  }
  if (typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return null;
}

function responseErrorMessage(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  const err = body.error ?? body.message ?? body.reason;
  if (typeof err === "string" && err.trim()) return err.trim();
  return null;
}

function isExplicitFailure(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  if (body.ok === false || body.success === false) return true;
  if (body.deleted === false) return true;
  const err = responseErrorMessage(body);
  return Boolean(err && body.ok !== true && body.success !== true);
}

function isExplicitSuccess(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  if (body.ok === true || body.success === true) return true;
  if (body.deleted === true) return true;
  if (body.found === true) return true;
  return false;
}

export function extractProfileFromUnknown(data: unknown): IngestProfile | null {
  const body = unwrapN8nBody(data);
  if (!body) return null;

  const nested = body.profile;
  if (nested && typeof nested === "object") {
    const [profile] = normalizeProfiles([nested as IngestProfile]);
    if (profile?.profileName || profile?.avatar) return profile;
  }

  if (
    body.profileName ||
    body.profile_name ||
    body.avatar ||
    body.profileId ||
    body.profile_id
  ) {
    const [profile] = normalizeProfiles([body as IngestProfile]);
    return profile ?? null;
  }

  return null;
}

function extractProfilesArray(data: unknown): IngestProfile[] | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    if (first && typeof first === "object" && ("profileName" in first || "profile_name" in first || "avatar" in first)) {
      return normalizeProfiles(data as IngestProfile[]);
    }
  }

  const body = unwrapN8nBody(data);
  if (!body) return null;

  if (Array.isArray(body.profiles)) {
    return normalizeProfiles(body.profiles as IngestProfile[]);
  }

  if (Array.isArray(body.data)) {
    return normalizeProfiles(body.data as IngestProfile[]);
  }

  return null;
}

export type ParsedListProfilesResult = {
  profiles: IngestProfile[];
  succeeded: boolean;
  error: string | null;
};

export function parseListIngestProfilesResponse(
  data: ListIngestProfilesResponse | unknown | null,
  rawText: string,
  httpOk: boolean,
  httpStatus: number,
): ParsedListProfilesResult {
  const fromArray = extractProfilesArray(data);
  if (fromArray !== null) {
    return { profiles: fromArray, succeeded: true, error: null };
  }

  const body = unwrapN8nBody(data);

  if (!body && !rawText.trim()) {
    return {
      profiles: [],
      succeeded: httpOk,
      error: httpOk ? null : `List profiles failed (HTTP ${httpStatus}).`,
    };
  }

  if (isExplicitFailure(body)) {
    return {
      profiles: [],
      succeeded: false,
      error:
        responseErrorMessage(body) ?? `List profiles failed (HTTP ${httpStatus}).`,
    };
  }

  if (Array.isArray(body?.profiles)) {
    return {
      profiles: normalizeProfiles(body.profiles as IngestProfile[]),
      succeeded: true,
      error: null,
    };
  }

  const count = typeof body?.count === "number" ? body.count : 0;
  if (count > 0) {
    return {
      profiles: [],
      succeeded: false,
      error: `List response reported count=${count} but profiles array is missing.`,
    };
  }

  if (httpOk || isExplicitSuccess(body)) {
    return { profiles: [], succeeded: true, error: null };
  }

  return {
    profiles: [],
    succeeded: false,
    error:
      responseErrorMessage(body) ??
      `List profiles request failed (HTTP ${httpStatus}).`,
  };
}

export type ParsedActiveProfileResult = {
  profile: IngestProfile | null;
  found: boolean;
  error: string | null;
};

export function parseActiveIngestProfileResponse(
  data: ActiveIngestProfileResponse | unknown | null,
  rawText: string,
  httpOk: boolean,
  httpStatus: number,
): ParsedActiveProfileResult {
  const profile = extractProfileFromUnknown(data);
  if (profile) {
    return { profile, found: true, error: null };
  }

  const body = unwrapN8nBody(data);

  if (body?.found === false) {
    return {
      profile: null,
      found: false,
      error: responseErrorMessage(body) ?? null,
    };
  }

  if (!body && !httpOk) {
    const noItem =
      rawText.toLowerCase().includes("no item") ||
      responseErrorMessage(body)?.toLowerCase().includes("no item");
    return {
      profile: null,
      found: false,
      error: noItem
        ? "No active ingest profile."
        : `Active profile failed (HTTP ${httpStatus}).`,
    };
  }

  if (!body && httpOk) {
    return {
      profile: null,
      found: false,
      error: "No active ingest profile.",
    };
  }

  if (isExplicitFailure(body) && body?.found !== true) {
    return {
      profile: null,
      found: false,
      error:
        responseErrorMessage(body) ??
        `No active ingest profile (HTTP ${httpStatus}).`,
    };
  }

  return {
    profile: null,
    found: false,
    error: responseErrorMessage(body) ?? "No active profile in response.",
  };
}

export type ParsedUpsertProfileResult = {
  succeeded: boolean;
  profile: IngestProfile | null;
  error: string | null;
  validationError: string | null;
};

export function formatUpsertValidationErrors(
  body: Record<string, unknown> | null,
): string | null {
  if (!body) return null;
  const parts: string[] = [];

  const errors = body.errors;
  if (Array.isArray(errors)) {
    parts.push(...errors.filter((e): e is string => typeof e === "string" && Boolean(e.trim())));
  }

  const validationErrors = body.validationErrors;
  if (Array.isArray(validationErrors)) {
    parts.push(
      ...validationErrors.filter((e): e is string => typeof e === "string" && Boolean(e.trim())),
    );
  } else if (validationErrors && typeof validationErrors === "object") {
    for (const [key, value] of Object.entries(validationErrors)) {
      if (typeof value === "string" && value.trim()) {
        parts.push(`${key}: ${value}`);
      }
    }
  }

  if (parts.length > 0) return parts.join("; ");
  return responseErrorMessage(body);
}

export function parseUpsertIngestProfileResponse(
  data: UpsertIngestProfileResponse | unknown | null,
  rawText: string,
  httpOk: boolean,
  httpStatus: number,
  sentProfile?: IngestProfile,
): ParsedUpsertProfileResult {
  const body = unwrapN8nBody(data);
  const validationError = formatUpsertValidationErrors(body);

  if (isExplicitFailure(body)) {
    return {
      succeeded: false,
      profile: null,
      error: validationError ?? responseErrorMessage(body) ?? "Failed to save profile",
      validationError,
    };
  }

  const profile = extractProfileFromUnknown(data);
  if (profile) {
    return { succeeded: true, profile, error: null, validationError: null };
  }

  if (validationError && body?.ok === false) {
    return {
      succeeded: false,
      profile: null,
      error: validationError,
      validationError,
    };
  }

  if (httpOk || isExplicitSuccess(body)) {
    const fallback = sentProfile
      ? (normalizeProfiles([sentProfile])[0] ?? null)
      : null;
    return {
      succeeded: true,
      profile: fallback,
      error: null,
      validationError: null,
    };
  }

  if (!body && !rawText.trim() && httpOk) {
    const fallback = sentProfile
      ? (normalizeProfiles([sentProfile])[0] ?? null)
      : null;
    return { succeeded: true, profile: fallback, error: null, validationError: null };
  }

  return {
    succeeded: false,
    profile: null,
    error:
      responseErrorMessage(body) ??
      (rawText.trim()
        ? `Save profile returned an invalid response (HTTP ${httpStatus}).`
        : `Failed to save profile (HTTP ${httpStatus}).`),
    validationError: null,
  };
}

export type ParsedSetActiveProfileResult = {
  succeeded: boolean;
  profile: IngestProfile | null;
  profileId: string | null;
  error: string | null;
};

export function parseSetActiveIngestProfileResponse(
  data: SetActiveIngestProfileResponse | unknown | null,
  _rawText: string,
  httpOk: boolean,
  httpStatus: number,
  requestedProfileId?: string,
): ParsedSetActiveProfileResult {
  const body = unwrapN8nBody(data);

  if (isExplicitFailure(body)) {
    return {
      succeeded: false,
      profile: null,
      profileId: null,
      error:
        responseErrorMessage(body) ?? `Failed to set active profile (HTTP ${httpStatus}).`,
    };
  }

  const profile = extractProfileFromUnknown(data);
  const profileId =
    readProfileId((profile ?? body ?? {}) as IngestProfile & Record<string, unknown>) ??
    (typeof body?.profileId === "string" ? body.profileId : undefined) ??
    (typeof body?.profile_id === "string" ? body.profile_id : undefined) ??
    requestedProfileId ??
    null;

  if (profile || profileId) {
    return {
      succeeded: true,
      profile,
      profileId: profileId ?? null,
      error: null,
    };
  }

  if (httpOk || isExplicitSuccess(body)) {
    return {
      succeeded: true,
      profile: null,
      profileId: requestedProfileId ?? null,
      error: null,
    };
  }

  return {
    succeeded: false,
    profile: null,
    profileId: null,
    error:
      responseErrorMessage(body) ??
      `Failed to set active profile (HTTP ${httpStatus}).`,
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
  body: DeleteIngestProfileResponse | unknown | null,
  rawText: string,
  httpOk: boolean,
): ParsedDeleteProfileResult {
  const unwrapped = unwrapN8nBody(body);
  const record = unwrapped ?? (body && typeof body === "object" ? (body as Record<string, unknown>) : null);

  if (record?.deleted === true) {
    const name =
      typeof record.profileName === "string"
        ? record.profileName
        : typeof record.profile_name === "string"
          ? record.profile_name
          : undefined;
    return { deleted: true, error: null, profileName: name };
  }

  if (record && isExplicitFailure(record)) {
    const assetBlocked =
      typeof record.assetCount === "number" &&
      record.assetCount > 0 &&
      !responseErrorMessage(record);
    const message =
      responseErrorMessage(record) ??
      (assetBlocked ? PROFILE_DELETE_BLOCKED_MESSAGE : null) ??
      "Failed to delete profile";
    return { deleted: false, error: message };
  }

  if (record && (record.ok === true || record.success === true) && record.deleted !== false) {
    const name =
      typeof record.profileName === "string"
        ? record.profileName
        : typeof record.profile_name === "string"
          ? record.profile_name
          : undefined;
    return { deleted: true, error: null, profileName: name };
  }

  if (httpOk && !record) {
    if (rawText.trim()) {
      console.error("[deleteIngestProfile] Non-JSON response:", rawText);
      return { deleted: false, error: "Delete endpoint returned an invalid response." };
    }
    return { deleted: true, error: null };
  }

  if (httpOk && record && !isExplicitFailure(record)) {
    return { deleted: true, error: null };
  }

  if (!record) {
    if (rawText.trim()) {
      console.error("[deleteIngestProfile] Non-JSON response:", rawText);
    }
    return {
      deleted: false,
      error: httpOk
        ? null
        : rawText.trim()
          ? "Delete endpoint returned an invalid response."
          : `Delete failed (HTTP error).`,
    };
  }

  return {
    deleted: false,
    error: responseErrorMessage(record) ?? "Failed to delete profile",
  };
}
