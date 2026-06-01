export type BackupRecord = {
  backupId: string;
  path: string;
  createdAt: string;
  finishedAt: string | null;
  success: boolean;
  sizeBytes: number;
  components: unknown[];
};

export type BackupHealthResponse = {
  ok: boolean;
  status: string;
  service: string;
  backupRoot: string;
  postgresHost: string;
  minioEndpoint: string;
  minioBucket: string;
  message?: string;
  reason?: string;
};

export type BackupListResponse = {
  ok: boolean;
  status: string;
  count: number;
  backupRoot: string;
  backups: BackupRecord[];
  message?: string;
  reason?: string;
};

export type CreateBackupResponse = {
  ok: boolean;
  success: boolean;
  backupId: string;
  path: string;
  createdAt: string;
  finishedAt: string;
  sizeBytes: number;
  components: unknown[];
  message?: string;
  reason?: string;
};
