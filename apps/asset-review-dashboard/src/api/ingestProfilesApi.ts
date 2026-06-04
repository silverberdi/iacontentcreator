import { getWebhookBaseUrl, n8nHeaders, postN8nJson, postN8nRequest } from "./n8nClient";
import type {
  ActiveIngestProfileResponse,
  DeleteIngestProfileResponse,
  IngestProfile,
  ListIngestProfilesResponse,
  SetActiveIngestProfileResponse,
  UpsertIngestProfileResponse,
} from "../types/ingestProfiles";

export type ActiveIngestProfileFetchResult = {
  httpOk: boolean;
  httpStatus: number;
  body: ActiveIngestProfileResponse | null;
};

export async function getActiveIngestProfile(): Promise<ActiveIngestProfileFetchResult> {
  const { httpOk, status, data } = await postN8nRequest<ActiveIngestProfileResponse>(
    "/admin/ingest-profiles/active",
    {},
  );

  return {
    httpOk,
    httpStatus: status,
    body: data,
  };
}

export async function listIngestProfiles(): Promise<ListIngestProfilesResponse> {
  return postN8nJson<ListIngestProfilesResponse>("/admin/ingest-profiles/list", {});
}

export async function upsertIngestProfile(
  profile: IngestProfile,
): Promise<UpsertIngestProfileResponse> {
  return postN8nJson<UpsertIngestProfileResponse>("/admin/ingest-profiles/upsert", profile);
}

export async function upsertIngestProfileValidated(
  profile: IngestProfile,
): Promise<UpsertIngestProfileResponse> {
  return postN8nJson<UpsertIngestProfileResponse>(
    "/admin/ingest-profiles/upsert-validated",
    profile,
  );
}

export async function setActiveIngestProfile(
  profileId: string,
): Promise<SetActiveIngestProfileResponse> {
  return postN8nJson<SetActiveIngestProfileResponse>("/admin/ingest-profiles/set-active", {
    profileId,
    profile_id: profileId,
  });
}

export type DeleteIngestProfileFetchResult = {
  httpOk: boolean;
  httpStatus: number;
  body: DeleteIngestProfileResponse | null;
  rawText: string;
};

export async function deleteIngestProfile(
  profileId: string,
): Promise<DeleteIngestProfileFetchResult> {
  const url = `${getWebhookBaseUrl()}/admin/ingest-profiles/delete`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: n8nHeaders,
      body: JSON.stringify({ profileId, profile_id: profileId }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Failed to reach ${url}: ${message}`);
  }

  const rawText = await response.text();
  let body: DeleteIngestProfileResponse | null = null;
  if (rawText) {
    try {
      body = JSON.parse(rawText) as DeleteIngestProfileResponse;
    } catch {
      console.error("[deleteIngestProfile] Invalid JSON:", rawText);
    }
  }

  return {
    httpOk: response.ok,
    httpStatus: response.status,
    body,
    rawText,
  };
}
