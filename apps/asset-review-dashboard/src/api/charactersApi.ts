import { postN8nJson } from "./n8nClient";
import type {
  CharacterCanonPortraitIngestPayload,
  CharacterCanonPortraitIngestResponse,
  CharacterCanonPortraitQueuePayload,
  CharacterCanonPortraitQueueResponse,
  CharacterCanonPortraitRunResponse,
  CharacterCanonListPayload,
  CharacterCanonListResponse,
  CharacterCanonChatPayload,
  CharacterCanonChatResponse,
  CharacterCanonSavePayload,
  CharacterCanonSaveResponse,
  CharacterReferenceRegisterPayload,
  CharacterReferenceRegisterResponse,
  CharacterReferenceUploadResponse,
  CharacterReferencesListPayload,
  CharacterReferencesListResponse,
  CharacterOnboardingListResponse,
  CharacterOnboardingSavePayload,
  CharacterOnboardingSaveResponse,
} from "../types/characters";

export async function listCharacterOnboarding(): Promise<CharacterOnboardingListResponse> {
  return postN8nJson<CharacterOnboardingListResponse>("/admin/characters/list", {});
}

export async function saveCharacterOnboarding(
  payload: CharacterOnboardingSavePayload,
): Promise<CharacterOnboardingSaveResponse> {
  return postN8nJson<CharacterOnboardingSaveResponse>("/admin/characters/save", payload);
}

export async function listCharacterCanons(
  payload: CharacterCanonListPayload,
): Promise<CharacterCanonListResponse> {
  return postN8nJson<CharacterCanonListResponse>("/admin/characters/canon/list", payload);
}

export async function saveCharacterCanon(
  payload: CharacterCanonSavePayload,
): Promise<CharacterCanonSaveResponse> {
  return postN8nJson<CharacterCanonSaveResponse>("/admin/characters/canon/save", payload);
}

export async function chatCharacterCanon(
  payload: CharacterCanonChatPayload,
): Promise<CharacterCanonChatResponse> {
  const response = await fetch("/api/character-canon/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data: CharacterCanonChatResponse;
  try {
    data = text ? (JSON.parse(text) as CharacterCanonChatResponse) : {};
  } catch {
    throw new Error(
      `Character canon chat returned non-JSON (${response.status}): ${text.slice(0, 160)}`,
    );
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.message || data.reason || "Character canon chat failed.");
  }
  return data;
}

export async function listCharacterReferences(
  payload: CharacterReferencesListPayload,
): Promise<CharacterReferencesListResponse> {
  return postN8nJson<CharacterReferencesListResponse>(
    "/admin/characters/references/list",
    payload,
  );
}

export async function registerCharacterReference(
  payload: CharacterReferenceRegisterPayload,
): Promise<CharacterReferenceRegisterResponse> {
  return postN8nJson<CharacterReferenceRegisterResponse>(
    "/admin/characters/references/register",
    payload,
  );
}

export async function uploadCharacterReferenceImage(payload: {
  avatar: string;
  scene: string;
  classification: string;
  file: File;
}): Promise<CharacterReferenceUploadResponse> {
  const form = new FormData();
  form.append("avatar", payload.avatar);
  form.append("scene", payload.scene);
  form.append("classification", payload.classification);
  form.append("file", payload.file);
  const response = await fetch("/api/characters/reference-upload", {
    method: "POST",
    body: form,
  });
  const text = await response.text();
  let data: CharacterReferenceUploadResponse;
  try {
    data = text ? (JSON.parse(text) as CharacterReferenceUploadResponse) : {};
  } catch {
    throw new Error(`Reference upload returned non-JSON (${response.status}): ${text.slice(0, 160)}`);
  }
  if (!response.ok || data.ok === false || !data.upload) {
    throw new Error(data.error || data.message || data.reason || "Reference image upload failed.");
  }
  return data;
}

function buildCanonPortraitPromptPack(payload: CharacterCanonPortraitQueuePayload) {
  const pillars = payload.contentPillars.join(", ");
  const tone = payload.captionTone.join(", ");
  const brandFit = payload.brandFit.join(", ");
  const limits = payload.publishingLimits.join("; ");
  const reviewTriggers = payload.reviewTriggers.join("; ");
  const notes = payload.notes?.trim();
  const approvedCanon = payload.approvedCanon;
  const canonContext = approvedCanon?.canonMarkdown?.trim();

  return {
    positivePrompt: [
      `Create a photorealistic canon portrait for ${payload.displayName}.`,
      `Avatar type: ${payload.avatarType}. Business profile: ${payload.businessProfile}.`,
      `Core identity: ${payload.primaryObjective}.`,
      canonContext
        ? `Approved deep character canon to preserve: ${canonContext.slice(0, 5000)}`
        : "",
      pillars ? `Content world: ${pillars}.` : "",
      tone ? `Emotional tone: ${tone}.` : "",
      brandFit ? `Visual brand fit: ${brandFit}.` : "",
      "Single real human subject, consistent face, natural anatomy, two arms, two hands, two legs, natural shoulders, realistic skin texture.",
      "Medium portrait, clean framing, neutral cinematic background, soft natural light, direct identity reference quality.",
      "No props blocking face or hands, no crowd, no duplicate person, no stylized illustration, no text overlays.",
      notes ? `Operator notes: ${notes}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    negativePrompt: [
      "extra arms, extra hands, extra fingers, missing fingers, malformed hands, fused fingers, duplicated person, cloned face",
      "identity drift, inconsistent face, distorted eyes, asymmetrical face, bad anatomy, broken limbs, cropped head",
      "heavy blur, low quality, oversexualized pose, childlike appearance, logo, watermark, text",
      limits ? `Publishing limits to avoid: ${limits}.` : "",
      reviewTriggers ? `Human review triggers to avoid in canon portrait: ${reviewTriggers}.` : "",
    ]
      .filter(Boolean)
      .join(", "),
    referenceImages: [],
    purpose: "character-identity-canon-portrait",
    expectedClassification: "identity-candidate",
    scene: "portrait-canon",
    qaProfile: "strict-human-identity-canon",
  };
}

export async function queueCanonPortraitGeneration(
  payload: CharacterCanonPortraitQueuePayload,
): Promise<CharacterCanonPortraitQueueResponse> {
  const promptPack = buildCanonPortraitPromptPack(payload);
  const data = await postN8nJson<CharacterCanonPortraitQueueResponse>("/generation/jobs/queue", {
    avatar: payload.avatar,
    scene: "portrait-canon",
    assetType: "raw-image",
    platform: "character-onboarding",
    postIntent: "Generate canon portrait candidates for identity approval.",
    promptPack,
    requestType: "character-canon-portrait",
    expectedReferenceClassification: "identity-candidate",
  });

  return { ...data, promptPack };
}

export async function runCanonPortraitGeneration(
  jobId: string,
): Promise<CharacterCanonPortraitRunResponse> {
  return postN8nJson<CharacterCanonPortraitRunResponse>("/generation/jobs/run-comfy", {
    jobId,
    mode: "character-canon-portrait",
  });
}

export async function ingestCanonPortraitOutput(
  payload: CharacterCanonPortraitIngestPayload,
): Promise<CharacterCanonPortraitIngestResponse> {
  return postN8nJson<CharacterCanonPortraitIngestResponse>(
    "/admin/characters/canon/ingest-output",
    payload,
  );
}
