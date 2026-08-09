import { useEffect, useMemo, useState } from "react";
import {
  chatCharacterCanon,
  ingestCanonPortraitOutput,
  listCharacterCanons,
  listCharacterOnboarding,
  queueCanonPortraitGeneration,
  runCanonPortraitGeneration,
  saveCharacterCanon,
  saveCharacterOnboarding,
} from "../api/charactersApi";
import {
  characterTypeBlueprints,
} from "../data/characterBlueprints";
import {
  DEFAULT_CHARACTER,
  STATUS_LABELS,
  WIZARD_STEPS,
  hashString,
  inferStatus,
  isStepComplete,
  readinessItems,
  slugify,
  type CanonTabId,
  type WizardStepId,
} from "../domain/characterOnboardingModel";
import {
  applyCanonTopicAnswer,
  buildCanonMarkdown,
  buildCanonProposal,
  buildImportedCanon,
  compactLongOperatorAnswer,
} from "../domain/characterCanonBuilder";
import { CanonApprovalPanel } from "./characters/CanonApprovalPanel";
import { CanonConversationPanel } from "./characters/CanonConversationPanel";
import { CanonDocumentPanel } from "./characters/CanonDocumentPanel";
import { CanonImportPanel } from "./characters/CanonImportPanel";
import { CanonSectionsPanel } from "./characters/CanonSectionsPanel";
import { CanonWorkspaceShell } from "./characters/CanonWorkspaceShell";
import { CharacterIdentityStepPanel } from "./characters/CharacterIdentityStepPanel";
import { CharacterSummaryPanel } from "./characters/CharacterSummaryPanel";
import { CharacterTypeStepPanel } from "./characters/CharacterTypeStepPanel";
import { CharacterVisualStepPanel } from "./characters/CharacterVisualStepPanel";
import { useCharacterReferences } from "../hooks/useCharacterReferences";
import {
  CANON_TOPIC_GUIDES,
  getCanonTopicProgress,
  getObjectiveReadinessProgress,
  getTopicEvidence,
  normalizeSectionStatus,
  topicLabel,
} from "../domain/characterCanonReadiness";
import type {
  CharacterAvatarType,
  CharacterCanonRecord,
  CharacterCanonSection,
  CharacterCanonChatResponse,
  CharacterOnboardingRecord,
  CharacterOnboardingSavePayload,
  CharacterCanonPortraitJob,
  CharacterCanonPortraitPromptPack,
  CharacterReferenceRecord,
} from "../types/characters";

function isImportWrapperSection(section: CharacterCanonSection) {
  const fullMarkdown = typeof section.data.fullMarkdown === "string" ? section.data.fullMarkdown : "";
  return /\.md$/i.test(section.label.trim()) && fullMarkdown.length < 120;
}

type CharactersPanelProps = {
  onCatalogsChanged?: () => void;
};

