import type {
  CharacterAvatarType,
  CharacterSceneDraft,
} from "../types/characters";

export type CharacterTypeBlueprint = {
  type: CharacterAvatarType;
  label: string;
  description: string;
  businessProfile: string;
  primaryObjective: string;
  contentPillars: string[];
  captionTone: string[];
  brandFit: string[];
  publishingLimits: string[];
  reviewTriggers: string[];
  scenes: CharacterSceneDraft[];
};

export const characterTypeBlueprints: Record<CharacterAvatarType, CharacterTypeBlueprint> = {
  influencer: {
    type: "influencer",
    label: "Influencer",
    description:
      "Lifestyle, brand affinity, social proof, and platform-native content with commercial review triggers.",
    businessProfile: "influencer-brand",
    primaryObjective:
      "Build audience affinity through believable lifestyle content and create opportunities for brand collaborations.",
    contentPillars: ["lifestyle", "travel", "wellness", "social life", "personal reflections"],
    captionTone: ["warm", "casual", "spontaneous", "lightly reflective", "brand-safe"],
    brandFit: ["coffee", "travel", "wellness", "fashion", "urban lifestyle", "music"],
    publishingLimits: [
      "Review sponsored content before publishing",
      "Avoid medical, skincare, or wellness claims without review",
      "Avoid strong sensual framing unless explicitly approved",
      "Keep paid partnership disclosures visible when applicable",
    ],
    reviewTriggers: [
      "sponsored content",
      "wellness or skincare claims",
      "identity changes",
      "strong sensual framing",
      "public posts",
    ],
    scenes: [
      {
        scene: "portrait-canon",
        displayName: "Portrait Canon",
        description: "Clean identity portrait used as global visual anchor.",
      },
      {
        scene: "coffee-lifestyle",
        displayName: "Coffee Lifestyle",
        description: "Warm lifestyle moment suitable for affinity-building posts.",
      },
      {
        scene: "city-walk",
        displayName: "City Walk",
        description: "Urban candid scene with natural movement and fashion context.",
      },
      {
        scene: "travel-transition",
        displayName: "Travel Transition",
        description: "Airport, station, or travel day moment for aspirational content.",
      },
    ],
  },
  "gfe-bfe": {
    type: "gfe-bfe",
    label: "GFE / BFE",
    description:
      "Relational companion persona with warmer intimacy, stricter boundaries, and careful public/private framing.",
    businessProfile: "relationship-companion",
    primaryObjective:
      "Create emotionally warm, respectful companion-style content while preserving clear safety, intimacy, and platform boundaries.",
    contentPillars: ["emotional warmth", "daily closeness", "conversation", "comfort", "soft lifestyle"],
    captionTone: ["gentle", "attentive", "personal", "reassuring", "boundary-aware"],
    brandFit: ["coffee", "quiet evenings", "self-care", "music", "cozy spaces", "conversation"],
    publishingLimits: [
      "No explicit sexual content",
      "Avoid manipulative emotional dependency",
      "Keep public posts platform-safe and non-exploitative",
      "Review intimacy, loneliness, or vulnerable-user framing",
      "Avoid health, therapy, or crisis-support claims",
    ],
    reviewTriggers: [
      "intimate framing",
      "parasocial dependency risk",
      "loneliness or vulnerability",
      "private-message callouts",
      "public posts with suggestive tone",
    ],
    scenes: [
      {
        scene: "portrait-canon",
        displayName: "Portrait Canon",
        description: "Soft, trustworthy identity portrait used as global anchor.",
      },
      {
        scene: "cozy-message",
        displayName: "Cozy Message",
        description: "Warm indoor scene that feels conversational and safe.",
      },
      {
        scene: "rain-window",
        displayName: "Rain Window",
        description: "Reflective quiet moment with gentle emotional tone.",
      },
      {
        scene: "coffee-chat",
        displayName: "Coffee Chat",
        description: "Casual companion-style coffee scene with approachable energy.",
      },
    ],
  },
  authority: {
    type: "authority",
    label: "Authority",
    description:
      "Expert or thought-leader persona focused on trust, education, clarity, and careful claim boundaries.",
    businessProfile: "authority-brand",
    primaryObjective:
      "Build trust through useful expert content, clear explanations, and a consistent professional point of view.",
    contentPillars: ["education", "analysis", "practical advice", "industry context", "opinion"],
    captionTone: ["clear", "credible", "direct", "thoughtful", "useful"],
    brandFit: ["books", "workshops", "office", "events", "podcasts", "professional tools"],
    publishingLimits: [
      "Review legal, medical, financial, or regulated claims",
      "Avoid unverifiable credentials",
      "Distinguish opinion from factual claims",
      "Use citations or source notes when needed",
      "Avoid impersonating real experts or institutions",
    ],
    reviewTriggers: [
      "regulated advice",
      "credential claims",
      "statistics or factual claims",
      "news or current events",
      "brand or institution mentions",
    ],
    scenes: [
      {
        scene: "portrait-canon",
        displayName: "Portrait Canon",
        description: "Professional identity portrait used as global visual anchor.",
      },
      {
        scene: "studio-explainer",
        displayName: "Studio Explainer",
        description: "Clean educational scene for direct-to-camera explanation.",
      },
      {
        scene: "desk-analysis",
        displayName: "Desk Analysis",
        description: "Focused work scene for practical or analytical posts.",
      },
      {
        scene: "event-talk",
        displayName: "Event Talk",
        description: "Professional talk or panel setting for authority positioning.",
      },
    ],
  },
};

export const characterTypeOptions = Object.values(characterTypeBlueprints).map((blueprint) => ({
  value: blueprint.type,
  label: blueprint.label,
  description: blueprint.description,
}));
