import type {
  CharacterAvatarType,
  CharacterCanonRecord,
  CharacterCanonSection,
  CharacterCanonSectionStatus,
} from "../types/characters";

export const CANON_READINESS_TOPICS = [
  {
    key: "identity",
    label: "Identity",
    matches: ["identity", "overview", "character_core", "canon"],
  },
  {
    key: "psychology",
    label: "Psychology",
    matches: ["psychology", "emotional", "behavior", "private_life", "childhood", "adolescence"],
  },
  {
    key: "appearance",
    label: "Appearance",
    matches: ["appearance", "visual", "visual_dna", "wardrobe", "cinematic", "camera"],
  },
  {
    key: "voice",
    label: "Voice",
    matches: ["voice", "speaking", "caption", "expression", "tone"],
  },
  {
    key: "boundaries",
    label: "Limits",
    matches: ["boundaries", "safety", "limits", "review", "romantic_dynamics"],
  },
  {
    key: "scenes",
    label: "Scenes",
    matches: ["scene", "lifestyle", "social_life", "locations", "present_day"],
  },
  {
    key: "content",
    label: "Content",
    matches: ["content", "positioning", "brand", "music", "references"],
  },
];

export const CANON_TOPIC_GUIDES: Record<
  string,
  {
    prompt: string;
    examples: string[];
  }
> = {
  identity: {
    prompt:
      "Who is this character when nobody is watching? Define origin, current life, emotional center, and what must remain true across every scene.",
    examples: [
      "Where are they from and where do they live now?",
      "What life tension or desire shapes them?",
      "What should never change about their identity?",
    ],
  },
  psychology: {
    prompt:
      "Describe their inner world: fears, attachments, contradictions, wounds, habits, and how they behave under pressure.",
    examples: [
      "What do they want but rarely say directly?",
      "What makes them pull closer or step back?",
      "What contradiction makes them feel human?",
    ],
  },
  appearance: {
    prompt:
      "Define the visual DNA: body, face, styling, wardrobe, sensuality level, camera language, and visual anti-patterns.",
    examples: [
      "How should they look in a portrait?",
      "What clothing, colors, or framing belong to them?",
      "What visual outcomes should be rejected?",
    ],
  },
  voice: {
    prompt:
      "Define how they speak: tone, vocabulary, emotional rhythm, humor, flirting style, and phrases they would avoid.",
    examples: [
      "Are they direct, poetic, playful, reserved?",
      "How do they write a caption?",
      "What sounds out of character?",
    ],
  },
  boundaries: {
    prompt:
      "Define hard limits: safety, intimacy, nudity, claims, emotional dependency, public/private separation, and review triggers.",
    examples: [
      "What can be sensual and what crosses the line?",
      "What must always require human review?",
      "What should the character never promise?",
    ],
  },
  scenes: {
    prompt:
      "Define recurring scenes: where this character appears, what mood each scene carries, and what visual references matter.",
    examples: [
      "What are their 3-5 canonical environments?",
      "Which scenes are public vs private?",
      "What props or settings reinforce identity?",
    ],
  },
  content: {
    prompt:
      "Define what this character publishes: content pillars, formats, audience relationship, monetization posture, and anti-patterns.",
    examples: [
      "What topics can they post about every week?",
      "What does the audience come to them for?",
      "What would make the account feel fake or cheap?",
    ],
  },
};

const OBJECTIVE_READINESS_PROFILES: Record<
  CharacterAvatarType,
  {
    label: string;
    description: string;
    criteria: {
      key: string;
      label: string;
      matches: string[];
      missingHint: string;
    }[];
  }
