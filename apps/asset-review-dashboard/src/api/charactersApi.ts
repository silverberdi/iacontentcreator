import { postN8nJson } from "./n8nClient";
import type {
  CharacterCanonPortraitQueuePayload,
  CharacterCanonPortraitQueueResponse,
  CharacterCanonPortraitRunResponse,
  CharacterReferenceRegisterPayload,
  CharacterReferenceRegisterResponse,
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

function buildCanonPortraitPromptPack(payload: CharacterCanonPortraitQueuePayload) {
  const pillars = payload.contentPillars.join(", ");
  const tone = payload.captionTone.join(", ");
  const brandFit = payload.brandFit.join(", ");
  const limits = payload.publishingLimits.join("; ");
  const reviewTriggers = payload.reviewTriggers.join("; ");
  const notes = payload.notes?.trim();

  return {
    positivePrompt: [
      `Create a photorealistic canon portrait for ${payload.displayName}.`,
      `Avatar type: ${payload.avatarType}. Business profile: ${payload.businessProfile}.`,
      `Core identity: ${payload.primaryObjective}.`,
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
