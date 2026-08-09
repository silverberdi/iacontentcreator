import type {
  CharacterCanonRecord,
  CharacterCanonSection,
  CharacterOnboardingSavePayload,
} from "../types/characters";
import { joinList, slugify } from "./characterOnboardingModel";
import { topicLabel } from "./characterCanonReadiness";

export function buildImportedCanon(
  draft: CharacterOnboardingSavePayload,
  importName: string,
  markdownInput: string,
): CharacterCanonRecord["canonJson"] {
  const chunks = markdownInput
    .split(/\n(?=#{1,2}\s+)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const sections = (chunks.length ? chunks : [markdownInput.trim()]).map((chunk, index) => {
    const firstLine = chunk.split("\n").find((line) => line.trim()) ?? `Imported section ${index + 1}`;
    const label = firstLine.replace(/^#+\s*/, "").trim().slice(0, 90) || `Imported section ${index + 1}`;
    const keyBase = slugify(label) || `imported-section-${index + 1}`;
    const summary = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("---"))
      .slice(0, 5)
      .join(" ")
      .slice(0, 700);
    return {
      key: `${keyBase}-${index + 1}`,
      label,
      status: "review-needed" as const,
      summary: summary || "Imported canon section needs review.",
      data: {
        sourcePath: importName || "operator-import",
        fullMarkdown: chunk,
      },
      sourceRefs: [importName || "operator-import"],
    };
  });

  return {
    avatar: draft.avatar || slugify(draft.displayName),
    avatarType: draft.avatarType,
    displayName: draft.displayName,
    sections,
    source: {
      kind: "markdown-import",
      importedFrom: [importName || "operator-import"],
      importedAt: new Date().toISOString(),
    },
  };
}

export function applyCanonTopicAnswer(
  baseCanon: CharacterCanonRecord["canonJson"] | null,
  draft: CharacterOnboardingSavePayload,
  topicKey: string,
  answer: string,
): CharacterCanonRecord["canonJson"] {
  const answerText = answer.trim();
  const label = topicLabel(topicKey);
  const key = `guided_${topicKey}`;
  const now = new Date().toISOString();
  const base = baseCanon ?? buildCanonProposal(draft, "");
  const existingIndex = base.sections.findIndex((section) => section.key === key);
  const existing = existingIndex >= 0 ? base.sections[existingIndex] : null;
  const previousMarkdown =
    existing && typeof existing.data.fullMarkdown === "string" ? existing.data.fullMarkdown : "";
  const fullMarkdown = [
    previousMarkdown,
    `## Operator answer - ${now}`,
    "",
    answerText,
  ]
    .filter(Boolean)
    .join("\n\n");
  const nextSection: CharacterCanonSection = {
    key,
    label,
    status: "review-needed",
    summary: answerText.slice(0, 700),
    data: {
      topic: topicKey,
      fullMarkdown,
      updatedAt: now,
    },
    sourceRefs: ["guided-canon-conversation"],
  };

  const sections =
    existingIndex >= 0
      ? base.sections.map((section, index) => (index === existingIndex ? nextSection : section))
      : [...base.sections, nextSection];

  return {
    ...base,
    avatar: draft.avatar || base.avatar || slugify(draft.displayName),
    avatarType: draft.avatarType,
    displayName: draft.displayName || base.displayName,
    sections,
    source: {
      kind: "conversation",
      importedFrom: base.source?.importedFrom ?? [],
      importedAt: base.source?.importedAt ?? now,
    },
  };
}

export function compactLongOperatorAnswer(answer: string) {
  const text = answer.trim();
  const maxDirectChars = 4500;
  if (text.length <= maxDirectChars) {
    return {
      isLong: false,
      message: text,
    };
  }
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const signalLines = lines
    .filter((line) =>
      /%|falta|gap|riesgo|recomend|fortaleza|debilidad|gfe|bfe|canon|identidad|visual|limite|límite|intimidad/i.test(
        line,
      ),
    )
    .slice(0, 24);
  const head = text.slice(0, 2200);
  const tail = text.slice(-1800);
  return {
    isLong: true,
    message: [
      "The operator provided a long answer, possibly developed with another AI assistant.",
      "Treat it as the operator's answer to this turn, not as a separate imported document.",
      "Use the compacted evidence below to continue the conversation and update canon sections.",
      "",
      `Original length: ${text.length} characters.`,
      "",
      "Detected signal lines:",
      signalLines.length ? signalLines.map((line) => `- ${line}`).join("\n") : "- No explicit signal lines detected.",
      "",
      "Opening excerpt:",
      head,
      "",
      "Closing excerpt:",
      tail,
    ].join("\n"),
  };
}

