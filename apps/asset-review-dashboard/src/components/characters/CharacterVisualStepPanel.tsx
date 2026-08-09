import type { Dispatch, SetStateAction } from "react";
import type {
  CharacterCanonPortraitJob,
  CharacterCanonPortraitPromptPack,
  CharacterOnboardingSavePayload,
  CharacterReferenceClassification,
  CharacterReferenceRecord,
  CharacterSceneDraft,
} from "../../types/characters";
import { CanonPortraitGenerationPanel } from "./CanonPortraitGenerationPanel";
import { ReferenceIntakePanel } from "./ReferenceIntakePanel";
import { SceneCanonBoard } from "./SceneCanonBoard";
import { EMPTY_REFERENCE_FORM } from "../../domain/characterOnboardingModel";

type ReferenceForm = typeof EMPTY_REFERENCE_FORM;

type OperatorMessage = {
  type: "success" | "error";
  text: string;
} | null;

type CharacterVisualStepPanelProps = {
  draft: CharacterOnboardingSavePayload;
  references: CharacterReferenceRecord[];
  referenceForm: ReferenceForm;
  referenceMessage: OperatorMessage;
  referencesLoading: boolean;
  referenceSaving: boolean;
  referenceUploading: boolean;
  referenceUploadFile: File | null;
  identityCanonCount: number;
  sceneCanonCount: number;
  candidateCount: number;
  rejectedCount: number;
  visualSceneRows: CharacterSceneDraft[];
  sceneCanonByScene: Map<string, CharacterReferenceRecord>;
  sceneCandidatesByScene: Map<string, CharacterReferenceRecord[]>;
  canonJob: CharacterCanonPortraitJob | null;
  canonPromptPack: CharacterCanonPortraitPromptPack | null;
  canonInstructions: string[];
  canonMessage: OperatorMessage;
  canonSaving: boolean;
  canonRunning: boolean;
  canonIngesting: boolean;
  canonOutputUrl: string;
  setReferenceForm: Dispatch<SetStateAction<ReferenceForm>>;
  setReferenceUploadFile: (file: File | null) => void;
  setCanonOutputUrl: (value: string) => void;
  updateReferencePolicy: (referencePolicy: CharacterOnboardingSavePayload["referencePolicy"]) => void;
  onUploadReference: () => void;
  onRefreshReferences: () => void;
  onPromoteSceneCanon: (reference: CharacterReferenceRecord) => void;
  onQueueCanonPortrait: () => void;
  onRunCanonPortrait: () => void;
  onIngestCanonPortrait: () => void;
  onRegisterReference: () => void;
  onPromoteIdentityCanon: (reference: CharacterReferenceRecord) => void;
};

