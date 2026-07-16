import { postN8nJson } from "./n8nClient";
import type {
  CreatePublicationJobPayload,
  CreatePublicationJobResponse,
  ExportPublicationPackPayload,
  ExportPublicationPackResponse,
  GeneratePublicationBriefPayload,
  GeneratePublicationBriefResponse,
  GeneratePublicationImagesPayload,
  GeneratePublicationImagesResponse,
  GeneratePublicationCopyPackPayload,
  GeneratePublicationCopyPackResponse,
  GeneratePublicationPromptPackPayload,
  GeneratePublicationPromptPackResponse,
  IngestComfyOutputPayload,
  IngestComfyOutputResponse,
  IngestComfyOutputResult,
  ListPublicationJobsPayload,
  ListPublicationJobsResponse,
  PublicationJobLoadItem,
  SelectPublicationAssetPayload,
  SelectPublicationAssetResponse,
  SelectPublicationAssetResult,
  PublicationBrief,
  PublicationCopyPack,
  PublicationPublishingExport,
  PublicationGenerationSubmission,
  PublicationJob,
  PublicationPromptPack,
} from "../types/publications";

function parseJob(data: CreatePublicationJobResponse): PublicationJob {
  const job = data.job;
  if (!data.ok || !job?.publicationJobId) {
    throw new Error(data.error || data.reason || data.message || "Publication job was not created.");
  }
  return job;
}

export async function createPublicationJob(
  payload: CreatePublicationJobPayload,
): Promise<PublicationJob> {
  const data = await postN8nJson<CreatePublicationJobResponse>(
    "/publications/jobs/create",
    payload,
  );
  return parseJob(data);
}

export async function generatePublicationBrief(
  payload: GeneratePublicationBriefPayload,
): Promise<{ job: PublicationJob; brief: PublicationBrief }> {
  const data = await postN8nJson<GeneratePublicationBriefResponse>(
    "/publications/jobs/generate-brief",
    payload,
  );
  const job = parseJob(data);
  const brief = data.brief ?? job.brief;
  if (!brief) {
    throw new Error(data.error || data.reason || data.message || "Publication brief was not generated.");
  }
  return { job, brief };
}

export async function generatePublicationPromptPack(
  payload: GeneratePublicationPromptPackPayload,
): Promise<{ job: PublicationJob; promptPack: PublicationPromptPack }> {
  const data = await postN8nJson<GeneratePublicationPromptPackResponse>(
    "/publications/jobs/generate-prompt-pack",
    payload,
  );
  const job = parseJob(data);
  const promptPack = data.promptPack ?? job.promptPack;
  if (!promptPack) {
    throw new Error(data.error || data.reason || data.message || "Publication prompt pack was not generated.");
  }
  return { job, promptPack };
}

export async function generatePublicationImages(
  payload: GeneratePublicationImagesPayload,
): Promise<{ job: PublicationJob; generation: PublicationGenerationSubmission }> {
  const data = await postN8nJson<GeneratePublicationImagesResponse>(
    "/publications/jobs/generate-images",
    payload,
  );
  const job = parseJob(data);
  if (!data.ok || !data.generation?.generationJobId) {
    throw new Error(data.error || data.reason || data.message || "Image generation was not submitted.");
  }
  return { job, generation: data.generation };
}

export async function generatePublicationCopyPack(
  payload: GeneratePublicationCopyPackPayload,
): Promise<{ job: PublicationJob; copyPack: PublicationCopyPack }> {
  const data = await postN8nJson<GeneratePublicationCopyPackResponse>(
    "/publications/jobs/generate-copy-pack",
    payload,
  );
  const job = parseJob(data);
  const copyPack = data.copyPack ?? data.publishingPack ?? job.publishingPack;
  if (!copyPack) {
    throw new Error(data.error || data.reason || data.message || "Publication copy pack was not generated.");
  }
  return { job, copyPack };
}

export async function exportPublicationPack(
  payload: ExportPublicationPackPayload,
): Promise<{ job: PublicationJob; publishingExport: PublicationPublishingExport }> {
  const data = await postN8nJson<ExportPublicationPackResponse>(
    "/publications/jobs/export-pack",
    payload,
  );
  const job = parseJob(data);
  const publishingExport = data.publishingExport ?? data.exportPack;
  if (!data.ok || !data.exported || !publishingExport) {
    throw new Error(data.error || data.reason || data.message || "Publishing pack was not exported.");
  }
  return { job, publishingExport };
}

export async function ingestComfyOutput(
  payload: IngestComfyOutputPayload,
): Promise<IngestComfyOutputResult> {
  const data = await postN8nJson<IngestComfyOutputResponse>(
    "/publications/jobs/ingest-comfy-output",
    payload,
  );
  if (!data.ok || !data.assetId) {
    throw new Error(data.error || data.reason || data.message || "Comfy output was not ingested.");
  }
  return {
    assetId: data.assetId,
    generatedAssetId: data.generatedAssetId,
    generationJobId: data.generationJobId,
    publicationJobId: data.publicationJobId,
    publicationStatus: data.publicationStatus,
    generationStatus: data.generationStatus,
    objectPath: data.objectPath,
    bucket: data.bucket,
  };
}

export async function listPublicationJobs(
  payload: ListPublicationJobsPayload = {},
): Promise<PublicationJobLoadItem[]> {
  const data = await postN8nJson<ListPublicationJobsResponse>(
    "/publications/jobs/list",
    payload,
  );
  if (!data.ok) {
    throw new Error(data.error || data.reason || data.message || "Publication jobs could not be loaded.");
  }
  return data.jobs || [];
}

export async function selectPublicationAsset(
  payload: SelectPublicationAssetPayload,
): Promise<SelectPublicationAssetResult> {
  const data = await postN8nJson<SelectPublicationAssetResponse>(
    "/publications/jobs/select-asset",
    payload,
  );
  if (!data.ok || !data.selected || !data.assetId || !data.publicationJobId) {
    throw new Error(data.error || data.reason || data.message || "Publication asset was not selected.");
  }
  return {
    selected: true,
    assetId: data.assetId,
    generatedAssetId: data.generatedAssetId,
    publicationJobId: data.publicationJobId,
    publicationStatus: data.publicationStatus || data.job?.status || "assets-ready",
    asset: data.asset,
    job: data.job,
  };
}
