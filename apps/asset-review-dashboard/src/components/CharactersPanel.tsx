import { useEffect, useMemo, useState } from "react";
import {
  listCharacterOnboarding,
  saveCharacterOnboarding,
} from "../api/charactersApi";
import {
  characterTypeBlueprints,
  characterTypeOptions,
} from "../data/characterBlueprints";
import type {
  CharacterAvatarType,
  CharacterOnboardingRecord,
  CharacterOnboardingSavePayload,
  CharacterOnboardingStatus,
  CharacterSceneDraft,
  ReferencePolicy,
} from "../types/characters";

const STATUS_LABELS: Record<CharacterOnboardingStatus, string> = {
  draft: "Draft",
  "references-needed": "References needed",
  "identity-review": "Identity review",
  "ready-for-tests": "Ready for tests",
  ready: "Ready",
};

type WizardStepId =
  | "type"
  | "identity"
  | "voice"
  | "limits"
  | "scenes"
  | "visual"
  | "summary";

const WIZARD_STEPS: { id: WizardStepId; label: string; helper: string }[] = [
  { id: "type", label: "Type", helper: "Choose the blueprint." },
  { id: "identity", label: "Identity", helper: "Name and objective." },
  { id: "voice", label: "Voice", helper: "Pillars, tone, and fit." },
  { id: "limits", label: "Limits", helper: "Rules and review triggers." },
  { id: "scenes", label: "Scenes", helper: "Starter contexts." },
  { id: "visual", label: "Visual", helper: "Canon strategy." },
  { id: "summary", label: "Summary", helper: "Save and continue." },
];

const DEFAULT_REFERENCE_POLICY: ReferencePolicy = {
  identityCanon: true,
  sceneCanon: true,
  supportingReference: true,
  rejectedReference: true,
};

const DEFAULT_CHARACTER: CharacterOnboardingSavePayload = {
  avatar: "",
  avatarType: "influencer",
  avatarShort: "",
  displayName: "",
  businessProfile: characterTypeBlueprints.influencer.businessProfile,
  primaryObjective: characterTypeBlueprints.influencer.primaryObjective,
  contentPillars: characterTypeBlueprints.influencer.contentPillars,
  captionTone: characterTypeBlueprints.influencer.captionTone,
  brandFit: characterTypeBlueprints.influencer.brandFit,
  publishingLimits: characterTypeBlueprints.influencer.publishingLimits,
  reviewTriggers: characterTypeBlueprints.influencer.reviewTriggers,
  referencePolicy: DEFAULT_REFERENCE_POLICY,
  scenes: characterTypeBlueprints.influencer.scenes,
  status: "draft",
  notes: "",
};

