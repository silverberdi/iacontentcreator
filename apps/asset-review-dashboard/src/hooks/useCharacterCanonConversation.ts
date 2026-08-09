import { useState } from "react";
import { chatCharacterCanon, saveCharacterCanon } from "../api/charactersApi";
import {
  applyCanonTopicAnswer,
  buildCanonMarkdown,
  compactLongOperatorAnswer,
} from "../domain/characterCanonBuilder";
import {
  normalizeSectionStatus,
  topicLabel,
} from "../domain/characterCanonReadiness";
import { slugify } from "../domain/characterOnboardingModel";
import type {
  CharacterCanonChatResponse,
  CharacterCanonRecord,
  CharacterCanonSection,
  CharacterOnboardingSavePayload,
} from "../types/characters";

type CanonMessage = { type: "success" | "error"; text: string } | null;
type CanonChatHistory = Array<{ role: "operator" | "assistant"; content: string }>;

type ApplyGuidedAnswerOptions = {
  draft: CharacterOnboardingSavePayload;
  visibleCanon: CharacterCanonRecord["canonJson"] | null;
  hasAnyCanon: boolean;
  conversationNotes: string;
  onConversationNotesChange: (notes: string | ((prev: string) => string)) => void;
  onMessage: (message: CanonMessage) => void;
  onProposal: (proposal: CharacterCanonRecord["canonJson"]) => void;
  onSaved: (avatar: string) => Promise<void>;
};

function mergeAiSectionUpdates(
  baseCanon: CharacterCanonRecord["canonJson"],
  response: CharacterCanonChatResponse,
  activeTopic: string,
): CharacterCanonRecord["canonJson"] {
  const updates = Array.isArray(response.sectionUpdates) ? response.sectionUpdates : [];
  if (!updates.length) return baseCanon;
  const sections = [...baseCanon.sections];
  updates.forEach((update, index) => {
    const key = update.key || `ai_update_${Date.now()}_${index}`;
    const nextSection: CharacterCanonSection = {
      ...update,
      key,
      label: update.label || topicLabel(activeTopic),
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
}

export function useCharacterCanonConversation() {
  const [canonConversationNotes, setCanonConversationNotes] = useState("");
  const [canonActiveTopic, setCanonActiveTopic] = useState("identity");
  const [canonTopicAnswer, setCanonTopicAnswer] = useState("");
  const [canonChatHistory, setCanonChatHistory] = useState<CanonChatHistory>([]);
  const [canonAssistantMessage, setCanonAssistantMessage] = useState("");
  const [canonSuggestedQuestions, setCanonSuggestedQuestions] = useState<string[]>([]);
  const [canonChatLoading, setCanonChatLoading] = useState(false);

  const resetCanonConversation = () => {
    setCanonConversationNotes("");
    setCanonActiveTopic("identity");
    setCanonTopicAnswer("");
    setCanonChatHistory([]);
    setCanonAssistantMessage("");
    setCanonSuggestedQuestions([]);
    setCanonChatLoading(false);
  };

  const applyGuidedCanonAnswer = async ({
    draft,
    visibleCanon,
    hasAnyCanon,
    conversationNotes,
    onConversationNotesChange,
    onMessage,
    onProposal,
    onSaved,
  }: ApplyGuidedAnswerOptions) => {
    if (!canonTopicAnswer.trim()) {
      onMessage({ type: "error", text: "Write an answer before updating the canon proposal." });
      return;
    }
    const compactedAnswer = compactLongOperatorAnswer(canonTopicAnswer);
    const operatorMessage = [
      `Topic: ${hasAnyCanon ? topicLabel(canonActiveTopic) : "Foundation"}`,
      compactedAnswer.message,
    ].join("\n\n");
    setCanonChatLoading(true);
    onMessage(null);
    let deepSeekResponded = false;
    let locallySavedCanon: CharacterCanonRecord | null = null;
    const saveConversationProposal = async (
      proposal: CharacterCanonRecord["canonJson"],
      assistantMessage = "",
    ) => {
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
          conversationNotes.trim(),
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
      onProposal(result.canon.canonJson);
      await onSaved(proposal.avatar);
      return result.canon;
    };
    try {
      const operatorProposal = applyCanonTopicAnswer(visibleCanon, draft, canonActiveTopic, canonTopicAnswer);
      locallySavedCanon = await saveConversationProposal(operatorProposal);
      onMessage({
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
      const proposal = mergeAiSectionUpdates(locallySavedCanon.canonJson, response, canonActiveTopic);
      const savedCanon = await saveConversationProposal(proposal, response.assistantMessage || "");
      setCanonAssistantMessage(response.assistantMessage || "");
      setCanonSuggestedQuestions(response.suggestedQuestions ?? []);
      setCanonChatHistory((prev) => [
        ...prev,
        { role: "operator", content: operatorMessage },
        { role: "assistant", content: response.assistantMessage || "Updated canon proposal." },
      ]);
      onConversationNotesChange((prev) =>
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
      onMessage({
        type: "success",
        text: compactedAnswer.isLong
          ? `Long answer saved as canon proposal v${savedCanon.canonVersion}. DeepSeek received a compacted turn. Review before approval.`
          : `DeepSeek responded and saved canon proposal v${savedCanon.canonVersion}. Review before approval.`,
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Character canon chat failed.";
      if (locallySavedCanon) {
        onMessage({
          type: deepSeekResponded ? "error" : "success",
          text: deepSeekResponded
            ? `DeepSeek responded, but the AI-updated proposal could not be saved. Your operator answer remains saved as proposal v${locallySavedCanon.canonVersion}. Error: ${text}`
            : `Your answer is saved as canon proposal v${locallySavedCanon.canonVersion}. DeepSeek analysis did not complete yet: ${text}`,
        });
      } else {
        const proposal = applyCanonTopicAnswer(visibleCanon, draft, canonActiveTopic, canonTopicAnswer);
        onProposal(proposal);
        onMessage({
          type: "error",
          text: `Autosave failed before DeepSeek analysis. Your answer is only on this screen: ${text}`,
        });
      }
    } finally {
      setCanonChatLoading(false);
    }
  };

  return {
    canonConversationNotes,
    canonActiveTopic,
    canonTopicAnswer,
    canonAssistantMessage,
    canonSuggestedQuestions,
    canonChatLoading,
    setCanonConversationNotes,
    setCanonActiveTopic,
    setCanonTopicAnswer,
    setCanonAssistantMessage,
    setCanonSuggestedQuestions,
    resetCanonConversation,
    applyGuidedCanonAnswer,
  };
}
