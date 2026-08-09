import {
  STATUS_LABELS,
  slugify,
} from "../../domain/characterOnboardingModel";
import type {
  CharacterOnboardingSavePayload,
  CharacterOnboardingStatus,
} from "../../types/characters";

type CharacterIdentityStepPanelProps = {
  draft: CharacterOnboardingSavePayload;
  setDraft: (updater: (prev: CharacterOnboardingSavePayload) => CharacterOnboardingSavePayload) => void;
  updateDraft: <K extends keyof CharacterOnboardingSavePayload>(
    key: K,
    value: CharacterOnboardingSavePayload[K],
  ) => void;
};

export function CharacterIdentityStepPanel({
  draft,
  setDraft,
  updateDraft,
}: CharacterIdentityStepPanelProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm text-gray-400">
          Display name
          <input
            value={draft.displayName}
            onChange={(event) => {
              const displayName = event.target.value;
              const previousSlug = slugify(draft.displayName);
              const nextSlug = slugify(displayName);
              setDraft((prev) => ({
                ...prev,
                displayName,
                avatar: !prev.avatar || prev.avatar === previousSlug ? nextSlug : prev.avatar,
                avatarShort:
                  !prev.avatarShort || prev.avatarShort === previousSlug.split("-")[0]
                    ? nextSlug.split("-")[0] || ""
                    : prev.avatarShort,
              }));
            }}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
            placeholder="Ej: Mariana Sol"
          />
        </label>
        <label className="text-sm text-gray-400">
          Business profile
          <input
            value={draft.businessProfile}
            onChange={(event) => updateDraft("businessProfile", event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
            placeholder="influencer-brand"
          />
        </label>
      </div>

      <details className="mt-4 rounded-md border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-300">
          Technical identity fields
        </summary>
        <p className="mt-2 text-xs text-gray-500">
          These are generated from the display name. Edit only if you need a specific internal id.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="text-sm text-gray-400">
            Avatar slug
            <input
              value={draft.avatar}
              onChange={(event) => updateDraft("avatar", slugify(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
              placeholder="mariana-sol"
            />
          </label>
          <label className="text-sm text-gray-400">
            Short handle
            <input
              value={draft.avatarShort}
              onChange={(event) => updateDraft("avatarShort", slugify(event.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
              placeholder="mariana"
            />
          </label>
          <label className="text-sm text-gray-400">
            Onboarding status
            <select
              value={draft.status}
              onChange={(event) =>
                updateDraft("status", event.target.value as CharacterOnboardingStatus)
              }
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <label className="mt-4 block text-sm text-gray-400">
        Initial objective
        <textarea
          value={draft.primaryObjective}
          onChange={(event) => updateDraft("primaryObjective", event.target.value)}
          className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
          placeholder="Optional seed for Canon. The durable version is refined in the Canon step."
        />
      </label>
    </>
  );
}
