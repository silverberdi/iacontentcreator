import { getN8nHeaders, getWebhookBaseUrl } from "./n8nClient";
import type {
  ActiveIngestProfileResponse,
  DeleteIngestProfileResponse,
  IngestProfile,
  ListIngestProfilesResponse,
  SetActiveIngestProfileResponse,
  UpsertIngestProfileResponse,
} from "../types/ingestProfiles";
import type { IngestProfilesFetchResult } from "../utils/ingestProfileResponses";

async function postIngestProfiles<T>(
  path: string,
  body: unknown = {},
): Promise<IngestProfilesFetchResult<T>> {
  const url = `${getWebhookBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getN8nHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Failed to reach ${url}: ${message}`);
  }

  const rawText = await response.text();
  let data: T | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      console.error(`[ingestProfiles] Invalid JSON from ${path}:`, rawText);
    }
  }

  return {
    httpOk: response.ok,
    httpStatus: response.status,
    body: data,
    rawText,
  };
}

export type ActiveIngestProfileFetchResult = IngestProfilesFetchResult<ActiveIngestProfileResponse>;

export async function getActiveIngestProfile(): Promise<ActiveIngestProfileFetchResult> {
  return postIngestProfiles<ActiveIngestProfileResponse>("/admin/ingest-profiles/active", {});
}

export async function listIngestProfiles(): Promise<
  IngestProfilesFetchResult<ListIngestProfilesResponse>
> {
  return postIngestProfiles<ListIngestProfilesResponse>("/admin/ingest-profiles/list", {});
}

export async function upsertIngestProfileValidated(
  profile: IngestProfile,
): Promise<IngestProfilesFetchResult<UpsertIngestProfileResponse>> {
  return postIngestProfiles<UpsertIngestProfileResponse>(
    "/admin/ingest-profiles/upsert-validated",
    profile,
  );
}

export async function setActiveIngestProfile(
  profileId: string,
): Promise<IngestProfilesFetchResult<SetActiveIngestProfileResponse>> {
  return postIngestProfiles<SetActiveIngestProfileResponse>("/admin/ingest-profiles/set-active", {
    profileId,
    profile_id: profileId,
  });
}

export type DeleteIngestProfileFetchResult =
  IngestProfilesFetchResult<DeleteIngestProfileResponse>;

export async function deleteIngestProfile(
  profileId: string,
): Promise<DeleteIngestProfileFetchResult> {
  return postIngestProfiles<DeleteIngestProfileResponse>("/admin/ingest-profiles/delete", {
    profileId,
    profile_id: profileId,
  });
}
