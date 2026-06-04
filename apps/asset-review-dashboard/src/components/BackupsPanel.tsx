import { useCallback, useEffect, useRef, useState } from "react";
import { checkBackupHealth, createBackup, listBackups } from "../api/backupApi";
import type {
  BackupHealthResponse,
  BackupRecord,
} from "../types/backups";
import { formatBytes, formatDate } from "../utils/format";
import LoadingSpinner from "./LoadingSpinner";

function SuccessBadge({ success }: { success: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${
        success
          ? "bg-emerald-900/60 text-emerald-200"
          : "bg-red-900/60 text-red-200"
      }`}
    >
      {success ? "Success" : "Failure"}
    </span>
  );
}

export default function BackupsPanel() {
  const [health, setHealth] = useState<BackupHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupRoot, setBackupRoot] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);

  const [createPending, setCreatePending] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const createDialogRef = useRef<HTMLDialogElement>(null);

  const loadBackupList = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const result = await listBackups();
      if (!result.ok) {
        throw new Error(result.message ?? result.reason ?? "Failed to list backups");
      }
      setBackups(result.backups);
      setBackupRoot(result.backupRoot);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list backups";
      setListError(message);
      setBackups([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBackupList();
  }, [loadBackupList]);

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog) return;

    if (createDialogOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [createDialogOpen]);

  const handleCheckHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const result = await checkBackupHealth();
      if (!result.ok) {
        throw new Error(result.message ?? result.reason ?? "Backup runner health check failed");
      }
      setHealth(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Health check failed";
      setHealthError(message);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatePending(true);
    setActionMessage(null);

    try {
      const result = await createBackup();
      if (!result.ok || !result.success) {
        throw new Error(result.message ?? result.reason ?? "Backup creation failed");
      }

      setActionMessage({
        type: "success",
        text: `Backup ${result.backupId} created (${formatBytes(result.sizeBytes)}).`,
      });
      setCreateDialogOpen(false);
      await loadBackupList();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backup creation failed";
      setActionMessage({ type: "error", text: message });
    } finally {
      setCreatePending(false);
    }
  };

  const busy = healthLoading || listLoading || createPending;

  return (
    <section className="space-y-6">
      <p className="text-sm text-gray-500">
        Backup runner health, manual backup creation, and backup history.
      </p>

      <div className="mb-5 rounded-md border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-200">Backup Runner Health</h3>
          {health && (
            <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              {health.status}
            </span>
          )}
        </div>

        {healthLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <LoadingSpinner className="size-4" label="Checking health…" />
          </div>
        )}

        {!healthLoading && healthError && (
          <p className="text-sm text-red-300" role="alert">
            {healthError}
          </p>
        )}

        {!healthLoading && !healthError && !health && (
          <p className="text-sm text-gray-500">Health not checked yet.</p>
        )}

        {!healthLoading && health && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Service</dt>
              <dd className="mt-0.5 font-mono text-gray-200">{health.service}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Backup root</dt>
              <dd className="mt-0.5 font-mono text-gray-200">{health.backupRoot}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">PostgreSQL host</dt>
              <dd className="mt-0.5 font-mono text-gray-200">{health.postgresHost}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">MinIO endpoint</dt>
              <dd className="mt-0.5 font-mono text-gray-200">{health.minioEndpoint}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">MinIO bucket</dt>
              <dd className="mt-0.5 font-mono text-gray-200">{health.minioBucket}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCheckHealth()}
          disabled={busy}
          className="flex items-center gap-2 rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {healthLoading ? (
            <LoadingSpinner className="size-4" label="Checking…" />
          ) : (
            "Check Health"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActionMessage(null);
            setCreateDialogOpen(true);
          }}
          disabled={busy}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create Backup
        </button>

        <button
          type="button"
          onClick={() => void loadBackupList()}
          disabled={busy}
          className="flex items-center gap-2 rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {listLoading ? (
            <LoadingSpinner className="size-4" label="Refreshing…" />
          ) : (
            "Refresh Backup List"
          )}
        </button>
      </div>

      {actionMessage && (
        <div
          role="status"
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === "success"
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-200">Backup History</h3>
          {backupRoot && (
            <span className="font-mono text-xs text-gray-500">{backupRoot}</span>
          )}
        </div>

        {listLoading && backups.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <LoadingSpinner className="size-5" label="Loading backups…" />
          </div>
        )}

        {listError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          >
            {listError}
          </div>
        )}

        {!listLoading && !listError && backups.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface py-10 text-center">
            <p className="text-sm font-medium text-gray-300">No backups found</p>
            <p className="mt-1 text-sm text-gray-500">
              Create a backup or refresh the list after the runner completes a job.
            </p>
          </div>
        )}

        {backups.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Backup ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Finished
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Components
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Path
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-muted bg-surface-raised">
                {backups.map((backup) => (
                  <tr key={backup.backupId} className="hover:bg-surface-overlay/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-200">
                      {backup.backupId}
                    </td>
                    <td className="px-4 py-3">
                      <SuccessBadge success={backup.success} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                      {backup.finishedAt ? formatDate(backup.finishedAt) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                      {formatBytes(backup.sizeBytes)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-300">
                      {backup.components?.length ?? 0}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-400">
                      {backup.path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <dialog
        ref={createDialogRef}
        onClose={() => {
          if (!createPending) setCreateDialogOpen(false);
        }}
        className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-0 text-gray-100 shadow-xl backdrop:bg-black/60"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreateBackup();
          }}
          className="p-5"
        >
          <h3 className="text-lg font-semibold text-white">Create a new backup?</h3>
          <p className="mt-2 text-sm text-gray-400">
            This will trigger a full backup via the backup runner. The operation may take
            several minutes.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createPending}
              className="rounded-md border border-border px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPending}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createPending ? (
                <LoadingSpinner className="size-4" label="Creating backup…" />
              ) : (
                "Create Backup"
              )}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
