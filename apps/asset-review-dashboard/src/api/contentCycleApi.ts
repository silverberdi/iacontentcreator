import type {
  ContentCycleContext,
  GeneratedCandidate,
  GenerationJobData,
  IdentityPackData,
  ManualExportResult,
  PromptPackData,
  PublicationDraft,
  SceneBriefData,
} from "../types/contentCycle";
import { postN8nJson } from "./n8nClient";

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return items.length > 0 ? items : undefined;
}

function unwrapRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function parseSceneBrief(data: unknown): SceneBriefData {
  const record = unwrapRecord(data);
  return {
    ...record,
    visualIntent: pickString(record.visualIntent),
    allowedMood:
      pickString(record.allowedMood) ??
      (Array.isArray(record.allowedMood)
        ? record.allowedMood.filter((m): m is string => typeof m === "string")
        : undefined),
    positivePrompt: pickString(record.positivePrompt),
    negativePrompt: pickString(record.negativePrompt),
    referenceImages: pickStringArray(record.referenceImages),
  };
}

function parsePromptPack(data: unknown): PromptPackData {
  const record = unwrapRecord(data);
  const nested =
    record.promptPack && typeof record.promptPack === "object"
      ? (record.promptPack as Record<string, unknown>)
      : record;

  return {
    ...nested,
    positivePrompt: pickString(nested.positivePrompt ?? record.positivePrompt),
    negativePrompt: pickString(nested.negativePrompt ?? record.negativePrompt),
    referenceImages: pickStringArray(nested.referenceImages ?? record.referenceImages),
  };
}

function parseJob(data: unknown): GenerationJobData {
  const record = unwrapRecord(data);
  const job =
    record.job && typeof record.job === "object"
      ? (record.job as Record<string, unknown>)
      : record;

  const promptPackSource =
    job.promptPack && typeof job.promptPack === "object"
      ? job.promptPack
      : record.promptPack;

  return {
    ...job,
    jobId: pickString(job.jobId ?? record.jobId),
    status: pickString(job.status ?? record.status),
    runMode: pickString(job.runMode ?? record.runMode),
    startedAt: pickString(job.startedAt ?? record.startedAt),
    promptPack: promptPackSource ? parsePromptPack(promptPackSource) : undefined,
  };
}

function parseGeneratedCandidates(data: unknown): GeneratedCandidate[] {
  const record = unwrapRecord(data);
  const list =
    (Array.isArray(record.candidates) && record.candidates) ||
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(record.generated) && record.generated) ||
    (Array.isArray(data) ? data : []);

  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      ...item,
      generatedAssetId:
        pickString(item.generatedAssetId) ??
        pickString(item.id) ??
        pickString(item.generated_asset_id) ??
        "",
      assetId: pickString(item.assetId ?? item.asset_id),
      avatar: pickString(item.avatar),
      scene: pickString(item.scene),
      status: pickString(item.status),
      url: pickString(item.url ?? item.imageUrl ?? item.image_url),
      imageUrl: pickString(item.imageUrl ?? item.url ?? item.image_url),
      createdAt: pickString(item.createdAt ?? item.created_at),
    }))
    .filter((item) => item.generatedAssetId);
}

function parsePublicationDrafts(data: unknown): PublicationDraft[] {
  const record = unwrapRecord(data);
  const list =
    (Array.isArray(record.drafts) && record.drafts) ||
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(data) ? data : []);

  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      ...item,
      draftId:
        pickString(item.draftId) ?? pickString(item.id) ?? pickString(item.draft_id) ?? "",
      caption: pickString(item.caption),
      hashtags:
        pickString(item.hashtags) ??
        (Array.isArray(item.hashtags)
          ? item.hashtags.filter((tag): tag is string => typeof tag === "string").join(" ")
          : undefined),
      status: pickString(item.status),
      imageUrl: pickString(item.imageUrl ?? item.url ?? item.image_url),
      url: pickString(item.url ?? item.imageUrl ?? item.image_url),
      createdAt: pickString(item.createdAt ?? item.created_at),
      approvedAt: pickString(item.approvedAt ?? item.approved_at),
      generatedAssetId: pickString(item.generatedAssetId ?? item.generated_asset_id),
    }))
    .filter((item) => item.draftId);
}

