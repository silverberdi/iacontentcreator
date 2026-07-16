import type { AuthMeResponse, AuthUser, AuthUsersResponse } from "../types/auth";

async function authJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json()) as T;
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export function getAuthMe(): Promise<AuthMeResponse> {
  return authJson<AuthMeResponse>("/api/auth/me");
}

export function listAuthUsers(): Promise<AuthUsersResponse> {
  return authJson<AuthUsersResponse>("/api/auth/users");
}

export function approveAuthUser(
  email: string,
  options: { technicalMode: boolean },
): Promise<{ ok: boolean; user: AuthUser }> {
  return authJson("/api/auth/users/approve", {
    method: "POST",
    body: JSON.stringify({
      email,
      role: options.technicalMode ? "technical" : "admin",
      technicalMode: options.technicalMode,
    }),
  });
}

export function rejectAuthUser(email: string): Promise<{ ok: boolean; user: AuthUser }> {
  return authJson("/api/auth/users/reject", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return authJson("/api/auth/logout", { method: "POST" });
}
