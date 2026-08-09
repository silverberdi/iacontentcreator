import { useEffect, useMemo, useState } from "react";
import {
  chatCharacterCanon,
  ingestCanonPortraitOutput,
  listCharacterCanons,
  listCharacterOnboarding,
  listCharacterReferences,
  queueCanonPortraitGeneration,
  registerCharacterReference,
  runCanonPortraitGeneration,
  saveCharacterCanon,
  saveCharacterOnboarding,
  uploadCharacterReferenceImage,
} from "../api/charactersApi";
import {
  characterTypeBlueprints,
  characterTypeOptions,
} from "../data/characterBlueprints";
import {
  CANON_TABS,
  DEFAULT_CHARACTER,
  EMPTY_REFERENCE_FORM,
  REFERENCE_CLASSIFICATION_OPTIONS,
  STATUS_LABELS,
  WIZARD_STEPS,
  hashString,
  inferStatus,
  isStepComplete,
  joinList,
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
import {
  CANON_TOPIC_GUIDES,
  getCanonTopicProgress,
  getObjectiveReadinessProgress,
  getTopicEvidence,
  normalizeSectionStatus,
  readinessBarClass,
  topicLabel,
} from "../domain/characterCanonReadiness";
import type {
  CharacterAvatarType,
  CharacterCanonRecord,
  CharacterCanonSection,
  CharacterCanonChatResponse,
  CharacterOnboardingRecord,
  CharacterOnboardingSavePayload,
  CharacterOnboardingStatus,
  CharacterCanonPortraitJob,
  CharacterCanonPortraitPromptPack,
  CharacterReferenceClassification,
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
  const [references, setReferences] = useState<CharacterReferenceRecord[]>([]);
  const [canons, setCanons] = useState<CharacterCanonRecord[]>([]);
  const [approvedCanon, setApprovedCanon] = useState<CharacterCanonRecord | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [draft, setDraft] = useState<CharacterOnboardingSavePayload>(DEFAULT_CHARACTER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceUploadFile, setReferenceUploadFile] = useState<File | null>(null);
  const [referenceForm, setReferenceForm] = useState(EMPTY_REFERENCE_FORM);
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
  const [referenceMessage, setReferenceMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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

  const loadReferences = async (avatar: string) => {
    setReferencesLoading(true);
    setReferenceMessage(null);
    try {
      const result = await listCharacterReferences({ avatar });
      if (result.ok === false) {
        throw new Error(result.message || result.reason || "References could not load.");
      }
      setReferences(result.references ?? []);
    } catch (err) {
      const text = err instanceof Error ? err.message : "References could not load.";
      setReferenceMessage({ type: "error", text });
    } finally {
      setReferencesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedAvatar) {
      setReferences([]);
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
    setReferences([]);
    setCanons([]);
    setApprovedCanon(null);
    setReferenceForm(EMPTY_REFERENCE_FORM);
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
    setReferenceMessage(null);
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

  const registerReference = async () => {
    const payloadAvatar = draft.avatar || slugify(draft.displayName);
    const isSceneReference = referenceForm.classification.startsWith("scene-");
    const payloadScene =
      referenceForm.scene ||
      (isSceneReference ? draft.scenes.find((scene) => scene.scene)?.scene : "portrait-canon");

    if (!payloadAvatar) {
      setReferenceMessage({
        type: "error",
        text: "Save or define the character avatar before registering references.",
      });
      return;
    }
    if (isSceneReference && !payloadScene) {
      setReferenceMessage({
        type: "error",
        text: "Scene references need a selected scene.",
      });
      return;
    }
    if (!referenceForm.objectPathOrUrl.trim()) {
      setReferenceMessage({
        type: "error",
        text: "Paste a MinIO URL or object path before registering the reference.",
      });
      return;
    }

    setReferenceSaving(true);
    setReferenceMessage(null);
    try {
      const result = await registerCharacterReference({
        avatar: payloadAvatar,
        scene: payloadScene || "portrait-canon",
        classification: referenceForm.classification,
        objectPathOrUrl: referenceForm.objectPathOrUrl,
        reviewNotes: referenceForm.reviewNotes,
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || "Reference could not be registered.");
      }
      setSelectedAvatar(payloadAvatar);
      await loadReferences(payloadAvatar);
      setReferenceForm((prev) => ({
        ...prev,
        objectPathOrUrl: "",
        reviewNotes: "",
      }));
      setReferenceMessage({ type: "success", text: "Reference registered in visual canon." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Reference could not be registered.";
      setReferenceMessage({ type: "error", text });
    } finally {
      setReferenceSaving(false);
    }
  };

  const uploadAndRegisterReference = async () => {
    const payloadAvatar = draft.avatar || slugify(draft.displayName);
    const payloadScene = referenceForm.scene || "portrait-canon";
    if (!payloadAvatar) {
      setReferenceMessage({
        type: "error",
        text: "Save or define the character avatar before uploading references.",
      });
      return;
    }
    if (!referenceUploadFile) {
      setReferenceMessage({ type: "error", text: "Choose an image file from your computer first." });
      return;
    }
    setReferenceUploading(true);
    setReferenceMessage(null);
    try {
      const uploaded = await uploadCharacterReferenceImage({
        avatar: payloadAvatar,
        scene: payloadScene,
        classification: referenceForm.classification,
        file: referenceUploadFile,
      });
      const objectPathOrUrl = uploaded.upload?.publicUrl;
      if (!objectPathOrUrl) {
        throw new Error("Upload succeeded but did not return a MinIO path.");
      }
      const result = await registerCharacterReference({
        avatar: payloadAvatar,
        scene: payloadScene,
        classification: referenceForm.classification,
        objectPathOrUrl,
        reviewNotes:
          referenceForm.reviewNotes ||
          `Uploaded from local file: ${referenceUploadFile.name}`,
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || "Uploaded image could not be registered.");
      }
      setSelectedAvatar(payloadAvatar);
      await loadReferences(payloadAvatar);
      setReferenceUploadFile(null);
      setReferenceForm((prev) => ({
        ...prev,
        objectPathOrUrl: "",
        reviewNotes: "",
      }));
      setReferenceMessage({
        type: "success",
        text: "Image uploaded and registered in visual canon.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Image upload failed.";
      setReferenceMessage({ type: "error", text });
    } finally {
      setReferenceUploading(false);
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

  const promoteReferenceToIdentityCanon = async (reference: CharacterReferenceRecord) => {
    setReferenceSaving(true);
    setReferenceMessage(null);
    try {
      const result = await registerCharacterReference({
        avatar: reference.avatar,
        scene: "portrait-canon",
        classification: "identity-canon",
        objectPathOrUrl: reference.url,
        reviewNotes: "Promoted to identity canon from Characters visual reference intake.",
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || "Reference could not be promoted.");
      }
      await loadReferences(reference.avatar);
      setReferenceMessage({ type: "success", text: "Identity canon promoted." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Reference could not be promoted.";
      setReferenceMessage({ type: "error", text });
    } finally {
      setReferenceSaving(false);
    }
  };

  const promoteReferenceToSceneCanon = async (reference: CharacterReferenceRecord) => {
    setReferenceSaving(true);
    setReferenceMessage(null);
    try {
      const result = await registerCharacterReference({
        avatar: reference.avatar,
        scene: reference.scene,
        classification: "scene-canon",
        objectPathOrUrl: reference.url,
        reviewNotes: `Promoted to scene canon for ${reference.scene} from Characters visual reference intake.`,
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || "Scene reference could not be promoted.");
      }
      await loadReferences(reference.avatar);
      setReferenceMessage({ type: "success", text: "Scene canon promoted." });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Scene reference could not be promoted.";
      setReferenceMessage({ type: "error", text });
    } finally {
      setReferenceSaving(false);
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
          )}

          {activeStep === "canon" && (
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-blue-900/70 bg-blue-950/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-100">
                      Deep character canon
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm text-blue-100/70">
                      This is the source of truth for personality, boundaries, visual DNA, and
                      generation context. It is stored in the database as JSON plus a readable
                      Markdown rendering, not as loose files.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      approvedCanon
                        ? "bg-emerald-950/70 text-emerald-200"
                        : reviewCanon
                          ? "bg-blue-950/70 text-blue-200"
                        : "bg-amber-950/70 text-amber-200"
                    }`}
                  >
                    {approvedCanon
                      ? `Approved v${approvedCanon.canonVersion}`
                      : reviewCanon
                        ? `Imported ${reviewCanon.status} v${reviewCanon.canonVersion}`
                        : "No approved canon"}
                  </span>
                </div>
              </div>

              {deepCanonMessage && (
                <div
                  className={`rounded-md border px-4 py-3 text-sm ${
                    deepCanonMessage.type === "success"
                      ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
                      : "border-red-800/60 bg-red-950/40 text-red-200"
                  }`}
                  role="status"
                >
                  {deepCanonMessage.text}
                </div>
              )}

              <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-2">
                {CANON_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCanonTab(tab.id)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                      canonTab === tab.id
                        ? "bg-accent text-white"
                        : "bg-surface-overlay text-gray-300 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {canonTab === "overview" && (
              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      Canon readiness
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Separate the base character completeness from the operational objective.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-border bg-surface-raised p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Character completeness
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Identity, psychology, appearance, voice, limits, scenes, and content.
                        </p>
                      </div>
                      <span className="text-2xl font-semibold text-gray-100">
                        {canonReadinessScore}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                      <div
                        className={`h-full rounded-full ${readinessBarClass(canonReadinessScore)}`}
                        style={{ width: `${canonReadinessScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-surface-raised p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {objectiveReadiness.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {objectiveReadiness.description}
                        </p>
                      </div>
                      <span className="text-2xl font-semibold text-gray-100">
                        {objectiveReadiness.score}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
                      <div
                        className={`h-full rounded-full ${readinessBarClass(objectiveReadiness.score)}`}
                        style={{ width: `${objectiveReadiness.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {canonTopicProgress.map((topic) => (
                    <div
                      key={topic.key}
                      className="rounded-md border border-border bg-surface-raised px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {topic.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            topic.status === "healthy"
                              ? "bg-emerald-950/70 text-emerald-200"
                              : topic.status === "thin"
                                ? "bg-amber-950/70 text-amber-200"
                                : "bg-red-950/70 text-red-200"
                          }`}
                        >
                          {topic.status}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${topic.score}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {topic.sectionCount} section{topic.sectionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
                {missingCanonTopics.length > 0 ? (
                  <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                    Character needs more detail:{" "}
                    {missingCanonTopics.map((topic) => topic.label).join(", ")}.
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
                    Coverage looks strong. Review the content, then approve only if the character
                    feels production-ready.
                  </div>
                )}
                <div className="mt-4 rounded-md border border-border bg-surface-raised p-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Objective-specific gaps
                  </h5>
                  {objectiveReadiness.weakCriteria.length > 0 ? (
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {objectiveReadiness.weakCriteria.map((criterion) => (
                        <div
                          key={criterion.key}
                          className="rounded-md border border-amber-900/40 bg-amber-950/10 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-amber-100">
                              {criterion.label}
                            </span>
                            <span className="text-xs text-amber-200">{criterion.score}%</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-amber-100/75">
                            {criterion.missingHint}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-emerald-200">
                      Objective-specific coverage looks strong for this character type.
                    </p>
                  )}
                </div>
              </div>
              )}

              {canonTab === "conversation" && (
              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      {hasAnyCanon ? "Guided canon conversation" : "Start character conversation"}
                    </h4>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                      {hasAnyCanon
                        ? "Pick a topic, review what is already captured, and add only the missing nuance. Your answer is saved first, then AI analysis enriches it when available."
                        : "No canon exists yet. Start with a natural description and the system will create the first proposed canon section."}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm text-blue-100/80">
                      {hasAnyCanon
                        ? "Start here: choose a topic on the left, read the captured context, then answer only what should be refined, corrected, or expanded."
                        : "Start here: answer who this character is, what they should make people feel, and what kind of relationship they should create."}
                    </p>
                  </div>
                  {hasAnyCanon && missingCanonTopics[0] ? (
                    <button
                      type="button"
                      onClick={() => setCanonActiveTopic(missingCanonTopics[0].key)}
                      className="rounded-md border border-amber-900/70 bg-amber-950/30 px-3 py-2 text-sm text-amber-100 hover:text-white"
                    >
                      Work on {missingCanonTopics[0].label}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div className="grid gap-2">
                    {canonTopicProgress.map((topic) => (
                      <button
                        key={topic.key}
                        type="button"
                        onClick={() => setCanonActiveTopic(topic.key)}
                        className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                          canonActiveTopic === topic.key
                            ? "border-accent bg-accent/10 text-white"
                            : "border-border bg-surface-raised text-gray-300 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{topic.label}</span>
                          <span className="text-xs text-gray-500">{topic.score}%</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{topic.status}</p>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-md border border-border bg-surface-raised p-4">
                    <p className="text-sm font-semibold text-gray-200">
                      {hasAnyCanon ? topicLabel(canonActiveTopic) : "Foundation"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {activeCanonGuide.prompt}
                    </p>
                    {activeTopicEvidence.length > 0 ? (
                      <div className="mt-3 rounded-md border border-emerald-900/50 bg-emerald-950/15 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                          Already captured from onboarding
                        </p>
                        <div className="mt-2 space-y-2">
                          {activeTopicEvidence.map((section) => (
                            <div key={section.key} className="text-sm leading-6 text-emerald-50/80">
                              <span className="font-semibold text-emerald-100">{section.label}: </span>
                              <span>{section.summary}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-emerald-100/60">
                          Add only what is missing, contradictory, or too generic. No need to repeat this.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-md border border-amber-900/50 bg-amber-950/15 px-4 py-3 text-sm text-amber-100">
                        Nothing has been captured for this topic yet. Use this answer to create the first useful detail.
                      </div>
                    )}
                    {canonAssistantMessage ? (
                      <div className="mt-3 rounded-md border border-blue-900/60 bg-blue-950/20 px-4 py-3 text-sm leading-6 text-blue-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                          DeepSeek
                        </p>
                        <p className="mt-1">{canonAssistantMessage}</p>
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {canonSuggestedQuestions.length ? "Suggested next questions from DeepSeek" : "Starter questions"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(canonSuggestedQuestions.length ? canonSuggestedQuestions : activeCanonGuide.examples).map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() =>
                            setCanonTopicAnswer((prev) =>
                              [prev.trim(), `- ${example}: `].filter(Boolean).join("\n"),
                            )
                          }
                          className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-gray-300 hover:text-white"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                    <label className="mt-4 block text-sm text-gray-400">
                      Your answer
                      <textarea
                        value={canonTopicAnswer}
                        onChange={(event) => setCanonTopicAnswer(event.target.value)}
                        className="mt-1 min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
                        placeholder="Answer naturally. You can be messy; this becomes reviewable canon draft, not final publication copy."
                      />
                      {canonTopicAnswer.trim().length > 4500 ? (
                        <p className="mt-2 rounded-md border border-blue-900/60 bg-blue-950/20 px-3 py-2 text-xs leading-5 text-blue-100/80">
                          Long answer detected. The full text will be kept locally in the canon
                          proposal, while DeepSeek receives a compacted version with key excerpts
                          to avoid request/proxy failures.
                        </p>
                      ) : null}
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void applyGuidedCanonAnswer()}
                        disabled={canonChatLoading}
                        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {canonChatLoading
                          ? "Asking DeepSeek..."
                          : hasAnyCanon
                            ? "Ask DeepSeek and update"
                            : "Start with DeepSeek"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanonTopicAnswer("")}
                        className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-gray-300 hover:text-white"
                      >
                        Clear answer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {canonTab === "import" && (
              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      Import existing canon
                    </h4>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                      Bring Markdown you already wrote into the database as a proposed import.
                      This does not approve it; it only makes it reviewable here.
                    </p>
                  </div>
                  <label className="cursor-pointer rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white">
                    Select .md files
                    <input
                      type="file"
                      accept=".md,text/markdown,text/plain"
                      multiple
                      className="hidden"
                      onChange={(event) => void loadCanonImportFiles(event.target.files)}
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm text-gray-400">
                  Import label
                  <input
                    value={canonImportName}
                    onChange={(event) => setCanonImportName(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100"
                    placeholder="Andres canon pack v1, Diana private canon notes..."
                  />
                </label>
                <label className="mt-3 block text-sm text-gray-400">
                  Markdown content
                  <textarea
                    value={canonImportText}
                    onChange={(event) => setCanonImportText(event.target.value)}
                    className="mt-1 min-h-36 w-full rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100"
                    placeholder="Paste one or many Markdown documents here. Headings become review sections."
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={previewImportedCanon}
                    className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white"
                  >
                    Preview import
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveImportedCanon()}
                    disabled={canonImporting}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {canonImporting ? "Saving..." : "Save as proposed import"}
                  </button>
                </div>
              </div>
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
              <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={buildDeepCanonProposal}
                  className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white"
                >
                  Update proposal from notes
                </button>
                <button
                  type="button"
                  onClick={() => void saveApprovedDeepCanon()}
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Approve as official canon"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Updating the proposal is safe and does not save. Approval makes this canon the
                official generation source for the character.
              </p>
              </>
              )}

              {canonTab === "sections" && visibleCanon && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Canon sections audit
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Technical traceability by imported topic. Use Document for normal review.
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {visibleCanonSections.length} canon sections
                    </span>
                  </div>
                  {hiddenImportWrapperCount > 0 ? (
                    <div className="mt-3 rounded-md border border-blue-900/50 bg-blue-950/20 px-3 py-2 text-xs text-blue-100/80">
                      {hiddenImportWrapperCount} source wrapper row
                      {hiddenImportWrapperCount === 1 ? "" : "s"} hidden. File names are kept
                      only as import traceability, not as canon topics.
                    </div>
                  ) : null}
                  <div className="mt-4 overflow-hidden rounded-md border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-overlay text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Section</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Evidence</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {visibleCanonSections.map((section) => {
                          const fullMarkdown =
                            typeof section.data.fullMarkdown === "string"
                              ? section.data.fullMarkdown
                              : section.summary;
                          return (
                            <tr key={section.key} className="bg-surface-raised">
                              <td className="px-3 py-3 font-semibold text-gray-200">
                                {section.label}
                              </td>
                              <td className="px-3 py-3 text-gray-400">{section.status}</td>
                              <td className="px-3 py-3 text-gray-500">
                                {fullMarkdown.length.toLocaleString()} chars
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCanonDetailModal({
                                      title: section.label,
                                      body: fullMarkdown,
                                    })
                                  }
                                  className="rounded-md border border-border bg-surface px-3 py-1 text-xs text-gray-200 hover:text-white"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {canonTab === "document" && visibleCanon && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Unified canon document
                      </h4>
                      <p className="mt-1 max-w-3xl text-sm text-gray-500">
                        Read this as the production truth for the character. Sections remain
                        available only for audit and import traceability.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCanonTab("approval")}
                        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
                      >
                        Go to approval
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCanonDetailModal({
                            title: "Unified canon document",
                            body: visibleCanonMarkdown,
                          })
                        }
                        className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
                      >
                        Open larger
                      </button>
                    </div>
                  </div>
                  {visibleCanonMarkdown ? (
                    <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-gray-200">
                      {visibleCanonMarkdown}
                    </pre>
                  ) : (
                    <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                      No unified canon document is available yet. Import notes or use the
                      conversation to build the first canon proposal.
                    </div>
                  )}
                </div>
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

              {canonTab === "approval" && visibleCanonRecord && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Approval document
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Approve only after this unified document reads like the character truth.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCanonDetailModal({
                          title:
                            visibleCanonRecord.status === "approved"
                              ? "Approved canon rendering"
                              : "Imported canon rendering",
                          body: visibleCanonMarkdown,
                        })
                      }
                      className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
                    >
                      Open larger
                    </button>
                  </div>
                  {visibleCanonMarkdown ? (
                    <pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-gray-200">
                      {visibleCanonMarkdown}
                    </pre>
                  ) : (
                    <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                      There is no readable canon document yet. Build or import canon before approval.
                    </div>
                  )}
                  {visibleCanonRecord.canonJson.providerTrace ? (
                    <div className="mt-3 rounded-md border border-border bg-surface-raised p-3 text-xs text-gray-400">
                      <p className="font-semibold uppercase tracking-wide text-gray-300">
                        AI provider trace
                      </p>
                      <p className="mt-1">
                        {visibleCanonRecord.canonJson.providerTrace.task} ·{" "}
                        {visibleCanonRecord.canonJson.providerTrace.provider} ·{" "}
                        {visibleCanonRecord.canonJson.providerTrace.model}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {canonTab === "approval" && canons.length > 0 && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                    Canon versions
                  </h4>
                  <div className="mt-3 grid gap-2">
                    {canons.map((canon) => (
                      <div
                        key={canon.id ?? `${canon.avatar}-${canon.canonVersion}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
                      >
                        <span className="text-gray-200">
                          v{canon.canonVersion} · {canon.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {canon.updatedAt ?? canon.createdAt ?? ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStep === "visual" && (
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
                      onChange={(event) =>
                        setReferenceUploadFile(event.target.files?.[0] ?? null)
                      }
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
                    onClick={() => void uploadAndRegisterReference()}
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

              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      Scene canon board
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                      This is the visual map used by generation: one shared scene name, but one
                      approved visual reference per character when the scene needs identity or mood
                      guidance. New scene canon is usually approved from Asset Review.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => draft.avatar && void loadReferences(draft.avatar)}
                    disabled={!draft.avatar || referencesLoading}
                    className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 disabled:opacity-40"
                  >
                    {referencesLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {visualSceneRows.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-border p-4 text-sm text-gray-500">
                    No scenes are assigned to this character yet. Add shared scenes from the
                    character canon or catalog first.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {visualSceneRows.map((scene) => {
                      const canon = sceneCanonByScene.get(scene.scene);
                      const candidates = sceneCandidatesByScene.get(scene.scene) ?? [];
                      return (
                        <article
                          key={scene.scene}
                          className={`grid gap-3 rounded-lg border p-3 sm:grid-cols-[120px_1fr] ${
                            canon
                              ? "border-emerald-900/60 bg-emerald-950/10"
                              : "border-border bg-surface-raised"
                          }`}
                        >
                          <div className="aspect-square overflow-hidden rounded-md border border-border bg-black/30">
                            {canon ? (
                              <a href={canon.url} target="_blank" rel="noreferrer">
                                <img
                                  src={canon.url}
                                  alt={`${scene.displayName} scene canon`}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </a>
                            ) : (
                              <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
                                No scene canon yet
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-gray-100">{scene.displayName}</h4>
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  canon
                                    ? "bg-emerald-950/60 text-emerald-200"
                                    : candidates.length
                                      ? "bg-amber-950/60 text-amber-200"
                                      : "bg-surface-overlay text-gray-400"
                                }`}
                              >
                                {canon
                                  ? "Ready"
                                  : candidates.length
                                    ? `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`
                                    : "Missing"}
                              </span>
                            </div>
                            {scene.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                {scene.description}
                              </p>
                            )}
                            {canon ? (
                              <>
                                <p className="mt-2 break-all font-mono text-xs text-gray-500">
                                  {canon.objectPath}
                                </p>
                                {canon.reviewNotes && (
                                  <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                                    {canon.reviewNotes}
                                  </p>
                                )}
                              </>
                            ) : candidates.length ? (
                              <button
                                type="button"
                                onClick={() => void promoteReferenceToSceneCanon(candidates[0])}
                                disabled={referenceSaving}
                                className="mt-3 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                Use latest candidate as scene canon
                              </button>
                            ) : (
                              <p className="mt-2 text-sm text-gray-500">
                                Generate or upload a good image for this character in this scene,
                                then approve it from Asset Review.
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                      Canon portrait generation
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
                      Create the first identity portrait job from this character definition. Good
                      outputs should be registered below as `identity-candidate`, then promoted to
                      `identity-canon` when the operator recognizes the character.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void queueCanonPortrait()}
                      disabled={canonSaving}
                      className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {canonSaving ? "Queueing..." : "Generate canon portrait job"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runCanonPortrait()}
                      disabled={!canonJob?.jobId || canonRunning}
                      className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 disabled:opacity-40"
                    >
                      {canonRunning ? "Running..." : "Run job"}
                    </button>
                  </div>
                </div>

                {canonMessage && (
                  <div
                    className={`mt-4 rounded-md border px-4 py-3 text-sm ${
                      canonMessage.type === "success"
                        ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
                        : "border-red-800/60 bg-red-950/40 text-red-200"
                    }`}
                    role="status"
                  >
                    {canonMessage.text}
                  </div>
                )}

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-md border border-border bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Scene
                    </p>
                    <p className="mt-1 text-sm text-gray-200">portrait-canon</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Job status
                    </p>
                    <p className="mt-1 text-sm text-gray-200">{canonJob?.status ?? "Not queued"}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Expected result
                    </p>
                    <p className="mt-1 text-sm text-gray-200">identity-candidate</p>
                  </div>
                </div>

                {canonJob?.jobId && (
                  <p className="mt-3 break-all font-mono text-xs text-gray-500">
                    generationJobId: {canonJob.jobId}
                  </p>
                )}

                {canonPromptPack && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Positive prompt
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                        {canonPromptPack.positivePrompt}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-surface-raised p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Negative prompt
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                        {canonPromptPack.negativePrompt}
                      </p>
                    </div>
                  </div>
                )}

                {canonInstructions.length > 0 && (
                  <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                      Next manual step
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
                      {canonInstructions.map((instruction) => (
                        <li key={instruction}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <label className="text-sm text-gray-400">
                    Comfy output URL
                    <input
                      value={canonOutputUrl}
                      onChange={(event) => setCanonOutputUrl(event.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
                      placeholder="Paste the Comfy output image URL after generation"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void ingestCanonPortrait()}
                    disabled={!canonJob?.jobId || canonIngesting}
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {canonIngesting ? "Ingesting..." : "Ingest as identity-candidate"}
                  </button>
                </div>
              </div>

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
                    onClick={() => draft.avatar && void loadReferences(draft.avatar)}
                    disabled={!draft.avatar || referencesLoading}
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
                      {draft.scenes.map((scene) => (
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
                    onClick={() => void registerReference()}
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
                            onClick={() => void promoteReferenceToIdentityCanon(reference)}
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
            </div>
          )}

          {activeStep === "summary" && (
            <>
          <div className="rounded-md border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Operational snapshot
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-gray-500">
                  This is what the platform can currently use. If something feels wrong, refine it
                  in Canon instead of editing duplicate forms.
                </p>
              </div>
              <span className="rounded-full border border-blue-900/70 bg-blue-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
                Canon-led
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Content pillars
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {joinList(draft.contentPillars) || "Pending in Canon"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Caption tone
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {joinList(draft.captionTone) || "Pending in Canon"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Brand fit
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {joinList(draft.brandFit) || "Pending in Canon"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Publishing limits
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {joinList(draft.publishingLimits) || "Pending in Canon"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Review triggers
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {joinList(draft.reviewTriggers) || "Pending in Canon"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Starter scenes
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {draft.scenes.length
                    ? draft.scenes.map((scene) => scene.displayName || scene.scene).join(", ")
                    : "Pending in Canon"}
                </p>
              </div>
            </div>
          </div>

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
