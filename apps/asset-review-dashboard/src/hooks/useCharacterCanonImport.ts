import { useState } from "react";
import { saveCharacterCanon } from "../api/charactersApi";
import { buildImportedCanon } from "../domain/characterCanonBuilder";
import { hashString } from "../domain/characterOnboardingModel";
import type {
  CharacterCanonRecord,
  CharacterOnboardingSavePayload,
} from "../types/characters";

type CanonMessage = { type: "success" | "error"; text: string } | null;

type ImportActionOptions = {
  draft: CharacterOnboardingSavePayload;
  onMessage: (message: CanonMessage) => void;
  onProposal: (proposal: CharacterCanonRecord["canonJson"]) => void;
};

type SaveImportOptions = ImportActionOptions & {
  onSaved: (avatar: string) => Promise<void>;
};

export function useCharacterCanonImport() {
  const [canonImportName, setCanonImportName] = useState("");
  const [canonImportText, setCanonImportText] = useState("");
  const [canonImporting, setCanonImporting] = useState(false);

  const resetCanonImport = () => {
    setCanonImportName("");
    setCanonImportText("");
    setCanonImporting(false);
  };

  const previewImportedCanon = ({ draft, onMessage, onProposal }: ImportActionOptions) => {
    const text = canonImportText.trim();
    if (!text) {
      onMessage({ type: "error", text: "Paste Markdown or select files before previewing an import." });
      return;
    }
    const proposal = buildImportedCanon(draft, canonImportName, text);
    onProposal(proposal);
    onMessage({
      type: "success",
      text: `Import preview ready with ${proposal.sections.length} section${proposal.sections.length === 1 ? "" : "s"}. Review coverage before saving.`,
    });
  };

  const saveImportedCanon = async ({
    draft,
    onMessage,
    onProposal,
    onSaved,
  }: SaveImportOptions) => {
    const text = canonImportText.trim();
    if (!text) {
      onMessage({ type: "error", text: "Paste Markdown or select files before saving an import." });
      return;
    }
    const proposal = buildImportedCanon(draft, canonImportName, text);
    const markdown = text;
    setCanonImporting(true);
    onMessage(null);
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
      onProposal(result.canon.canonJson);
      await onSaved(proposal.avatar);
      onMessage({
        type: "success",
        text: "Canon imported as proposed. Review the readiness bars and approve only when it is production-ready.",
      });
    } catch (err) {
      const textMessage = err instanceof Error ? err.message : "Imported canon could not be saved.";
      onMessage({ type: "error", text: textMessage });
    } finally {
      setCanonImporting(false);
    }
  };

  const loadCanonImportFiles = async (
    files: FileList | null,
    onMessage: (message: CanonMessage) => void,
  ) => {
    if (!files?.length) return;
    const markdownFiles = Array.from(files).filter((file) => file.name.toLowerCase().endsWith(".md"));
    if (!markdownFiles.length) {
      onMessage({ type: "error", text: "Select one or more .md files." });
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
    onMessage({
      type: "success",
      text: `${markdownFiles.length} Markdown file${markdownFiles.length === 1 ? "" : "s"} loaded. Preview before saving.`,
    });
  };

  return {
    canonImportName,
    canonImportText,
    canonImporting,
    setCanonImportName,
    setCanonImportText,
    resetCanonImport,
    previewImportedCanon,
    saveImportedCanon,
    loadCanonImportFiles,
  };
}