function parseManualExport(data: unknown): ManualExportResult {
  const record = unwrapRecord(data);
  const exportData =
    record.export && typeof record.export === "object"
      ? (record.export as Record<string, unknown>)
      : record;

  return {
    ...exportData,
    imageUrl: pickString(exportData.imageUrl ?? exportData.url ?? exportData.image_url),
    caption: pickString(exportData.caption),
    hashtags:
      pickString(exportData.hashtags) ??
      (Array.isArray(exportData.hashtags)
        ? exportData.hashtags.filter((tag): tag is string => typeof tag === "string").join(" ")
        : undefined),
    manualInstructions: pickString(
      exportData.manualInstructions ?? exportData.manual_instructions,
    ),
  };
}

export async function resolveSceneBrief(ctx: Pick<ContentCycleContext, "avatar" | "scene">) {
  const raw = await postN8nJson<unknown>("/scenes/resolve-brief", {
    avatar: ctx.avatar,
    scene: ctx.scene,
  });
  return { raw, parsed: parseSceneBrief(raw) };
}

export async function resolveIdentityPack(ctx: Pick<ContentCycleContext, "avatar">) {
  const raw = await postN8nJson<unknown>("/identity/resolve-pack", {
    avatar: ctx.avatar,
  });
  return { raw, parsed: raw as IdentityPackData };
}

function optionalPostIntent(ctx: Pick<ContentCycleContext, "postIntent">): {
  postIntent?: string;
} {
  const postIntent = ctx.postIntent?.trim();
  return postIntent ? { postIntent } : {};
}

export async function generatePromptPack(ctx: ContentCycleContext) {
  const raw = await postN8nJson<unknown>("/content/generate-prompt-pack", {
    avatar: ctx.avatar,
    scene: ctx.scene,
    platform: ctx.platform,
    ...optionalPostIntent(ctx),
  });
  return { raw, parsed: parsePromptPack(raw) };
}

export async function queueGenerationJob(ctx: ContentCycleContext) {
  const raw = await postN8nJson<unknown>("/generation/jobs/queue", {
    avatar: ctx.avatar,
    scene: ctx.scene,
    platform: ctx.platform,
    ...optionalPostIntent(ctx),
  });
  return { raw, parsed: parseJob(raw) };
}

export async function runComfyJob(jobId: string) {
  const raw = await postN8nJson<unknown>("/generation/jobs/run-comfy", { jobId });
  return { raw, parsed: parseJob(raw) };
}

export async function registerGeneratedAsset(jobId: string, assetId: string) {
  const raw = await postN8nJson<unknown>("/generation/generated/register", {
    jobId,
    assetId,
  });
  return { raw, parsed: parseJob(raw) };
}

export async function listGeneratedCandidates(ctx: Pick<ContentCycleContext, "avatar" | "scene">) {
  const raw = await postN8nJson<unknown>("/generation/generated/list", {
    avatar: ctx.avatar,
    scene: ctx.scene,
  });
  return { raw, parsed: parseGeneratedCandidates(raw) };
}

export async function approveGeneratedAsset(generatedAssetId: string, reviewNotes: string) {
  return postN8nJson<unknown>("/generation/generated/approve", {
    generatedAssetId,
    reviewNotes,
  });
}

export async function rejectGeneratedAsset(generatedAssetId: string, reviewNotes: string) {
  return postN8nJson<unknown>("/generation/generated/reject", {
    generatedAssetId,
    reviewNotes,
  });
}

export async function createPublicationDraft(
  generatedAssetId: string,
  ctx: Pick<ContentCycleContext, "platform" | "postIntent">,
) {
  return postN8nJson<unknown>("/content/create-publication-draft", {
    generatedAssetId,
    platform: ctx.platform,
    ...optionalPostIntent(ctx),
  });
}

export async function listPublicationDrafts(ctx: ContentCycleContext) {
  const raw = await postN8nJson<unknown>("/publication/drafts/list", {
    avatar: ctx.avatar,
    scene: ctx.scene,
    platform: ctx.platform,
  });
  return { raw, parsed: parsePublicationDrafts(raw) };
}

export async function approvePublicationDraft(draftId: string) {
  return postN8nJson<unknown>("/publication/drafts/approve", { draftId });
}

export async function manualExportDraft(draftId: string) {
  const raw = await postN8nJson<unknown>("/publish/manual-export", { draftId });
  return { raw, parsed: parseManualExport(raw) };
}

export function imageUrlForCandidate(candidate: GeneratedCandidate): string | undefined {
  return candidate.url ?? candidate.imageUrl;
}

export function imageUrlForDraft(draft: PublicationDraft): string | undefined {
  return draft.imageUrl ?? draft.url;
}

export function formatHashtags(hashtags: string | string[] | undefined): string {
  if (!hashtags) return "";
  if (Array.isArray(hashtags)) return hashtags.join(" ");
  return hashtags;
}
