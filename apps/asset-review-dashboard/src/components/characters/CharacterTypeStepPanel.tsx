import {
  characterTypeOptions,
} from "../../data/characterBlueprints";
import type { CharacterAvatarType } from "../../types/characters";

type CharacterTypeStepPanelProps = {
  avatarType: CharacterAvatarType;
  onApplyBlueprint: (avatarType: CharacterAvatarType) => void;
};

export function CharacterTypeStepPanel({
  avatarType,
  onApplyBlueprint,
}: CharacterTypeStepPanelProps) {
  return (
    <div className="mb-5 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Avatar type
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            The type controls starter scenes, tone, limits, review triggers, and later
            generation strategy. It is the opposite of a blank generic form.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onApplyBlueprint(avatarType)}
          className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
        >
          Apply blueprint defaults
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {characterTypeOptions.map((option) => {
          const isActive = avatarType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onApplyBlueprint(option.value)}
              className={`rounded-md border p-3 text-left transition ${
                isActive
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface-raised hover:border-gray-600"
              }`}
            >
              <p className="font-semibold text-gray-100">{option.label}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
