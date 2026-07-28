import type { AiGatewayHealthResponse } from "../types/ops";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function getAiGatewayHealth(): Promise<AiGatewayHealthResponse> {
  return getJson<AiGatewayHealthResponse>("/api/ops/ai-gateway-health");
}