> = {
  "gfe-bfe": {
    label: "GFE / BFE readiness",
    description:
      "Measures whether the character is safe and specific enough for companion-style emotional intimacy, not just whether the general persona exists.",
    criteria: [
      {
        key: "intimacy_policy",
        label: "Intimacy policy",
        matches: ["intimacy", "intimidad", "romantic", "romant", "sensual", "nudity", "desnudez"],
        missingHint: "Define sensuality, nudity policy, romantic tone, and what crosses the line.",
      },
      {
        key: "dependency_safety",
        label: "Dependency safety",
        matches: ["dependency", "dependencia", "vulnerability", "vulnerab", "loneliness", "soledad", "manipulation"],
        missingHint: "Define anti-dependency rules, vulnerability handling, and non-manipulative behavior.",
      },
      {
        key: "relationship_progression",
        label: "Relationship progression",
        matches: ["progression", "progres", "closeness", "cercania", "trust", "confianza", "relationship"],
        missingHint: "Define how closeness develops, what is earned over time, and what is never promised.",
      },
      {
        key: "public_private_split",
        label: "Public/private split",
        matches: ["public", "private", "premium", "monetization", "monetiz", "subscription", "suscrip"],
        missingHint: "Separate public content, private experience, premium limits, and disclosure rules.",
      },
      {
        key: "audience_eligibility",
        label: "Audience eligibility",
        matches: ["adult", "18", "edad", "eligibility", "eligible", "consent", "consentimiento"],
        missingHint: "Define adult-only handling, consent, eligibility, and disallowed users/situations.",
      },
    ],
  },
  influencer: {
    label: "Influencer readiness",
    description:
      "Measures whether the character can operate as a believable public lifestyle/brand account.",
    criteria: [
      {
        key: "brand_positioning",
        label: "Brand positioning",
        matches: ["brand", "marca", "sponsor", "commercial", "partnership", "collaboration"],
        missingHint: "Define brand fit, sponsorship rules, commercial posture, and forbidden categories.",
      },
      {
        key: "content_calendar",
        label: "Content system",
        matches: ["content", "pillar", "format", "series", "calendar", "platform"],
        missingHint: "Define recurring content pillars, formats, platform behavior, and posting patterns.",
      },
      {
        key: "public_identity",
        label: "Public identity",
        matches: ["public", "audience", "followers", "persona", "online", "presence"],
        missingHint: "Define how the public account behaves, what it reveals, and what remains private.",
      },
      {
        key: "claims_safety",
        label: "Claims safety",
        matches: ["claim", "medical", "wellness", "skincare", "political", "review", "regulated"],
        missingHint: "Define claim boundaries, review triggers, disclosures, and regulated-topic limits.",
      },
      {
        key: "visual_consistency",
        label: "Visual consistency",
        matches: ["visual", "wardrobe", "camera", "style", "aesthetic", "reference"],
        missingHint: "Define recognizable styling, camera language, scenes, and visual anti-patterns.",
      },
    ],
  },
  authority: {
    label: "Authority readiness",
    description:
      "Measures whether the character can publish credible expert content without overclaiming.",
    criteria: [
      {
        key: "expertise_domain",
        label: "Expertise domain",
        matches: ["expertise", "domain", "field", "territory", "knowledge", "credibility"],
        missingHint: "Define what the character is qualified to discuss and where authority comes from.",
      },
      {
        key: "claim_boundaries",
        label: "Claim boundaries",
        matches: ["claim", "citation", "source", "evidence", "regulated", "legal", "financial", "medical"],
        missingHint: "Define citations, factual boundaries, regulated topics, and uncertainty language.",
      },
      {
        key: "trust_posture",
        label: "Trust posture",
        matches: ["trust", "credibility", "humility", "opinion", "disclosure", "transparency"],
        missingHint: "Define credibility posture, humility, disclosure, and how opinion is separated from fact.",
      },
      {
        key: "teaching_style",
        label: "Teaching style",
        matches: ["teaching", "education", "explainer", "framework", "analysis", "advice"],
        missingHint: "Define how the character explains, teaches, analyzes, and structures useful content.",
      },
      {
        key: "professional_visuals",
        label: "Professional visuals",
        matches: ["professional", "office", "studio", "podcast", "event", "visual", "camera"],
        missingHint: "Define visual language, professional scenes, and credibility-building aesthetics.",
      },
    ],
  },
};

function getSectionText(section: CharacterCanonSection): string {
  const fullMarkdown = section.data?.fullMarkdown;
  return [
    section.key,
    section.label,
    section.summary,
    typeof fullMarkdown === "string" ? fullMarkdown : "",
    section.sourceRefs?.join(" ") ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function scoreEvidence(evidenceChars: number) {
  return evidenceChars >= 2500 ? 100 : evidenceChars >= 900 ? 70 : evidenceChars >= 250 ? 40 : evidenceChars > 0 ? 20 : 0;
}

export function topicLabel(topicKey: string): string {
  return CANON_READINESS_TOPICS.find((topic) => topic.key === topicKey)?.label ?? "Canon topic";
}

function sectionMatchesTopic(section: CharacterCanonSection, topicKey: string): boolean {
  const topic = CANON_READINESS_TOPICS.find((item) => item.key === topicKey);
  if (!topic) return false;
  const text = getSectionText(section);
  return topic.matches.some((token) => text.includes(token));
}

export function getTopicEvidence(
  canon: CharacterCanonRecord["canonJson"] | null,
  topicKey: string,
): CharacterCanonSection[] {
  return (canon?.sections ?? []).filter((section) => sectionMatchesTopic(section, topicKey)).slice(0, 4);
}

export function normalizeSectionStatus(status: unknown): CharacterCanonSectionStatus {
  return status === "missing" || status === "draft" || status === "approved"
    ? status
    : "review-needed";
}

export function getCanonTopicProgress(canon: CharacterCanonRecord["canonJson"] | null) {
  const sections = canon?.sections ?? [];
  return CANON_READINESS_TOPICS.map((topic) => {
    const matchedSections = sections.filter((section) => {
      const text = getSectionText(section);
      return topic.matches.some((token) => text.includes(token));
    });
    const evidenceChars = matchedSections.reduce((total, section) => {
      const fullMarkdown = section.data?.fullMarkdown;
      return total + section.summary.length + (typeof fullMarkdown === "string" ? fullMarkdown.length : 0);
    }, 0);
    const score = scoreEvidence(evidenceChars);
    return {
      ...topic,
      score,
      sectionCount: matchedSections.length,
      status: score >= 70 ? "healthy" : score > 0 ? "thin" : "missing",
    };
  });
}

export function getObjectiveReadinessProgress(
  canon: CharacterCanonRecord["canonJson"] | null,
  avatarType: CharacterAvatarType,
) {
  const profile = OBJECTIVE_READINESS_PROFILES[avatarType];
  const sections = canon?.sections ?? [];
  const criteria = profile.criteria.map((criterion) => {
    const matchedSections = sections.filter((section) => {
      const text = getSectionText(section);
      return criterion.matches.some((token) => text.includes(token.toLowerCase()));
    });
    const evidenceChars = matchedSections.reduce((total, section) => {
      const fullMarkdown = section.data?.fullMarkdown;
      return total + section.summary.length + (typeof fullMarkdown === "string" ? fullMarkdown.length : 0);
    }, 0);
    const score = scoreEvidence(evidenceChars);
    return {
      ...criterion,
      score,
      sectionCount: matchedSections.length,
      status: score >= 70 ? "healthy" : score > 0 ? "thin" : "missing",
    };
  });
  const score = Math.round(
    criteria.reduce((total, criterion) => total + criterion.score, 0) / Math.max(criteria.length, 1),
  );
  return {
    ...profile,
    score,
    criteria,
    weakCriteria: criteria.filter((criterion) => criterion.status !== "healthy"),
  };
}

export function readinessBarClass(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
}