function splitList(value: string): string[] {
  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function inferStatus(payload: CharacterOnboardingSavePayload): CharacterOnboardingStatus {
  const profileComplete = Boolean(
    payload.avatar &&
      payload.avatarShort &&
      payload.displayName &&
      payload.businessProfile &&
      payload.primaryObjective &&
      payload.contentPillars.length > 0 &&
      payload.captionTone.length > 0 &&
      payload.brandFit.length > 0,
  );
  const hasScenes = payload.scenes.some((scene) => scene.scene && scene.displayName);
  const hasReferencePlan =
    payload.referencePolicy.identityCanon && payload.referencePolicy.sceneCanon;

  if (profileComplete && hasScenes && hasReferencePlan) return "ready-for-tests";
  if (profileComplete && hasScenes) return "identity-review";
  if (profileComplete) return "references-needed";
  return "draft";
}

function readinessItems(character: CharacterOnboardingRecord | CharacterOnboardingSavePayload) {
  const readiness =
    "readiness" in character
      ? character.readiness
      : {
          profileComplete: inferStatus(character) !== "draft",
          hasScenes: character.scenes.length > 0,
          hasReferencePlan:
            character.referencePolicy.identityCanon && character.referencePolicy.sceneCanon,
          readyForPublication: character.status === "ready",
        };
  return [
    { label: "Profile definition", ok: readiness.profileComplete },
    { label: "Scenes", ok: readiness.hasScenes },
    { label: "Reference canon plan", ok: readiness.hasReferencePlan },
    { label: "Normal publications unlocked", ok: readiness.readyForPublication },
  ];
}

function isStepComplete(step: WizardStepId, draft: CharacterOnboardingSavePayload): boolean {
  switch (step) {
    case "type":
      return Boolean(draft.avatarType);
    case "identity":
      return Boolean(
        draft.displayName && draft.avatar && draft.avatarShort && draft.primaryObjective,
      );
    case "voice":
      return (
        draft.contentPillars.length > 0 &&
        draft.captionTone.length > 0 &&
        draft.brandFit.length > 0
      );
    case "limits":
      return draft.publishingLimits.length > 0 && draft.reviewTriggers.length > 0;
    case "scenes":
      return draft.scenes.some((scene) => scene.scene && scene.displayName);
    case "visual":
      return draft.referencePolicy.identityCanon && draft.referencePolicy.sceneCanon;
    case "summary":
      return inferStatus(draft) !== "draft";
  }
}

type CharactersPanelProps = {
  onCatalogsChanged?: () => void;
};

export default function CharactersPanel({ onCatalogsChanged }: CharactersPanelProps) {
  const [characters, setCharacters] = useState<CharacterOnboardingRecord[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [draft, setDraft] = useState<CharacterOnboardingSavePayload>(DEFAULT_CHARACTER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<WizardStepId>("type");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.avatar === selectedAvatar) ?? null,
    [characters, selectedAvatar],
  );

  const loadCharacters = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await listCharacterOnboarding();
      if (result.ok === false) {
        throw new Error(result.message || result.reason || "Character onboarding could not load.");
      }
      const nextCharacters = result.characters ?? [];
      setCharacters(nextCharacters);
      if (!selectedAvatar && nextCharacters[0]) {
        setSelectedAvatar(nextCharacters[0].avatar);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character onboarding could not load.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCharacters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCharacter) return;
    setDraft({
      avatar: selectedCharacter.avatar,
      avatarType: selectedCharacter.avatarType ?? "influencer",
      avatarShort: selectedCharacter.avatarShort,
      displayName: selectedCharacter.displayName,
      businessProfile: selectedCharacter.businessProfile,
      primaryObjective: selectedCharacter.primaryObjective,
      contentPillars: selectedCharacter.contentPillars,
      captionTone: selectedCharacter.captionTone,
      brandFit: selectedCharacter.brandFit,
      publishingLimits: selectedCharacter.publishingLimits,
      reviewTriggers: selectedCharacter.reviewTriggers ?? [],
      referencePolicy: selectedCharacter.referencePolicy,
      scenes: selectedCharacter.scenes,
      status: selectedCharacter.status,
      notes: selectedCharacter.notes ?? "",
    });
  }, [selectedCharacter]);

  const updateDraft = <K extends keyof CharacterOnboardingSavePayload>(
    key: K,
    value: CharacterOnboardingSavePayload[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const updateScene = (index: number, patch: Partial<CharacterSceneDraft>) => {
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, sceneIndex) =>
        sceneIndex === index ? { ...scene, ...patch } : scene,
      ),
    }));
  };

  const addScene = () => {
    setDraft((prev) => ({
      ...prev,
      scenes: [...prev.scenes, { scene: "", displayName: "", description: "" }],
    }));
  };

  const removeScene = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, sceneIndex) => sceneIndex !== index),
    }));
  };

  const startNewCharacter = () => {
    setSelectedAvatar(null);
    setDraft(DEFAULT_CHARACTER);
    setActiveStep("type");
    setMessage(null);
  };

  const applyBlueprint = (avatarType: CharacterAvatarType) => {
    const blueprint = characterTypeBlueprints[avatarType];
    setDraft((prev) => ({
      ...prev,
      avatarType,
      businessProfile: blueprint.businessProfile,
      primaryObjective: prev.primaryObjective || blueprint.primaryObjective,
      contentPillars: blueprint.contentPillars,
      captionTone: blueprint.captionTone,
      brandFit: blueprint.brandFit,
      publishingLimits: blueprint.publishingLimits,
      reviewTriggers: blueprint.reviewTriggers,
      scenes: prev.scenes.length > 0 ? prev.scenes : blueprint.scenes,
    }));
    setMessage({
      type: "success",
      text: `${blueprint.label} blueprint applied. You can still edit every default.`,
    });
  };

  const save = async () => {
    const nextStatus = draft.status === "ready" ? "ready" : inferStatus(draft);
    const payload = {
      ...draft,
      status: nextStatus,
      avatar: draft.avatar || slugify(draft.displayName),
      avatarShort: draft.avatarShort || slugify(draft.displayName).split("-")[0] || "",
      scenes: draft.scenes
        .map((scene) => ({
          ...scene,
          scene: scene.scene || slugify(scene.displayName),
        }))
        .filter((scene) => scene.scene && scene.displayName),
    };

    if (!payload.avatar || !payload.avatarShort || !payload.displayName) {
      setMessage({
        type: "error",
        text: "Display name, avatar slug, and short handle are required.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const result = await saveCharacterOnboarding(payload);
      if (result.ok === false || !result.character) {
        throw new Error(result.message || result.reason || "Character could not be saved.");
      }
      setSelectedAvatar(result.character.avatar);
      await loadCharacters();
      onCatalogsChanged?.();
      setMessage({ type: "success", text: "Character onboarding saved." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character could not be saved.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const currentReadiness = readinessItems(draft);
  const currentStepIndex = WIZARD_STEPS.findIndex((step) => step.id === activeStep);
  const completedStepCount = WIZARD_STEPS.filter((step) => isStepComplete(step.id, draft)).length;
  const nextRecommendedStep =
    WIZARD_STEPS.find((step) => !isStepComplete(step.id, draft)) ??
    WIZARD_STEPS[WIZARD_STEPS.length - 1];
  const activeBlueprint = characterTypeBlueprints[draft.avatarType];

  const goToPreviousStep = () => {
    const previous = WIZARD_STEPS[Math.max(0, currentStepIndex - 1)];
    if (previous) setActiveStep(previous.id);
  };

  const goToNextStep = () => {
    const next = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, currentStepIndex + 1)];
    if (next) setActiveStep(next.id);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-surface-raised p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Character Onboarding
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-400">
              Define a character from business intent to visual canon readiness. This is the
              operator path; ingest profiles remain only file-import recipes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadCharacters()}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={startNewCharacter}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              New character
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
                : "border-red-800/60 bg-red-950/40 text-red-200"
            }`}
            role="status"
          >
            {message.text}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-border bg-surface-raised p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Characters
          </h3>
          <div className="mt-3 space-y-2">
            {characters.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-gray-500">
                No characters registered yet.
              </p>
            )}
            {characters.map((character) => (
              <button
                key={character.avatar}
                type="button"
                onClick={() => setSelectedAvatar(character.avatar)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  selectedAvatar === character.avatar
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-gray-100">{character.displayName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      character.status === "ready"
                        ? "bg-emerald-900/50 text-emerald-200"
                        : "bg-amber-950/60 text-amber-200"
                    }`}
                  >
                    {STATUS_LABELS[character.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {character.avatar} ·{" "}
                  {characterTypeBlueprints[character.avatarType ?? "influencer"]?.label ??
                    "Influencer"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface-raised p-5">
          <div className="mb-5 rounded-md border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Creation wizard
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {completedStepCount} of {WIZARD_STEPS.length} steps complete. Next:{" "}
                  <span className="text-gray-300">{nextRecommendedStep.label}</span>.
                </p>
              </div>
              <div className="rounded-full border border-border bg-surface-overlay px-3 py-1 text-xs text-gray-300">
                {activeBlueprint.label}
              </div>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-7">
              {WIZARD_STEPS.map((step, index) => {
                const isActive = activeStep === step.id;
                const isComplete = isStepComplete(step.id, draft);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={`rounded-md border p-3 text-left transition ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : isComplete
                          ? "border-emerald-900/70 bg-emerald-950/20"
                          : "border-border bg-surface-raised hover:border-gray-600"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {index + 1}. {step.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-gray-500">{step.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {activeStep === "type" && (
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
                onClick={() => applyBlueprint(draft.avatarType)}
                className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
              >
                Apply blueprint defaults
              </button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {characterTypeOptions.map((option) => {
                const isActive = draft.avatarType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => applyBlueprint(option.value)}
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
          )}

          {activeStep === "identity" && (
            <>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="text-sm text-gray-400">
              Display name
              <input
                value={draft.displayName}
                onChange={(event) => {
                  const displayName = event.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    displayName,
                    avatar: prev.avatar || slugify(displayName),
                    avatarShort: prev.avatarShort || slugify(displayName).split("-")[0] || "",
                  }));
                }}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="Ej: Mariana Sol"
              />
            </label>
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
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-gray-400">
              Business profile
              <input
                value={draft.businessProfile}
                onChange={(event) => updateDraft("businessProfile", event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="influencer-brand"
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

          <label className="mt-4 block text-sm text-gray-400">
            Primary objective
            <textarea
              value={draft.primaryObjective}
              onChange={(event) => updateDraft("primaryObjective", event.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
              placeholder="What this character is meant to create and why."
            />
          </label>
            </>
          )}

          {activeStep === "voice" && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-gray-400">
              Content pillars
              <textarea
                value={joinList(draft.contentPillars)}
                onChange={(event) => updateDraft("contentPillars", splitList(event.target.value))}
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="lifestyle, travel, wellness"
              />
            </label>
            <label className="text-sm text-gray-400">
              Caption tone
              <textarea
                value={joinList(draft.captionTone)}
                onChange={(event) => updateDraft("captionTone", splitList(event.target.value))}
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="warm, reflective, spontaneous"
              />
            </label>
            <label className="text-sm text-gray-400">
              Brand fit
              <textarea
                value={joinList(draft.brandFit)}
                onChange={(event) => updateDraft("brandFit", splitList(event.target.value))}
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="coffee, fashion, urban lifestyle"
              />
            </label>
          </div>
          )}

          {activeStep === "limits" && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="text-sm text-gray-400">
              Publishing limits
              <textarea
                value={joinList(draft.publishingLimits)}
                onChange={(event) =>
                  updateDraft("publishingLimits", splitList(event.target.value))
                }
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="No medical claims, no political endorsements..."
              />
            </label>
            <label className="text-sm text-gray-400">
              Review triggers
              <textarea
                value={joinList(draft.reviewTriggers)}
                onChange={(event) =>
                  updateDraft("reviewTriggers", splitList(event.target.value))
                }
                className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                placeholder="sponsored content, factual claims, intimacy boundaries..."
              />
            </label>
          </div>
          )}

          {activeStep === "visual" && (
          <div className="mt-5 rounded-md border border-blue-900/70 bg-blue-950/20 p-4">
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
                      updateDraft("referencePolicy", {
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
          )}

          {activeStep === "scenes" && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Initial scenes
              </h3>
              <button
                type="button"
                onClick={addScene}
                className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 hover:text-white"
              >
                Add scene
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {draft.scenes.map((scene, index) => (
                <div key={index} className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-3">
                  <input
                    value={scene.displayName}
                    onChange={(event) => {
                      const displayName = event.target.value;
                      updateScene(index, {
                        displayName,
                        scene: scene.scene || slugify(displayName),
                      });
                    }}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                    placeholder="Coffee Rain"
                  />
                  <input
                    value={scene.scene}
                    onChange={(event) => updateScene(index, { scene: slugify(event.target.value) })}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                    placeholder="coffee-rain"
                  />
                  <div className="flex gap-2">
                    <input
                      value={scene.description ?? ""}
                      onChange={(event) =>
                        updateScene(index, { description: event.target.value })
                      }
                      className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                      placeholder="Scene intent"
                    />
                    <button
                      type="button"
                      onClick={() => removeScene(index)}
                      className="rounded-md border border-red-800/70 px-3 py-2 text-sm text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {draft.scenes.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-gray-500">
                  Add at least one scene before testing normal publication jobs.
                </p>
              )}
            </div>
          </div>
          )}

          {activeStep === "summary" && (
            <>
          <label className="mt-4 block text-sm text-gray-400">
            Notes
            <textarea
              value={draft.notes ?? ""}
              onChange={(event) => updateDraft("notes", event.target.value)}
              className="mt-1 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
              placeholder="Operator notes, pending decisions, caveats."
            />
          </label>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {currentReadiness.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    item.ok
                      ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                      : "border-border bg-surface text-gray-400"
                  }`}
                >
                  <span className="font-semibold">{item.ok ? "Ready" : "Missing"}</span>
                  <p className="mt-1 text-xs">{item.label}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save character"}
            </button>
          </div>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
              className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 disabled:opacity-40"
            >
              Previous
            </button>
            <div className="text-sm text-gray-500">
              {isStepComplete(activeStep, draft)
                ? "This step has enough information."
                : "This step still needs attention."}
            </div>
            {activeStep === "summary" ? (
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save character"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Next
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