export function CharacterVisualStepPanel({
  draft,
  references,
  referenceForm,
  referenceMessage,
  referencesLoading,
  referenceSaving,
  referenceUploading,
  referenceUploadFile,
  identityCanonCount,
  sceneCanonCount,
  candidateCount,
  rejectedCount,
  visualSceneRows,
  sceneCanonByScene,
  sceneCandidatesByScene,
  canonJob,
  canonPromptPack,
  canonInstructions,
  canonMessage,
  canonSaving,
  canonRunning,
  canonIngesting,
  canonOutputUrl,
  setReferenceForm,
  setReferenceUploadFile,
  setCanonOutputUrl,
  updateReferencePolicy,
  onUploadReference,
  onRefreshReferences,
  onPromoteSceneCanon,
  onQueueCanonPortrait,
  onRunCanonPortrait,
  onIngestCanonPortrait,
  onRegisterReference,
  onPromoteIdentityCanon,
}: CharacterVisualStepPanelProps) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-md border border-emerald-900/70 bg-emerald-950/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-100">
              Add identity image
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-emerald-100/75">
              Start here when you already have a good Diana image from ChatGPT, Comfy, or
              another generator. Register one clean image first; do not use a collage as the
              main identity reference.
            </p>
          </div>
          <span className="rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            Recommended next step
          </span>
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

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="text-sm text-emerald-100/80">
            Image file
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setReferenceUploadFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-md border border-emerald-900/70 bg-surface-raised px-3 py-2 text-gray-100 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <label className="text-sm text-emerald-100/80">
            Save as
            <select
              value={referenceForm.classification}
              onChange={(event) =>
                setReferenceForm((prev) => ({
                  ...prev,
                  classification: event.target.value as CharacterReferenceClassification,
                }))
              }
              className="mt-1 w-full rounded-md border border-emerald-900/70 bg-surface-raised px-3 py-2 text-gray-100"
            >
              <option value="identity-candidate">Identity candidate</option>
              <option value="identity-canon">Identity canon</option>
              <option value="supporting-reference">Supporting reference</option>
              <option value="rejected-reference">Rejected reference</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onUploadReference}
            disabled={referenceUploading || !referenceUploadFile}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {referenceUploading ? "Uploading..." : "Upload image"}
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-sm text-emerald-100/70">
            Optional notes
            <input
              value={referenceForm.reviewNotes}
              onChange={(event) =>
                setReferenceForm((prev) => ({ ...prev, reviewNotes: event.target.value }))
              }
              className="mt-1 w-full rounded-md border border-emerald-900/70 bg-surface-raised px-3 py-2 text-gray-100"
              placeholder="Why this image defines Diana."
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setReferenceForm((prev) => ({
                ...prev,
                classification: "identity-candidate",
                scene: "portrait-canon",
              }))
            }
            className="rounded-md border border-emerald-800/70 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
          >
            Reset to candidate
          </button>
        </div>
        <p className="mt-2 text-xs text-emerald-100/60">
          Upload stores the file in MinIO and registers it as a visual reference. Use
          `Identity candidate` first unless you are sure this is the official face.
        </p>
      </div>

      <div className="rounded-md border border-blue-900/70 bg-blue-950/20 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-100">
          Visual Canon Plan
        </h3>
        <p className="mt-1 text-sm text-blue-100/70">
          Canon is the visual truth source used for generation. Ingest profiles only
          classify incoming files and should not decide creative references.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["identityCanon", "Identity canon"],
              ["sceneCanon", "Scene canon"],
              ["supportingReference", "Supporting references"],
              ["rejectedReference", "Rejected references"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={draft.referencePolicy[key]}
                onChange={(event) =>
                  updateReferencePolicy({
                    ...draft.referencePolicy,
                    [key]: event.target.checked,
                  })
                }
                className="size-4 accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <SceneCanonBoard
        avatar={draft.avatar}
        referencesLoading={referencesLoading}
        referenceSaving={referenceSaving}
        visualSceneRows={visualSceneRows}
        sceneCanonByScene={sceneCanonByScene}
        sceneCandidatesByScene={sceneCandidatesByScene}
        onRefreshReferences={onRefreshReferences}
        onPromoteSceneCanon={onPromoteSceneCanon}
      />

      <CanonPortraitGenerationPanel
        canonJob={canonJob}
        canonPromptPack={canonPromptPack}
        canonInstructions={canonInstructions}
        canonMessage={canonMessage}
        canonSaving={canonSaving}
        canonRunning={canonRunning}
        canonIngesting={canonIngesting}
        canonOutputUrl={canonOutputUrl}
        setCanonOutputUrl={setCanonOutputUrl}
        onQueueCanonPortrait={onQueueCanonPortrait}
        onRunCanonPortrait={onRunCanonPortrait}
        onIngestCanonPortrait={onIngestCanonPortrait}
      />

      <ReferenceIntakePanel
        avatar={draft.avatar}
        scenes={draft.scenes}
        references={references}
        referenceForm={referenceForm}
        referenceMessage={referenceMessage}
        referencesLoading={referencesLoading}
        referenceSaving={referenceSaving}
        identityCanonCount={identityCanonCount}
        sceneCanonCount={sceneCanonCount}
        candidateCount={candidateCount}
        rejectedCount={rejectedCount}
        setReferenceForm={setReferenceForm}
        onRefreshReferences={onRefreshReferences}
        onRegisterReference={onRegisterReference}
        onPromoteIdentityCanon={onPromoteIdentityCanon}
      />
    </div>
  );
}
