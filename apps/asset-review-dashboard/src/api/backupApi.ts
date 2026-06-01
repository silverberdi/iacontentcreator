import type {
  BackupHealthResponse,
  BackupListResponse,
  CreateBackupResponse,
} from "../types/backups";
import { postN8nJson } from "./n8nClient";

export async function checkBackupHealth(): Promise<BackupHealthResponse> {
  return postN8nJson<BackupHealthResponse>("/admin/backups/health", {});
}

export async function listBackups(): Promise<BackupListResponse> {
  return postN8nJson<BackupListResponse>("/admin/backups/list", {});
}

export async function createBackup(): Promise<CreateBackupResponse> {
  return postN8nJson<CreateBackupResponse>("/admin/backups/create", {
    requestedBy: "dashboard",
  });
}
