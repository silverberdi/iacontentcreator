import { characterTypeBlueprints } from "../data/characterBlueprints";
import type {
  CharacterOnboardingSavePayload,
  CharacterOnboardingStatus,
  CharacterReferenceClassification,
  ReferencePolicy,
} from "../types/characters";

export const STATUS_LABELS: Record<CharacterOnboardingStatus, string> = {
  draft: "Draft",
  "references-needed": "References needed",
  "identity-review": "Identity review",
  "ready-for-tests": "Ready for tests",
  ready: "Ready",
};

export type WizardStepId =
  | "type"
  | "identity"
  | "canon"
  | "visual"
  | "summary";

export type CanonTabId = "overview" | "import" | "conversation" | "document" | "sections" | "approval";

export const WIZARD_STEPS: { id: WizardStepId; label: string; helper: string }[] = [
  { id: "type", label: "Type", helper: "Choose the blueprint." },
  { id: "identity", label: "Identity", helper: "Name and objective only." },
  { id: "canon", label: "Canon", helper: "Build the character truth." },
  { id: "visual", label: "Visual", helper: "Reference strategy." },
  { id: "summary", label: "Summary", helper: "Review operational output." },
];

export const CANON_TABS: { id: CanonTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "import", label: "Import" },
  { id: "conversation", label: "Conversation" },
  { id: "document", label: "Document" },
  { id: "sections", label: "Sections" },
  { id: "approval", label: "Approval" },
];

export const DEFAULT_REFERENCE_POLICY: ReferencePolicy = {
  identityCanon: true,
  sceneCanon: true,
  supportingReference: true,
  rejectedReference: true,
};

export const DEFAULT_CHARACTER: CharacterOnboardingSavePayload = {
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

export const REFERENCE_CLASSIFICATION_OPTIONS: {
  value: CharacterReferenceClassification;
  label: string;
  helper: string;
}[] = [
  {
    value: "identity-canon",
    label: "Identity canon",
    helper: "Main visual truth for the character face and body.",
  },
  {
    value: "identity-candidate",
    label: "Identity candidate",
    helper: "Looks promising but still needs confirmation.",
  },
  {
    value: "scene-canon",
    label: "Scene canon",
    helper: "Approved reference for this character in a specific scene.",
  },
  {
    value: "scene-candidate",
    label: "Scene candidate",
    helper: "Scene-specific reference still under evaluation.",
  },
  {
    value: "supporting-reference",
    label: "Supporting reference",
    helper: "Useful inspiration, but not authoritative.",
  },
  {
    value: "rejected-reference",
    label: "Rejected reference",
    helper: "Known bad image. It is kept as evidence but excluded.",
  },
];

export const EMPTY_REFERENCE_FORM = {
  classification: "identity-candidate" as CharacterReferenceClassification,
  scene: "portrait-canon",
  objectPathOrUrl: "",
  reviewNotes: "",
};

export function joinList(value: string[] | undefined): string {
  return (value ?? []).join(", ");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
