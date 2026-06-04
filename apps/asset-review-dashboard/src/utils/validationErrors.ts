import type { UpsertIngestProfileResponse } from "../types/ingestProfiles";

export function formatValidationErrors(result: UpsertIngestProfileResponse): string | null {
  const parts: string[] = [];

  if (Array.isArray(result.errors)) {
    parts.push(...result.errors.filter((e) => typeof e === "string" && e.trim()));
  }

  if (Array.isArray(result.validationErrors)) {
    parts.push(
      ...result.validationErrors.filter((e) => typeof e === "string" && e.trim()),
    );
  } else if (result.validationErrors && typeof result.validationErrors === "object") {
    for (const [key, value] of Object.entries(result.validationErrors)) {
      if (typeof value === "string" && value.trim()) {
        parts.push(`${key}: ${value}`);
      }
    }
  }

  if (parts.length > 0) {
    return parts.join("; ");
  }

  return result.message ?? result.reason ?? null;
}
