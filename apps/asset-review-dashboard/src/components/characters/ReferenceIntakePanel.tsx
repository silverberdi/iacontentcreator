import type { Dispatch, SetStateAction } from "react";
import {
  EMPTY_REFERENCE_FORM,
  REFERENCE_CLASSIFICATION_OPTIONS,
} from "../../domain/characterOnboardingModel";
import type {
  CharacterReferenceClassification,
  CharacterReferenceRecord,
  CharacterSceneDraft,
} from "../../types/characters";

type ReferenceForm = typeof EMPTY_REFERENCE_FORM;

type ReferenceMessage = {
  type: "success" | "error";
  text: string;
} | null;

type ReferenceIntakePanelProps = {
  avatar: string;
  scenes: CharacterSceneDraft[];
  references: CharacterReferenceRecord[];
  referenceForm: ReferenceForm;
  referenceMessage: ReferenceMessage;
  referencesLoading: boolean;
  referenceSaving: boolean;
  identityCanonCount: number;
  sceneCanonCount: number;
  candidateCount: number;
  rejectedCount: number;
  setReferenceForm: Dispatch<SetStateAction<ReferenceForm>>;
  onRefreshReferences: () => void;
  onRegisterReference: () => void;
  onPromoteIdentityCanon: (reference: CharacterReferenceRecord) => void;
};

export function ReferenceIntakePanel({
  avatar,
  scenes,
  references,
  referenceForm,
  referenceMessage,
  referencesLoading,
  referenceSaving,
  identityCanonCount,
  sceneCanonCount,
  candidateCount,
  rejectedCount,
  setReferenceForm,
  onRefreshReferences,
  onRegisterReference,
  onPromoteIdentityCanon,
}: ReferenceIntakePanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Reference intake
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Advanced reference registry for scene evidence, support images, and known
            rejections. Use the green card above for the normal identity-image path.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshReferences}
          disabled={!avatar || referencesLoading}
          className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 disabled:opacity-40"
        >
          {referencesLoading ? "Refreshing..." : "Refresh references"}
        </button>
      </div>

      {referenceMessage && (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            referenceMessage.type === "success"
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
          role="status"
        >
          {referenceMessage.text}
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {[
          ["Identity canon", identityCanonCount, identityCanonCount > 0],
          ["Scene canon", sceneCanonCount, sceneCanonCount > 0],
          ["Candidates", candidateCount, candidateCount > 0],
          ["Rejected evidence", rejectedCount, rejectedCount > 0],
        ].map(([label, count, ok]) => (
          <div
            key={String(label)}
            className={`rounded-md border px-3 py-2 text-sm ${
              ok
                ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                : "border-border bg-surface-raised text-gray-400"
            }`}
          >
            <span className="text-xl font-semibold text-gray-100">{String(count)}</span>
            <p className="mt-1 text-xs">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="text-sm text-gray-400">
          Reference image URL or object path
          <input
            value={referenceForm.objectPathOrUrl}
            onChange={(event) =>
              setReferenceForm((prev) => ({
                ...prev,
                objectPathOrUrl: event.target.value,
              }))
            }
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
            placeholder="/minio/iacontentcreator-assets/avatars/name/raw-image/file.png"
          />
        </label>
        <label className="text-sm text-gray-400">
          Classification
          <select
            value={referenceForm.classification}
            onChange={(event) =>
              setReferenceForm((prev) => ({
                ...prev,
                classification: event.target.value as CharacterReferenceClassification,
              }))
            }
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
          >
            {REFERENCE_CLASSIFICATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[240px_1fr_auto] lg:items-end">
        <label className="text-sm text-gray-400">
          Scene
          <select
            value={referenceForm.scene}
            onChange={(event) =>
              setReferenceForm((prev) => ({ ...prev, scene: event.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
          >
            <option value="portrait-canon">Portrait canon</option>
            {scenes.map((scene) => (
              <option key={scene.scene} value={scene.scene}>
                {scene.displayName || scene.scene}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-400">
          Notes
          <input
            value={referenceForm.reviewNotes}
            onChange={(event) =>
              setReferenceForm((prev) => ({ ...prev, reviewNotes: event.target.value }))
            }
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
            placeholder="Why this helps or why it must be rejected."
          />
        </label>
        <button
          type="button"
          onClick={onRegisterReference}
          disabled={referenceSaving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {referenceSaving ? "Registering..." : "Register reference"}
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {REFERENCE_CLASSIFICATION_OPTIONS.find(
          (option) => option.value === referenceForm.classification,
        )?.helper ?? ""}
      </p>

      <div className="mt-5 grid gap-3">
        {references.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-gray-500">
            No visual references registered yet for this character.
          </p>
        )}
        {references.map((reference) => (
          <article
            key={reference.assetId}
            className="grid gap-3 rounded-md border border-border bg-surface-raised p-3 md:grid-cols-[120px_1fr]"
          >
            <a
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-md border border-border bg-black/30"
            >
              <img
                src={reference.url}
                alt={reference.classification}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </a>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-overlay px-2 py-1 text-xs font-semibold text-gray-200">
                  {reference.classification}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    reference.status === "rejected"
                      ? "bg-red-950/60 text-red-200"
                      : reference.isCanonical
                        ? "bg-emerald-950/60 text-emerald-200"
                        : "bg-blue-950/60 text-blue-200"
                  }`}
                >
                  {reference.status}
                </span>
                <span className="text-xs text-gray-500">{reference.scene}</span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-gray-500">
                {reference.objectPath}
              </p>
              {reference.reviewNotes && (
                <p className="mt-2 text-sm text-gray-400">{reference.reviewNotes}</p>
              )}
              {reference.classification === "identity-candidate" && (
                <button
                  type="button"
                  onClick={() => onPromoteIdentityCanon(reference)}
                  disabled={referenceSaving}
                  className="mt-3 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Promote to identity canon
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