export default function CharactersPanel({ onCatalogsChanged }: CharactersPanelProps) {
  const [characters, setCharacters] = useState<CharacterOnboardingRecord[]>([]);
  const [canons, setCanons] = useState<CharacterCanonRecord[]>([]);
  const [approvedCanon, setApprovedCanon] = useState<CharacterCanonRecord | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [draft, setDraft] = useState<CharacterOnboardingSavePayload>(DEFAULT_CHARACTER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    references,
    referencesLoading,
    referenceSaving,
    referenceUploading,
    referenceUploadFile,
    referenceForm,
    referenceMessage,
    setReferenceForm,
    setReferenceUploadFile,
    loadReferences,
    clearReferences,
    registerReference,
    uploadAndRegisterReference,
    promoteReferenceToIdentityCanon,
    promoteReferenceToSceneCanon,
  } = useCharacterReferences();
  const [canonSaving, setCanonSaving] = useState(false);
  const [canonRunning, setCanonRunning] = useState(false);
  const [canonIngesting, setCanonIngesting] = useState(false);
  const [canonJob, setCanonJob] = useState<CharacterCanonPortraitJob | null>(null);
  const [canonPromptPack, setCanonPromptPack] =
    useState<CharacterCanonPortraitPromptPack | null>(null);
  const [canonInstructions, setCanonInstructions] = useState<string[]>([]);
  const [canonOutputUrl, setCanonOutputUrl] = useState("");
  const [canonConversationNotes, setCanonConversationNotes] = useState("");
  const [canonActiveTopic, setCanonActiveTopic] = useState("identity");
  const [canonTopicAnswer, setCanonTopicAnswer] = useState("");
  const [canonChatHistory, setCanonChatHistory] = useState<
    Array<{ role: "operator" | "assistant"; content: string }>
  >([]);
  const [canonAssistantMessage, setCanonAssistantMessage] = useState("");
  const [canonSuggestedQuestions, setCanonSuggestedQuestions] = useState<string[]>([]);
  const [canonChatLoading, setCanonChatLoading] = useState(false);
  const [canonTab, setCanonTab] = useState<CanonTabId>("overview");
  const [canonDetailModal, setCanonDetailModal] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [canonImportName, setCanonImportName] = useState("");
  const [canonImportText, setCanonImportText] = useState("");
  const [canonImporting, setCanonImporting] = useState(false);
  const [canonProposal, setCanonProposal] =
    useState<CharacterCanonRecord["canonJson"] | null>(null);
  const [activeStep, setActiveStep] = useState<WizardStepId>("type");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [canonMessage, setCanonMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deepCanonMessage, setDeepCanonMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.avatar === selectedAvatar) ?? null,
    [characters, selectedAvatar],
  );
  const reviewCanon = canons.find((canon) => canon.status !== "superseded") ?? null;
  const draftCanon = useMemo(() => buildCanonProposal(draft, canonConversationNotes), [draft, canonConversationNotes]);
  const visibleCanon =
    canonProposal ??
    approvedCanon?.canonJson ??
    reviewCanon?.canonJson ??
    (activeStep === "canon" ? draftCanon : null);
  const visibleCanonRecord = approvedCanon ?? reviewCanon;
  const visibleCanonSections = visibleCanon?.sections.filter((section) => !isImportWrapperSection(section)) ?? [];
  const hiddenImportWrapperCount = (visibleCanon?.sections.length ?? 0) - visibleCanonSections.length;
  const visibleCanonMarkdown = useMemo(() => {
    const persisted = visibleCanonRecord?.canonMarkdown?.trim();
    if (persisted) return persisted;
    if (visibleCanonSections.length > 0) return buildCanonMarkdown(visibleCanonSections);
    return "";
  }, [visibleCanonRecord?.canonMarkdown, visibleCanonSections]);
  const hasAnyCanon = Boolean(visibleCanon);
  const canonTopicProgress = useMemo(() => getCanonTopicProgress(visibleCanon), [visibleCanon]);
  const canonReadinessScore = Math.round(
    canonTopicProgress.reduce((total, topic) => total + topic.score, 0) /
      Math.max(canonTopicProgress.length, 1),
  );
  const objectiveReadiness = useMemo(
    () => getObjectiveReadinessProgress(visibleCanon, draft.avatarType),
    [visibleCanon, draft.avatarType],
  );
  const missingCanonTopics = canonTopicProgress.filter((topic) => topic.status !== "healthy");
  const activeCanonGuide = hasAnyCanon
    ? CANON_TOPIC_GUIDES[canonActiveTopic] ?? CANON_TOPIC_GUIDES.identity
    : {
        prompt:
          "Let's build this character from zero. Who is this character and what should they make people feel?",
        examples: [
          "What is their emotional center?",
          "What is their purpose as a digital character?",
          "What should never change about them?",
        ],
      };
  const activeTopicEvidence = useMemo(
    () => getTopicEvidence(visibleCanon, canonActiveTopic),
    [visibleCanon, canonActiveTopic],
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

  useEffect(() => {
    if (!selectedAvatar) {
      clearReferences();
      setCanons([]);
      setApprovedCanon(null);
      return;
    }
    void loadReferences(selectedAvatar);
    void loadCanons(selectedAvatar);
  }, [selectedAvatar]);

  const loadCanons = async (avatar: string) => {
    try {
      const result = await listCharacterCanons({ avatar });
      if (result.ok === false) {
        throw new Error(result.message || result.reason || "Character canon could not load.");
      }
      const nextCanons = result.canons ?? [];
      setCanons(nextCanons);
      setApprovedCanon(result.approvedCanon ?? null);
      const latestReviewCanon = nextCanons.find((canon) => canon.status !== "superseded") ?? null;
      if (latestReviewCanon) {
        setCanonProposal(latestReviewCanon.canonJson);
        setCanonConversationNotes(latestReviewCanon.conversationSummary ?? "");
        const assistantMatch = latestReviewCanon.conversationSummary?.match(/Assistant:\s*([\s\S]*)$/);
        setCanonAssistantMessage(assistantMatch?.[1]?.trim() ?? "");
        setCanonSuggestedQuestions([]);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character canon could not load.";
      setDeepCanonMessage({ type: "error", text });
    }
  };

  const updateDraft = <K extends keyof CharacterOnboardingSavePayload>(
    key: K,
    value: CharacterOnboardingSavePayload[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const startNewCharacter = () => {
    setSelectedAvatar(null);
    setDraft(DEFAULT_CHARACTER);
    setCanons([]);
    setApprovedCanon(null);
    clearReferences();
    setCanonJob(null);
    setCanonPromptPack(null);
    setCanonInstructions([]);
    setCanonOutputUrl("");
    setCanonConversationNotes("");
    setCanonActiveTopic("identity");
    setCanonTopicAnswer("");
    setCanonChatHistory([]);
    setCanonAssistantMessage("");
    setCanonSuggestedQuestions([]);
    setCanonChatLoading(false);
    setCanonTab("overview");
    setCanonDetailModal(null);
    setCanonImportName("");
    setCanonImportText("");
    setCanonProposal(null);
    setActiveStep("type");
    setMessage(null);
    setCanonMessage(null);
    setDeepCanonMessage(null);
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

  const save = async (options: { silent?: boolean } = {}) => {
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
        text: "Display name is required to create the character draft.",
      });
      return false;
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
      if (!options.silent) {
        setMessage({ type: "success", text: "Character onboarding saved." });
      }
      return true;
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character could not be saved.";
      setMessage({ type: "error", text });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const queueCanonPortrait = async () => {
    const payloadAvatar = draft.avatar || slugify(draft.displayName);
    if (!payloadAvatar || !draft.displayName || !draft.primaryObjective) {
      setCanonMessage({
        type: "error",
        text: "Define display name, avatar slug, and primary objective before generating canon portraits.",
      });
      return;
    }

    setCanonSaving(true);
    setCanonMessage(null);
    try {
      const result = await queueCanonPortraitGeneration({
        avatar: payloadAvatar,
        displayName: draft.displayName,
        avatarType: draft.avatarType,
        businessProfile: draft.businessProfile,
        primaryObjective: draft.primaryObjective,
        contentPillars: draft.contentPillars,
        captionTone: draft.captionTone,
        brandFit: draft.brandFit,
        publishingLimits: draft.publishingLimits,
        reviewTriggers: draft.reviewTriggers,
        approvedCanon,
        notes: draft.notes,
      });
      if (result.ok === false || !result.job?.jobId) {
        throw new Error(result.message || result.reason || result.error || "Canon portrait job was not queued.");
      }
      setCanonJob(result.job);
      setCanonPromptPack(result.promptPack ?? null);
      setCanonInstructions([]);
      setCanonMessage({
        type: "success",
        text: "Canon portrait job queued. Run it when you are ready to generate candidates.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Canon portrait job was not queued.";
      setCanonMessage({ type: "error", text });
    } finally {
      setCanonSaving(false);
    }
  };

  const buildDeepCanonProposal = () => {
    const base = visibleCanon ?? buildCanonProposal(draft, "");
    const proposal = canonConversationNotes.trim()
      ? applyCanonTopicAnswer(base, draft, "operator_notes", canonConversationNotes)
      : base;
    setCanonProposal(proposal);
    setDeepCanonMessage({
      type: "success",
      text: "Canon proposal updated from the current character definition and conversation notes.",
    });
  };

  const mergeAiSectionUpdates = (
    baseCanon: CharacterCanonRecord["canonJson"],
    response: CharacterCanonChatResponse,
  ): CharacterCanonRecord["canonJson"] => {
    const updates = Array.isArray(response.sectionUpdates) ? response.sectionUpdates : [];
    if (!updates.length) return baseCanon;
    const sections = [...baseCanon.sections];
    updates.forEach((update, index) => {
      const key = update.key || `ai_update_${Date.now()}_${index}`;
      const nextSection: CharacterCanonSection = {
        ...update,
        key,
        label: update.label || topicLabel(canonActiveTopic),
        status: normalizeSectionStatus(update.status),
        summary: update.summary || "",
        data: update.data && typeof update.data === "object" ? update.data : {},
        sourceRefs: update.sourceRefs?.length ? update.sourceRefs : ["deepseek-canon-chat"],
        providerTrace: update.providerTrace || response.providerTrace || null,
      };
      const existingIndex = sections.findIndex((section) => section.key === key);
      if (existingIndex >= 0) {
        sections[existingIndex] = nextSection;
      } else {
        sections.push(nextSection);
      }
    });
    return {
      ...baseCanon,
      sections,
      providerTrace: response.providerTrace || baseCanon.providerTrace,
    };
  };

  const applyGuidedCanonAnswer = async () => {
    if (!canonTopicAnswer.trim()) {
      setDeepCanonMessage({ type: "error", text: "Write an answer before updating the canon proposal." });
      return;
    }
    const compactedAnswer = compactLongOperatorAnswer(canonTopicAnswer);
    const operatorMessage = [
      `Topic: ${hasAnyCanon ? topicLabel(canonActiveTopic) : "Foundation"}`,
      compactedAnswer.message,
    ].join("\n\n");
    setCanonChatLoading(true);
    setDeepCanonMessage(null);
    let deepSeekResponded = false;
    let locallySavedCanon: CharacterCanonRecord | null = null;
    const saveConversationProposal = async (proposal: CharacterCanonRecord["canonJson"], assistantMessage = "") => {
      const markdown = buildCanonMarkdown(proposal.sections);
      const result = await saveCharacterCanon({
        avatar: proposal.avatar,
        avatarType: proposal.avatarType,
        displayName: proposal.displayName,
        status: "operator-reviewed",
        schemaVersion: "character-canon-v1",
        canonJson: proposal,
        canonMarkdown: markdown,
        conversationSummary: [
          canonConversationNotes.trim(),
          `### ${topicLabel(canonActiveTopic)}`,
          canonTopicAnswer.trim(),
          assistantMessage ? `Assistant: ${assistantMessage}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        importSummary: "Autosaved from guided canon conversation.",
      });
      if (result.ok === false || !result.canon) {
        throw new Error(result.message || result.reason || "Canon conversation could not be saved.");
      }
      setCanonProposal(result.canon.canonJson);
      await loadCanons(proposal.avatar);
      return result.canon;
    };
    try {
      const operatorProposal = applyCanonTopicAnswer(visibleCanon, draft, canonActiveTopic, canonTopicAnswer);
      locallySavedCanon = await saveConversationProposal(operatorProposal);
      setDeepCanonMessage({
        type: "success",
        text: `Answer saved as canon proposal v${locallySavedCanon.canonVersion}. Analyzing with DeepSeek now...`,
      });
      const response = await chatCharacterCanon({
        avatar: draft.avatar || slugify(draft.displayName),
        avatarType: draft.avatarType,
        displayName: draft.displayName,
        currentCanon: locallySavedCanon.canonJson,
        conversation: canonChatHistory,
        operatorMessage,
      });
      deepSeekResponded = true;
      const proposal = mergeAiSectionUpdates(locallySavedCanon.canonJson, response);
      const savedCanon = await saveConversationProposal(proposal, response.assistantMessage || "");
      setCanonAssistantMessage(response.assistantMessage || "");
      setCanonSuggestedQuestions(response.suggestedQuestions ?? []);
      setCanonChatHistory((prev) => [
        ...prev,
        { role: "operator", content: operatorMessage },
        { role: "assistant", content: response.assistantMessage || "Updated canon proposal." },
      ]);
      setCanonConversationNotes((prev) =>
        [
          prev.trim(),
          `### ${topicLabel(canonActiveTopic)}`,
          canonTopicAnswer.trim(),
          response.assistantMessage ? `Assistant: ${response.assistantMessage}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
      setCanonTopicAnswer("");
      setDeepCanonMessage({
        type: "success",
        text: compactedAnswer.isLong
          ? `Long answer saved as canon proposal v${savedCanon.canonVersion}. DeepSeek received a compacted turn. Review before approval.`
          : `DeepSeek responded and saved canon proposal v${savedCanon.canonVersion}. Review before approval.`,
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character canon chat failed.";
      if (locallySavedCanon) {
        setDeepCanonMessage({
          type: deepSeekResponded ? "error" : "success",
          text: deepSeekResponded
            ? `DeepSeek responded, but the AI-updated proposal could not be saved. Your operator answer remains saved as proposal v${locallySavedCanon.canonVersion}. Error: ${text}`
            : `Your answer is saved as canon proposal v${locallySavedCanon.canonVersion}. DeepSeek analysis did not complete yet: ${text}`,
        });
      } else {
        const proposal = applyCanonTopicAnswer(visibleCanon, draft, canonActiveTopic, canonTopicAnswer);
        setCanonProposal(proposal);
        setDeepCanonMessage({
          type: "error",
          text: `Autosave failed before DeepSeek analysis. Your answer is only on this screen: ${text}`,
        });
      }
    } finally {
      setCanonChatLoading(false);
    }
  };

  const saveApprovedDeepCanon = async () => {
    const proposal = canonProposal ?? reviewCanon?.canonJson ?? buildCanonProposal(draft, canonConversationNotes);
    const markdown = buildCanonMarkdown(proposal.sections);
    setSaving(true);
    setDeepCanonMessage(null);
    try {
      const result = await saveCharacterCanon({
        avatar: proposal.avatar,
        avatarType: proposal.avatarType,
        displayName: proposal.displayName,
        status: "approved",
        canonJson: proposal,
        canonMarkdown: markdown,
        conversationSummary: canonConversationNotes.trim(),
      });
      if (result.ok === false || !result.canon) {
        throw new Error(result.message || result.reason || "Deep canon could not be saved.");
      }
      setApprovedCanon(result.canon);
      await loadCanons(proposal.avatar);
      setDeepCanonMessage({
        type: "success",
        text: "Approved deep canon saved in the database.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Deep canon could not be saved.";
      setDeepCanonMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const previewImportedCanon = () => {
    const text = canonImportText.trim();
    if (!text) {
      setDeepCanonMessage({ type: "error", text: "Paste Markdown or select files before previewing an import." });
      return;
    }
    const proposal = buildImportedCanon(draft, canonImportName, text);
    setCanonProposal(proposal);
    setDeepCanonMessage({
      type: "success",
      text: `Import preview ready with ${proposal.sections.length} section${proposal.sections.length === 1 ? "" : "s"}. Review coverage before saving.`,
    });
  };

  const saveImportedCanon = async () => {
    const text = canonImportText.trim();
    if (!text) {
      setDeepCanonMessage({ type: "error", text: "Paste Markdown or select files before saving an import." });
      return;
    }
    const proposal = buildImportedCanon(draft, canonImportName, text);
    const markdown = text;
    setCanonImporting(true);
    setDeepCanonMessage(null);
    try {
      const result = await saveCharacterCanon({
        avatar: proposal.avatar,
        avatarType: proposal.avatarType,
        displayName: proposal.displayName,
        status: "proposed-import",
        schemaVersion: "character-canon-v1",
        canonJson: {
          ...proposal,
          source: {
            ...proposal.source,
            sourceHash: hashString(markdown),
          } as CharacterCanonRecord["canonJson"]["source"],
        },
        canonMarkdown: markdown,
        importSummary: `Operator imported Markdown canon from ${canonImportName || "pasted content"}.`,
      });
      if (result.ok === false || !result.canon) {
        throw new Error(result.message || result.reason || "Imported canon could not be saved.");
      }
      setCanonProposal(result.canon.canonJson);
      await loadCanons(proposal.avatar);
      setDeepCanonMessage({
        type: "success",
        text: "Canon imported as proposed. Review the readiness bars and approve only when it is production-ready.",
      });
    } catch (err) {
      const textMessage = err instanceof Error ? err.message : "Imported canon could not be saved.";
      setDeepCanonMessage({ type: "error", text: textMessage });
    } finally {
      setCanonImporting(false);
    }
  };

  const loadCanonImportFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const markdownFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith(".md"));
    if (!markdownFiles.length) {
      setDeepCanonMessage({ type: "error", text: "Select one or more .md files." });
      return;
    }
    const parts = await Promise.all(
      markdownFiles.map(async (file) => {
        const content = await file.text();
        return `<!-- Source file: ${file.name} -->\n\n${content.trim()}`;
      }),
    );
    setCanonImportName(markdownFiles.map((file) => file.name).join(", "));
    setCanonImportText(parts.join("\n\n---\n\n"));
    setDeepCanonMessage({
      type: "success",
      text: `${markdownFiles.length} Markdown file${markdownFiles.length === 1 ? "" : "s"} loaded. Preview before saving.`,
    });
  };

  const runCanonPortrait = async () => {
    if (!canonJob?.jobId) return;
    setCanonRunning(true);
    setCanonMessage(null);
    try {
      const result = await runCanonPortraitGeneration(canonJob.jobId);
      if (result.ok === false) {
        throw new Error(result.message || result.reason || result.error || "Canon portrait job could not run.");
      }
      setCanonJob(result.job ?? canonJob);
      setCanonPromptPack(result.promptPack ?? canonPromptPack);
      setCanonInstructions(result.instructions ?? []);
      setCanonMessage({
        type: "success",
        text: result.manual
          ? "Canon portrait job is marked running. Use the prompt pack in Comfy and register the resulting image as identity-candidate."
          : "Canon portrait generation started.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Canon portrait job could not run.";
      setCanonMessage({ type: "error", text });
    } finally {
      setCanonRunning(false);
    }
  };

  const ingestCanonPortrait = async () => {
    if (!canonJob?.jobId) {
      setCanonMessage({ type: "error", text: "Queue a canon portrait job before ingesting output." });
      return;
    }
    if (!canonOutputUrl.trim()) {
      setCanonMessage({ type: "error", text: "Paste the Comfy output URL before ingesting." });
      return;
    }
    setCanonIngesting(true);
    setCanonMessage(null);
    try {
      const result = await ingestCanonPortraitOutput({
        jobId: canonJob.jobId,
        outputUrl: canonOutputUrl,
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || result.error || "Canon portrait output could not be ingested.");
      }
      setCanonJob(result.generationJob ?? canonJob);
      setCanonOutputUrl("");
      await loadReferences(result.reference.avatar);
      setCanonMessage({
        type: "success",
        text: "Canon portrait output ingested as identity-candidate. Review it below and promote it if it defines the character.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Canon portrait output could not be ingested.";
      setCanonMessage({ type: "error", text });
    } finally {
      setCanonIngesting(false);
    }
  };

  const currentReadiness = readinessItems(draft);
  const currentStepIndex = WIZARD_STEPS.findIndex((step) => step.id === activeStep);
  const completedStepCount = WIZARD_STEPS.filter((step) => isStepComplete(step.id, draft)).length;
  const nextRecommendedStep =
    WIZARD_STEPS.find((step) => !isStepComplete(step.id, draft)) ??
    WIZARD_STEPS[WIZARD_STEPS.length - 1];
  const activeBlueprint = characterTypeBlueprints[draft.avatarType];
  const identityCanonCount = references.filter(
    (reference) => reference.classification === "identity-canon",
  ).length;
  const sceneCanonCount = references.filter(
    (reference) => reference.classification === "scene-canon",
  ).length;
  const candidateCount = references.filter((reference) =>
    reference.classification.endsWith("-candidate"),
  ).length;
  const rejectedCount = references.filter(
    (reference) => reference.classification === "rejected-reference",
  ).length;
  const sceneCanonByScene = new Map(
    references
      .filter((reference) => reference.classification === "scene-canon")
      .map((reference) => [reference.scene, reference]),
  );
  const sceneCandidatesByScene = references.reduce((acc, reference) => {
    if (reference.classification !== "scene-candidate") return acc;
    const list = acc.get(reference.scene) ?? [];
    list.push(reference);
    acc.set(reference.scene, list);
    return acc;
  }, new Map<string, CharacterReferenceRecord[]>());
  const visualSceneRows = Array.from(
    new Map(
      [
        ...draft.scenes.map((scene) => [
          scene.scene,
          {
            scene: scene.scene,
            displayName: scene.displayName || scene.scene,
            description: scene.description || "",
          },
        ] as const),
        ...references
          .filter((reference) => reference.scene && reference.scene !== "portrait-canon")
          .map((reference) => [
            reference.scene,
            {
              scene: reference.scene,
              displayName: reference.scene,
              description: "",
            },
          ] as const),
      ],
    ).values(),
  );
  const canSaveDraft = Boolean(draft.displayName.trim());

  const goToPreviousStep = () => {
    const previous = WIZARD_STEPS[Math.max(0, currentStepIndex - 1)];
    if (previous) setActiveStep(previous.id);
  };

  const goToNextStep = async () => {
    if (activeStep === "identity" && draft.displayName.trim()) {
      const saved = await save({ silent: true });
      if (!saved) return;
    }
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
            <div className="mt-4 grid gap-2 lg:grid-cols-5">
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
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-4 py-3">
              <p className="text-sm text-gray-400">
                {canSaveDraft
                  ? "Create the draft now, then complete the character in Canon. Voice, limits, scenes, and content strategy live there."
                  : "Add a display name in Identity to create the character draft."}
              </p>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !canSaveDraft}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : selectedAvatar ? "Save draft" : "Create draft"}
              </button>
            </div>
          </div>

          {activeStep === "type" && (
            <CharacterTypeStepPanel
              avatarType={draft.avatarType}
              onApplyBlueprint={applyBlueprint}
            />
          )}

          {activeStep === "identity" && (
            <CharacterIdentityStepPanel
              draft={draft}
              setDraft={setDraft}
              updateDraft={updateDraft}
            />
          )}

          {activeStep === "canon" && (
            <div className="mt-4 space-y-4">
              <CanonWorkspaceShell
                canonTab={canonTab}
                setCanonTab={setCanonTab}
                approvedCanon={approvedCanon}
                reviewCanon={reviewCanon}
                deepCanonMessage={deepCanonMessage}
                canonReadinessScore={canonReadinessScore}
                objectiveReadiness={objectiveReadiness}
                canonTopicProgress={canonTopicProgress}
                missingCanonTopics={missingCanonTopics}
              />

              {canonTab === "conversation" && (
                <CanonConversationPanel
                  hasAnyCanon={hasAnyCanon}
                  missingCanonTopics={missingCanonTopics}
                  canonTopicProgress={canonTopicProgress}
                  canonActiveTopic={canonActiveTopic}
                  setCanonActiveTopic={setCanonActiveTopic}
                  activeCanonGuide={activeCanonGuide}
                  activeTopicEvidence={activeTopicEvidence}
                  canonAssistantMessage={canonAssistantMessage}
                  canonSuggestedQuestions={canonSuggestedQuestions}
                  canonTopicAnswer={canonTopicAnswer}
                  setCanonTopicAnswer={setCanonTopicAnswer}
                  canonChatLoading={canonChatLoading}
                  onApplyGuidedAnswer={() => void applyGuidedCanonAnswer()}
                />
              )}

              {canonTab === "import" && (
                <CanonImportPanel
                  canonImportName={canonImportName}
                  canonImportText={canonImportText}
                  canonImporting={canonImporting}
                  setCanonImportName={setCanonImportName}
                  setCanonImportText={setCanonImportText}
                  onLoadFiles={(files) => void loadCanonImportFiles(files)}
                  onPreviewImport={previewImportedCanon}
                  onSaveImport={() => void saveImportedCanon()}
                />
              )}

              {canonTab === "conversation" && (
              <label className="block text-sm text-gray-400">
                Creative conversation notes
                <textarea
                  value={canonConversationNotes}
                  onChange={(event) => setCanonConversationNotes(event.target.value)}
                  className="mt-1 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                  placeholder="Describe nuance in natural language: sensuality, emotional posture, visual identity, contradictions, hard limits, audience relationship, things that must never happen..."
                />
              </label>
              )}

              {canonTab === "approval" && (
                <CanonApprovalPanel
                  saving={saving}
                  canons={canons}
                  visibleCanonRecord={visibleCanonRecord}
                  visibleCanonMarkdown={visibleCanonMarkdown}
                  onBuildProposal={buildDeepCanonProposal}
                  onApproveCanon={() => void saveApprovedDeepCanon()}
                  onOpenDocument={(title, body) => setCanonDetailModal({ title, body })}
                />
              )}

              {canonTab === "sections" && visibleCanon && (
                <CanonSectionsPanel
                  visibleCanonSections={visibleCanonSections}
                  hiddenImportWrapperCount={hiddenImportWrapperCount}
                  onOpenSection={(title, body) => setCanonDetailModal({ title, body })}
                />
              )}

              {canonTab === "document" && visibleCanon && (
                <CanonDocumentPanel
                  visibleCanonMarkdown={visibleCanonMarkdown}
                  onGoToApproval={() => setCanonTab("approval")}
                  onOpenDocument={() =>
                    setCanonDetailModal({
                      title: "Unified canon document",
                      body: visibleCanonMarkdown,
                    })
                  }
                />
              )}

              {canonTab === "overview" && visibleCanon && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Recent sections
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        A compact sample. Use Sections for full review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCanonTab("sections")}
                      className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
                    >
                      View all sections
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {visibleCanonSections.slice(0, 4).map((section) => (
                      <article
                        key={section.key}
                        className="rounded-md border border-border bg-surface-raised p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h5 className="text-sm font-semibold text-gray-200">{section.label}</h5>
                          <span className="text-xs text-gray-500">{section.status}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">
                          {section.summary}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {canonTab !== "overview" &&
                canonTab !== "document" &&
                canonTab !== "sections" &&
                visibleCanon && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Current proposal snapshot
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {visibleCanonSections.length} canon sections available for review.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCanonTab("document")}
                      className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
                    >
                      Read document
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeStep === "visual" && (
            <CharacterVisualStepPanel
              draft={draft}
              references={references}
              referenceForm={referenceForm}
              referenceMessage={referenceMessage}
              referencesLoading={referencesLoading}
              referenceSaving={referenceSaving}
              referenceUploading={referenceUploading}
              referenceUploadFile={referenceUploadFile}
              identityCanonCount={identityCanonCount}
              sceneCanonCount={sceneCanonCount}
              candidateCount={candidateCount}
              rejectedCount={rejectedCount}
              visualSceneRows={visualSceneRows}
              sceneCanonByScene={sceneCanonByScene}
              sceneCandidatesByScene={sceneCandidatesByScene}
              canonJob={canonJob}
              canonPromptPack={canonPromptPack}
              canonInstructions={canonInstructions}
              canonMessage={canonMessage}
              canonSaving={canonSaving}
              canonRunning={canonRunning}
              canonIngesting={canonIngesting}
              canonOutputUrl={canonOutputUrl}
              setReferenceForm={setReferenceForm}
              setReferenceUploadFile={setReferenceUploadFile}
              setCanonOutputUrl={setCanonOutputUrl}
              updateReferencePolicy={(referencePolicy) => updateDraft("referencePolicy", referencePolicy)}
              onUploadReference={() =>
                void uploadAndRegisterReference({ draft, onAvatarSelected: setSelectedAvatar })
              }
              onRefreshReferences={() => draft.avatar && void loadReferences(draft.avatar)}
              onPromoteSceneCanon={(reference) => void promoteReferenceToSceneCanon(reference)}
              onQueueCanonPortrait={() => void queueCanonPortrait()}
              onRunCanonPortrait={() => void runCanonPortrait()}
              onIngestCanonPortrait={() => void ingestCanonPortrait()}
              onRegisterReference={() =>
                void registerReference({ draft, onAvatarSelected: setSelectedAvatar })
              }
              onPromoteIdentityCanon={(reference) => void promoteReferenceToIdentityCanon(reference)}
            />
          )}

          {activeStep === "summary" && (
            <CharacterSummaryPanel
              draft={draft}
              currentReadiness={currentReadiness}
              saving={saving}
              onNotesChange={(notes) => updateDraft("notes", notes)}
              onSave={() => void save()}
            />
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
                onClick={() => void goToNextStep()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Next
              </button>
            )}
          </div>
        </section>
      </div>
      {canonDetailModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-100">{canonDetailModal.title}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Review detail without stretching the main workflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCanonDetailModal(null)}
                className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-6 text-gray-300">
              {canonDetailModal.body}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
