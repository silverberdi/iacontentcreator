import { useEffect, useRef } from "react";
import type { IngestProfile } from "../types/ingestProfiles";
import LoadingSpinner from "./LoadingSpinner";

type DeleteIngestProfileDialogProps = {
  profile: IngestProfile | null;
  pending: boolean;
  blockedReason: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteIngestProfileDialog({
  profile,
  pending,
  blockedReason,
  onConfirm,
  onCancel,
}: DeleteIngestProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (profile) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [profile]);

  if (!profile) return null;

  const canDelete = !blockedReason;

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-0 text-gray-100 shadow-xl backdrop:bg-black/60"
    >
      <form
        method="dialog"
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canDelete && !pending) onConfirm();
        }}
      >
        <h3 className="text-lg font-semibold text-white">Delete ingest profile?</h3>
        <p className="mt-2 text-sm text-gray-400">
          Permanently delete <strong className="text-gray-200">{profile.profileName}</strong> from
          the database. This cannot be undone.
        </p>

        {blockedReason && (
          <p className="mt-3 rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {blockedReason}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !canDelete}
            className="flex items-center gap-2 rounded-md bg-red-900/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <LoadingSpinner className="size-4" label="Deleting…" /> : "Delete permanently"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
