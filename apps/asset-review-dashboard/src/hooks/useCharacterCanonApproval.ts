import { saveCharacterCanon } from "../api/charactersApi";
import {
  applyCanonTopicAnswer,
  buildCanonMarkdown,
  buildCanonProposal,
} from "../domain/characterCanonBuilder";
import type {
  CharacterCanonRecord,
  CharacterOnboardingSavePayload,
} from "../types/characters";

type CanonMessage = { type: "success" | "error"; text: string } | null;

type BuildProposalOptions = {
  draft: CharacterOnboardingSavePayload;
  visibleCanon: CharacterCanonRecord["canonJson"] | null;
  conversationNotes: string;
  onProposal: (proposal: CharacterCanonRecord["canonJson"]) => void;
  onMessage: (message: CanonMessage) => void;
};

type ApproveCanonOptions = {
  draft: CharacterOnboardingSavePayload;
  canonProposal: CharacterCanonRecord["canonJson"] | null;
  reviewCanon: CharacterCanonRecord | null;
  conversationNotes: string;
  setSaving: (saving: boolean) => void;
  onApproved: (canon: CharacterCanonRecord) => void;
  onMessage: (message: CanonMessage) => void;
  onSaved: (avatar: string) => Promise<void>;
};

export function useCharacterCanonApproval() {
  const buildDeepCanonProposal = ({
    draft,
    visibleCanon,
    conversationNotes,
    onProposal,
    onMessage,
  }: BuildProposalOptions) => {
    const base = visibleCanon ?? buildCanonProposal(draft, "");
    const proposal = conversationNotes.trim()
      ? applyCanonTopicAnswer(base, draft, "operator_notes", conversationNotes)
      : base;
    onProposal(proposal);
    onMessage({
      type: "success",
      text: "Canon proposal updated from the current character definition and conversation notes.",
    });
  };

  const saveApprovedDeepCanon = async ({
    draft,
    canonProposal,
    reviewCanon,
    conversationNotes,
    setSaving,
    onApproved,
    onMessage,
    onSaved,
  }: ApproveCanonOptions) => {
    const proposal = canonProposal ?? reviewCanon?.canonJson ?? buildCanonProposal(draft, conversationNotes);
    const markdown = buildCanonMarkdown(proposal.sections);
    setSaving(true);
    onMessage(null);
    try {
      const result = await saveCharacterCanon({
        avatar: proposal.avatar,
        avatarType: proposal.avatarType,
        displayName: proposal.displayName,
        status: "approved",
        canonJson: proposal,
        canonMarkdown: markdown,
        conversationSummary: conversationNotes.trim(),
      });
      if (result.ok === false || !result.canon) {
        throw new Error(result.message || result.reason || "Deep canon could not be saved.");
      }
      onApproved(result.canon);
      await onSaved(proposal.avatar);
      onMessage({
        type: "success",
        text: "Approved deep canon saved in the database.",
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : "Deep canon could not be saved.";
      onMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  return {
    buildDeepCanonProposal,
    saveApprovedDeepCanon,
  };
}
