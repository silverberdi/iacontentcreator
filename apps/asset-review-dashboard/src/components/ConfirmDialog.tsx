import { useEffect, useRef } from "react";
import type { ConfirmAction } from "../types/assets";
import { shortenId } from "../utils/format";
import LoadingSpinner from "./LoadingSpinner";

const DEFAULT_PROMOTE_NOTES = "Selected via Asset Review Dashboard";
const DEFAULT_REJECT_NOTES = "Rejected during dashboard review";

type ConfirmDialogProps = {
  action: ConfirmAction | null;
  reviewNotes: string;
  pending: boolean;
  operationType: "promote" | "reject" | null;
  onReviewNotesChange: (notes: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  action,
  reviewNotes,
  pending,
  operationType,
  onReviewNotesChange,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (action) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [action]);

  if (!action) return null;

  const isPromote = action.type === "promote";
  const title = isPromote
    ? "Promote this asset as canonical?"
    : "Reject this asset?";

  const pendingLabel =
    operationType === "promote"
      ? "Promoting…"
      : operationType === "reject"
        ? "Rejecting…"
        : "Processing…";

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-0 text-gray-100 shadow-xl backdrop:bg-black/60"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
        className="p-5"
      >
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-400">
          Asset{" "}
          <span className="font-mono text-gray-300">{shortenId(action.asset.assetId)}</span>
        </p>

        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Review notes</span>
          <textarea
            value={reviewNotes}
            onChange={(e) => onReviewNotesChange(e.target.value)}
            disabled={pending}
            rows={3}
            className="resize-y rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent disabled:opacity-60"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-border px-4 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              isPromote
                ? "bg-emerald-700 hover:bg-emerald-600"
                : "bg-red-900/80 hover:bg-red-800"
            }`}
          >
            {pending ? (
              <LoadingSpinner className="size-4" label={pendingLabel} />
            ) : isPromote ? (
              "Promote"
            ) : (
              "Reject"
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export { DEFAULT_PROMOTE_NOTES, DEFAULT_REJECT_NOTES };