export function buildCanonMarkdown(sections: CharacterCanonSection[]): string {
  return sections
    .map((section) => {
      const source = section.sourceRefs?.length
        ? `\n\nSource refs: ${section.sourceRefs.join(", ")}`
        : "";
      return `## ${section.label}\n\n${section.summary}${source}`;
    })
    .join("\n\n");
}

export function buildCanonProposal(
  draft: CharacterOnboardingSavePayload,
  conversationNotes: string,
): CharacterCanonRecord["canonJson"] {
  const baseSource = conversationNotes.trim()
    ? ["operator-conversation-notes"]
    : ["onboarding-fields"];
  const sections: CharacterCanonSection[] = [
    {
      key: "identity",
      label: "Identity",
      status: draft.displayName && draft.primaryObjective ? "review-needed" : "missing",
      summary: `${draft.displayName || "Unnamed character"} exists to ${draft.primaryObjective || "define a clear creative objective"}.`,
      data: {
        displayName: draft.displayName,
        businessProfile: draft.businessProfile,
        primaryObjective: draft.primaryObjective,
      },
      sourceRefs: baseSource,
    },
    {
      key: "voice",
      label: "Voice And Tone",
      status: draft.captionTone.length ? "review-needed" : "missing",
      summary: `Voice should feel ${joinList(draft.captionTone) || "not defined yet"}.`,
      data: {
        captionTone: draft.captionTone,
        contentPillars: draft.contentPillars,
      },
      sourceRefs: baseSource,
    },
    {
      key: "boundaries",
      label: "Boundaries And Safety",
      status: draft.publishingLimits.length || draft.reviewTriggers.length ? "review-needed" : "missing",
      summary: `Publishing limits: ${joinList(draft.publishingLimits) || "pending"}. Review triggers: ${joinList(draft.reviewTriggers) || "pending"}.`,
      data: {
        publishingLimits: draft.publishingLimits,
        reviewTriggers: draft.reviewTriggers,
      },
      sourceRefs: baseSource,
    },
    {
      key: "visual_dna",
      label: "Visual DNA",
      status: draft.brandFit.length ? "review-needed" : "missing",
      summary: `Visual brand fit: ${joinList(draft.brandFit) || "pending"}.`,
      data: {
        brandFit: draft.brandFit,
        referencePolicy: draft.referencePolicy,
      },
      sourceRefs: baseSource,
    },
    {
      key: "scenes",
      label: "Scenes",
      status: draft.scenes.length ? "review-needed" : "missing",
      summary: `Starter scenes: ${draft.scenes.map((scene) => scene.displayName || scene.scene).join(", ") || "pending"}.`,
      data: {
        scenes: draft.scenes,
      },
      sourceRefs: baseSource,
    },
    {
      key: "operator_conversation",
      label: "Operator Conversation",
      status: conversationNotes.trim() ? "review-needed" : "missing",
      summary: conversationNotes.trim() || "No conversational nuance captured yet.",
      data: {
        notes: conversationNotes.trim(),
      },
      sourceRefs: ["operator-input"],
    },
  ];

  if (draft.avatarType === "gfe-bfe") {
    sections.push({
      key: "relationship_dynamics",
      label: "Relationship Dynamics",
      status: "review-needed",
      summary:
        "Define intimacy, sensuality, public/private separation, emotional dependency risk, nudity policy, and premium boundaries before publication.",
      data: {
        requiredControls: [
          "intimacyLevel",
          "sensualityLevel",
          "nudityPolicy",
          "publicPrivateSeparation",
          "emotionalDependencyRisk",
          "premiumBoundaries",
        ],
      },
      sourceRefs: ["gfe-bfe-blueprint"],
    });
  }

  if (draft.avatarType === "authority") {
    sections.push({
      key: "authority_model",
      label: "Authority Model",
      status: "review-needed",
      summary:
        "Define expertise domain, credibility posture, claim boundaries, citation expectations, and trust-building patterns.",
      data: {
        requiredControls: [
          "expertiseDomain",
          "credibilityPosture",
          "claimBoundaries",
          "citationExpectations",
          "trustPatterns",
        ],
      },
      sourceRefs: ["authority-blueprint"],
    });
  }

  return {
    avatar: draft.avatar || slugify(draft.displayName),
    avatarType: draft.avatarType,
    displayName: draft.displayName,
    sections,
    source: {
      kind: "conversation",
      importedFrom: [],
      importedAt: new Date().toISOString(),
    },
  };
}
