import { useState } from "react";
import {
  listCharacterReferences,
  registerCharacterReference,
  uploadCharacterReferenceImage,
} from "../api/charactersApi";
import {
  EMPTY_REFERENCE_FORM,
  slugify,
} from "../domain/characterOnboardingModel";
import type {
  CharacterOnboardingSavePayload,
  CharacterReferenceRecord,
} from "../types/characters";

type OperatorMessage = {
  type: "success" | "error";
  text: string;
} | null;

type ReferenceMutationOptions = {
  draft: CharacterOnboardingSavePayload;
  onAvatarSelected?: (avatar: string) => void;
};

export function useCharacterReferences() {
  const [references, setReferences] = useState<CharacterReferenceRecord[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [referenceSaving, setReferenceSaving] = useState(false);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceUploadFile, setReferenceUploadFile] = useState<File | null>(null);
  const [referenceForm, setReferenceForm] = useState(EMPTY_REFERENCE_FORM);
  const [referenceMessage, setReferenceMessage] = useState<OperatorMessage>(null);

  const clearReferences = () => {
    setReferences([]);
    setReferenceForm(EMPTY_REFERENCE_FORM);
    setReferenceUploadFile(null);
    setReferenceMessage(null);
  };

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

  const registerReference = async ({ draft, onAvatarSelected }: ReferenceMutationOptions) => {
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
      onAvatarSelected?.(payloadAvatar);
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

  const uploadAndRegisterReference = async ({ draft, onAvatarSelected }: ReferenceMutationOptions) => {
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
      onAvatarSelected?.(payloadAvatar);
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

  return {
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
  };
}
