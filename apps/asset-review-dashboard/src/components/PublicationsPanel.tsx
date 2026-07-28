import { useEffect, useMemo, useState } from "react";
import {
  createPublicationJob,
  exportPublicationPack,
  generatePublicationBrief,
  generatePublicationCopyPack,
  generatePublicationImages,
  generatePublicationPromptPack,
  ingestComfyOutput,
  listPublicationJobs,
  loadPublicationTimeline,
  markPublicationPublished,
  preparePublicationReferences,
  recordPublicationJobError,
  refreshPublicationGeneration,
  retryPublicationJob,
  selectPublicationAsset,
} from "../api/publicationsApi";
import { rejectAsset } from "../api/assetReviewApi";
import { avatarProfileSummaries } from "../data/avatarProfiles";
import { defaultFilters } from "../data/catalogs";
import type { CatalogOptionsBundle } from "../types/catalogs";
import type {
  PublicationBrief,
  PublicationCopyPack,
  PublicationPublishingExport,
  PublicationPublishedRecord,
  PublicationFormat,
  PublicationGenerationSubmission,
  IngestComfyOutputResult,
  PublicationAssetSummary,
  PublicationJobLoadItem,
  PublicationJobTimeline,
  PublicationJob,
  PublicationQualityReview,
  PublicationQaResult,
  PublicationQaRemediation,
  PublicationPromptPack,
  PublicationRetryStep,
} from "../types/publications";
import { findAvatarShort, optionLabel, scenesForAvatar } from "../utils/catalogNormalize";
import CatalogSelect from "./CatalogSelect";
import CopyButton from "./CopyButton";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";

const QUALITY_CRITERIA = [
  { id: "identity", label: "Identity", help: "Same Estefania face and recognizable visual identity." },
  { id: "face", label: "Face", help: "Natural expression, no warped smile, eyes, or skin." },
  { id: "hands", label: "Hands", help: "Hands are natural if visible; no extra or malformed fingers." },
  { id: "feet", label: "Feet", help: "Feet are natural if visible; no malformed toes or awkward distortion." },
  { id: "composition", label: "Composition", help: "Usable crop, clear subject, no distracting body geometry." },
  { id: "brandFit", label: "Brand fit", help: "Matches Estefania's lifestyle, warm, authentic positioning." },
  { id: "publishability", label: "Publishability", help: "Safe to use as a real Instagram candidate." },
] as const;

const REJECTION_REASONS = [
  { id: "identity-drift", label: "Identity drift" },
  { id: "face-artifact", label: "Face artifact" },
  { id: "hand-artifact", label: "Hand artifact" },
  { id: "foot-artifact", label: "Foot artifact" },
  { id: "bad-composition", label: "Bad composition" },
  { id: "brand-mismatch", label: "Brand mismatch" },
  { id: "not-publishable", label: "Not publishable" },
  { id: "not-canonical-quality", label: "Not canonical quality" },
] as const;

type QualityCriterionId = (typeof QUALITY_CRITERIA)[number]["id"];

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function assetImageUrl(asset: PublicationAssetSummary | null): string | null {
  if (!asset) return null;
  const directUrl = asset.url || asset.publicUrl || asset.imageUrl;
  if (typeof directUrl === "string" && directUrl.trim()) return directUrl.trim();
  if (!asset.bucket || !asset.objectPath) return null;
  return `/minio/${encodeURIComponent(asset.bucket)}/${String(asset.objectPath)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function PublicationAssetPreview({ asset }: { asset: PublicationAssetSummary }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = assetImageUrl(asset);

  if (!url || imageFailed) {
    return (
      <div className="flex aspect-[4/5] min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface p-4 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Image preview unavailable
        </span>
        {asset.objectPath && (
          <p className="mt-2 break-all font-mono text-xs text-gray-400">{asset.objectPath}</p>
        )}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-md border border-border bg-black/40"
    >
      <img
        src={url}
        alt={`Publication asset ${asset.assetId || ""}`}
        onError={() => setImageFailed(true)}
        className="aspect-[4/5] w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:brightness-110"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
        Open image
      </span>
    </a>
  );
}

function humanizeQaText(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function qualityStatusLabel(status: string, defective: boolean): string {
  if (status === "pass") return "Looks safe";
  if (status === "blocked" || defective) return "Blocked by QA";
  if (status === "review_required") return "Check carefully";
  return "Not checked yet";
}

function qualityStatusClass(status: string, defective: boolean): string {
  if (status === "pass") return "border-emerald-800/60 bg-emerald-950/20 text-emerald-200";
  if (status === "blocked" || defective) return "border-red-800/60 bg-red-950/30 text-red-200";
  if (status === "review_required") return "border-amber-800/60 bg-amber-950/20 text-amber-200";
  return "border-border bg-surface-overlay text-gray-300";
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return "Looks good";
  if (score >= 0.6) return "Review";
  return "Needs review";
}

function scoreClass(score: number): string {
  if (score >= 0.8) return "text-emerald-200";
  if (score >= 0.6) return "text-amber-200";
  return "text-red-200";
}

function optionalLine(label: string, value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
}

function formatQaScore(value: unknown): string {
  const score = Number(value);
  return Number.isFinite(score) ? `${scoreLabel(score)} · ${Math.round(score * 100)}%` : "Not available";
}

function QaSummary({
  qa,
  defective,
}: {
  qa: PublicationQaResult | undefined;
  defective: boolean;
}) {
  const scores = readRecord(qa?.scores);
  const flags = Array.isArray(qa?.flags) ? qa.flags : [];
  const defectReasons = Array.isArray(qa?.defectReasons) ? qa.defectReasons : [];
  const status = qa?.status || "not-run";
  const scoreItems: Array<[string, unknown]> = [
    ["hands", scores.hands],
    ["feet", scores.feet],
    ["composition", scores.composition],
    ["publishability", scores.publishability],
  ];

  return (
    <div className={`rounded-lg border px-3 py-3 text-sm ${qualityStatusClass(status, defective)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Quality check</p>
        <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium">
          {qualityStatusLabel(status, defective)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {scoreItems.map(([label, value]) => (
          <div key={label} className="rounded-md bg-black/15 px-2.5 py-1.5">
            <dt className="uppercase tracking-wide opacity-70">{humanizeQaText(label)}</dt>
            <dd className={`mt-0.5 font-medium ${scoreClass(Number(value))}`}>
              {formatQaScore(value)}
            </dd>
          </div>
        ))}
      </dl>
      {(flags.length > 0 || defectReasons.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {flags.slice(0, 6).map((flag) => (
            <span key={flag} className="rounded-full bg-black/20 px-2.5 py-1">
              {humanizeQaText(flag)}
            </span>
          ))}
          {defectReasons.slice(0, 4).map((reason) => (
            <span key={reason} className="rounded-full bg-black/25 px-2.5 py-1">
              {humanizeQaText(reason)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type PublicationsPanelProps = {
  catalogOptions: CatalogOptionsBundle;
  catalogOptionsLoading?: boolean;
  initialPublicationJobId?: string | null;
  onInitialPublicationJobLoaded?: () => void;
  technicalMode?: boolean;
};

const inputClass =
  "rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:opacity-50";

const formatOptions: { value: PublicationFormat; label: string }[] = [
  { value: "feed-post", label: "Feed post" },
  { value: "story", label: "Story" },
];

type PublicationStage = "job" | "brief" | "prompt" | "images" | "review" | "copy" | "publish";

const publicationStages: Array<{ id: PublicationStage; label: string }> = [
  { id: "job", label: "Job" },
  { id: "brief", label: "Brief" },
  { id: "prompt", label: "Prompt" },
  { id: "images", label: "Images" },
  { id: "review", label: "Review" },
  { id: "copy", label: "Copy" },
  { id: "publish", label: "Publish" },
];

const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Brief pendiente",
  "brief-ready": "Brief listo",
  "prompt-ready": "Listo para generar imagen",
  generating: "Generando imagen",
  "review-ready": "Imagen lista para revisar",
  "assets-ready": "Imagen seleccionada",
  "copy-ready": "Copy listo",
  "ready-to-publish": "Listo para publicar",
  published: "Publicado",
  failed: "Requiere atención",
};

function humanJobStatus(status: string | undefined): string {
  if (!status) return "Sin estado";
  return JOB_STATUS_LABELS[status] || status;
}

function getOperatorNextAction(input: {
  job: PublicationJob;
  hasBrief: boolean;
  hasPromptPack: boolean;
  generationActive: boolean;
  latestAsset: PublicationAssetSummary | null;
  selectedAsset: PublicationAssetSummary | null;
  hasCopyPack: boolean;
  hasExport: boolean;
  hasPublishedRecord: boolean;
}): { label: string; description: string; tone: "normal" | "warning" | "success" } {
  if (input.job.status === "failed") {
    return {
      label: "Revisar error y reintentar",
      description: input.job.errorMessage || "El job falló. Usa el timeline para ver el paso afectado.",
      tone: "warning",
    };
  }
  if (input.hasPublishedRecord || input.job.status === "published") {
    return {
      label: "Publicación registrada",
      description: "Este job ya quedó cerrado como publicado.",
      tone: "success",
    };
  }
  if (!input.hasBrief) {
    return {
      label: "Generar brief",
      description: "Crea la dirección creativa antes de preparar prompts o imágenes.",
      tone: "normal",
    };
  }
  if (!input.hasPromptPack) {
    return {
      label: "Generar prompt pack",
      description: "Convierte el brief en instrucciones listas para Comfy Cloud.",
      tone: "normal",
    };
  }
  if (input.generationActive) {
    return {
      label: "Esperar resultado de Comfy",
      description: "La consola refresca el estado automáticamente mientras la generación está activa.",
      tone: "normal",
    };
  }
  if (!input.latestAsset?.assetId) {
    return {
      label: "Generar imágenes",
      description: "Envía el prompt pack a Comfy. Las referencias se preparan automáticamente.",
      tone: "normal",
    };
  }
  if (input.latestAsset.status === "rejected" && !input.selectedAsset?.assetId) {
    return {
      label: "Generar imagen de reemplazo",
      description: "La imagen anterior fue rechazada. Genera una nueva candidata para continuar.",
      tone: "warning",
    };
  }
  if (!input.selectedAsset?.assetId) {
    return {
      label: "Revisar y seleccionar imagen",
      description: "Valida identidad, rostro, manos/pies, composición y ajuste de marca.",
      tone: "normal",
    };
  }
  if (!input.hasCopyPack) {
    return {
      label: "Generar copy",
      description: "Crea el caption, hashtags y notas de publicación para Instagram.",
      tone: "normal",
    };
  }
  if (!input.hasExport) {
    return {
      label: "Exportar paquete",
      description: "Prepara la imagen y texto final para publicación manual.",
      tone: "normal",
    };
  }
  return {
    label: "Publicar manualmente y registrar URL",
    description: "Publica en Instagram y guarda el enlace final en la consola.",
    tone: "normal",
  };
}

export default function PublicationsPanel({
  catalogOptions,
  catalogOptionsLoading = false,
  initialPublicationJobId = null,
  onInitialPublicationJobLoaded,
  technicalMode = false,
}: PublicationsPanelProps) {
  const [avatar, setAvatar] = useState<string>(defaultFilters.avatar);
  const [scene, setScene] = useState<string>(defaultFilters.scene);
  const [format, setFormat] = useState<PublicationFormat>("feed-post");
  const [objective, setObjective] = useState(
    "Crear una publicación lifestyle orgánica para validar engagement de Estefanía.",
  );
  const [creativeTopic, setCreativeTopic] = useState("");
  const [creativeMood, setCreativeMood] = useState("");
  const [creativeMustInclude, setCreativeMustInclude] = useState("");
  const [creativeAvoid, setCreativeAvoid] = useState("");
  const [createdJob, setCreatedJob] = useState<PublicationJob | null>(null);
  const [briefText, setBriefText] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefMessage, setBriefMessage] = useState<string | null>(null);
  const [briefFeedback, setBriefFeedback] = useState("");
  const [promptPackText, setPromptPackText] = useState("");
  const [promptPackBusy, setPromptPackBusy] = useState(false);
  const [promptPackMessage, setPromptPackMessage] = useState<string | null>(null);
  const [prepareReferencesBusy, setPrepareReferencesBusy] = useState(false);
  const [generation, setGeneration] = useState<PublicationGenerationSubmission | null>(null);
  const [generationAttempts, setGenerationAttempts] = useState<PublicationGenerationSubmission[]>([]);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationRefreshBusy, setGenerationRefreshBusy] = useState(false);
  const [comfyOutputUrl, setComfyOutputUrl] = useState("");
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestComfyOutputResult | null>(null);
  const [latestAsset, setLatestAsset] = useState<PublicationAssetSummary | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<PublicationAssetSummary | null>(null);
  const [selectAssetBusy, setSelectAssetBusy] = useState(false);
  const [qualityCriteria, setQualityCriteria] = useState<Record<QualityCriterionId, boolean>>({
    identity: true,
    face: true,
    hands: true,
    feet: true,
    composition: true,
    brandFit: true,
    publishability: true,
  });
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [qualityNotes, setQualityNotes] = useState("");
  const [rejectAssetBusy, setRejectAssetBusy] = useState(false);
  const [copyPackText, setCopyPackText] = useState("");
  const [copyPackBusy, setCopyPackBusy] = useState(false);
  const [copyPackMessage, setCopyPackMessage] = useState<string | null>(null);
  const [publishingExport, setPublishingExport] = useState<PublicationPublishingExport | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [publishedRecord, setPublishedRecord] = useState<PublicationPublishedRecord | null>(null);
  const [publishPlatform, setPublishPlatform] = useState("instagram");
  const [publishAccount, setPublishAccount] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [publishedNotes, setPublishedNotes] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<PublicationJobTimeline | null>(null);
  const [timelineBusy, setTimelineBusy] = useState(false);
  const [timelineMessage, setTimelineMessage] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [loadJobId, setLoadJobId] = useState("");
  const [recentJobs, setRecentJobs] = useState<PublicationJobLoadItem[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [showRecentJobsModal, setShowRecentJobsModal] = useState(false);
  const [activeStage, setActiveStage] = useState<PublicationStage>("job");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sceneOptions = useMemo(
    () => scenesForAvatar(catalogOptions.scenes, avatar),
    [catalogOptions.scenes, avatar],
  );

  useEffect(() => {
    const nextAvatar = catalogOptions.avatars.some((option) => option.value === avatar)
      ? avatar
      : catalogOptions.avatars[0]?.value ?? defaultFilters.avatar;
    const nextSceneOptions = scenesForAvatar(catalogOptions.scenes, nextAvatar);
    const nextScene = nextSceneOptions.some((option) => option.value === scene)
      ? scene
      : nextSceneOptions[0]?.value ?? defaultFilters.scene;

    if (nextAvatar !== avatar) {
      setAvatar(nextAvatar);
    }
    if (nextScene !== scene) {
      setScene(nextScene);
    }
  }, [avatar, catalogOptions.avatars, catalogOptions.scenes, scene]);

  const avatarShort = findAvatarShort(catalogOptions, avatar);
  const avatarProfile = avatarProfileSummaries[avatar];
  const canCreate = Boolean(avatar && scene && format && objective.trim());
  const operatorObjective = useMemo(
    () =>
      [
        objective.trim(),
        optionalLine("Tema, evento o contexto", creativeTopic),
        optionalLine("Tono deseado", creativeMood),
        optionalLine("Debe incluir", creativeMustInclude),
        optionalLine("Evitar", creativeAvoid),
      ]
        .filter(Boolean)
        .join("\n"),
    [creativeAvoid, creativeMood, creativeMustInclude, creativeTopic, objective],
  );
  const retryableFailedStep = useMemo(() => {
    if (createdJob?.status !== "failed" || !timeline?.events.length) return null;
    const failedEvent = [...timeline.events]
      .reverse()
      .find((event) => event.eventType === "step-failed");
    const failedStep = failedEvent?.payload?.failedStep;
    return typeof failedStep === "string" ? failedStep : null;
  }, [createdJob?.status, timeline?.events]);

  const canRetryFromConsole =
    retryableFailedStep === "generate-brief" ||
    retryableFailedStep === "generate-prompt-pack" ||
    retryableFailedStep === "generate-images" ||
    retryableFailedStep === "generate-copy-pack";

  const generationProviderStatus =
    typeof generation?.providerStatus === "string"
      ? generation.providerStatus
      : typeof generation?.resultPayload === "object" &&
          generation.resultPayload !== null &&
          "providerStatus" in generation.resultPayload
        ? String((generation.resultPayload as { providerStatus?: unknown }).providerStatus || "")
        : "";
  const isGenerationActive =
    Boolean(createdJob?.publicationJobId && generation?.generationJobId) &&
    (createdJob?.status === "generating" ||
      generation?.status === "running" ||
      generationProviderStatus === "submitted" ||
      generationProviderStatus === "running");
  const operatorNextAction = createdJob
    ? getOperatorNextAction({
        job: createdJob,
        hasBrief: Boolean(briefText),
        hasPromptPack: Boolean(promptPackText),
        generationActive: isGenerationActive,
        latestAsset,
        selectedAsset,
        hasCopyPack: Boolean(copyPackText),
        hasExport: Boolean(publishingExport),
        hasPublishedRecord: Boolean(publishedRecord),
      })
    : null;
  const latestAssetQa = (readRecord(latestAsset?.metadata)?.qa || latestAsset?.qa) as
    | PublicationQaResult
    | undefined;
  const latestAssetQualityReview = readRecord(latestAsset?.metadata)?.publicationQualityReview as
    | PublicationQualityReview
    | undefined;
  const qaStatus = latestAssetQa?.status || "not-run";
  const qaFlags = Array.isArray(latestAssetQa?.flags) ? latestAssetQa.flags : [];
  const qaDefectReasons = Array.isArray(latestAssetQa?.defectReasons) ? latestAssetQa.defectReasons : [];
  const latestAssetMetadata = readRecord(latestAsset?.metadata);
  const latestHumanFeedback = readRecord(latestAssetMetadata.publicationHumanFeedback);
  const latestHumanFeedbackCategories = Array.isArray(latestHumanFeedback.categories)
    ? latestHumanFeedback.categories.map(String).filter(Boolean)
    : [];
  const latestHumanFeedbackReasons = Array.isArray(latestHumanFeedback.reasons)
    ? latestHumanFeedback.reasons.map(String).filter(Boolean)
    : [];
  const latestHumanFeedbackNotes = String(
    latestHumanFeedback.notes || readRecord(latestHumanFeedback.promptGuidance).note || "",
  ).trim();
  const latestAssetDefective =
    latestAsset?.defective === true ||
    latestAssetMetadata.defective === true ||
    latestAssetMetadata.latestGeneratedAssetDefective === true ||
    qaStatus === "blocked";
  const qaRemediation = readRecord(latestAssetMetadata.remediation || latestAssetMetadata.qaRemediation);
  const activeQaRemediation = qaRemediation as PublicationQaRemediation;
  const remediationMaxAttempts = Math.max(1, Number(activeQaRemediation.maxAttempts || 3) || 3);
  const remediationAttemptsUsed = Math.max(0, Number(activeQaRemediation.attemptsUsed || 0) || 0);
  const remediationCanContinue = latestAssetDefective && remediationAttemptsUsed < remediationMaxAttempts;
  const remediationExhausted = latestAssetDefective && remediationAttemptsUsed >= remediationMaxAttempts;
  const promptPackPreview = readRecord(
    (() => {
      if (!promptPackText.trim()) return null;
      try {
        return JSON.parse(promptPackText);
      } catch {
        return null;
      }
    })(),
  ) as PublicationPromptPack & { operatorSummary?: Record<string, unknown> };
  const promptOperatorSummary = readRecord(promptPackPreview.operatorSummary);
  const promptCompositionPolicy = readRecord(promptPackPreview.compositionPolicy);
  const promptHumanFeedbackInfluence = readRecord(promptPackPreview.humanFeedbackInfluence);
  const promptHumanFeedbackCategories = Array.isArray(promptHumanFeedbackInfluence.categories)
    ? promptHumanFeedbackInfluence.categories.map(String).filter(Boolean)
    : [];
  const promptHumanFeedbackUsed =
    promptHumanFeedbackInfluence.used === true || Number(promptHumanFeedbackInfluence.feedbackCount || 0) > 0;
  const briefPreview = readRecord(
    (() => {
      if (!briefText.trim()) return null;
      try {
        return JSON.parse(briefText);
      } catch {
        return null;
      }
    })(),
  ) as PublicationBrief;
  const jobMetadata = readRecord(createdJob?.metadata);
  const lastBriefFeedback = readRecord(jobMetadata.lastBriefFeedback);
  const lastBriefFeedbackNotes = String(lastBriefFeedback.notes || "").trim();
  const lastBriefFeedbackCreatedAt = String(lastBriefFeedback.createdAt || "").trim();

  function readGenerationValue(item: PublicationGenerationSubmission | null, key: string) {
    if (!item) return "";
    const direct = item[key];
    if (typeof direct === "string") return direct;
    const resultPayload = item.resultPayload;
    if (resultPayload && typeof resultPayload === "object" && key in resultPayload) {
      const value = (resultPayload as Record<string, unknown>)[key];
      return typeof value === "string" ? value : "";
    }
    return "";
  }

  function stageForJobStatus(status: string | undefined): PublicationStage {
    if (!status) return "job";
    if (status === "draft") return "brief";
    if (status === "failed") return "job";
    if (status === "brief-ready") return "prompt";
    if (status === "prompt-ready" || status === "generating") return "images";
    if (status === "review-ready" || status === "assets-ready") return "review";
    if (status === "copy-ready") return "publish";
    if (status === "ready-to-publish" || status === "published") return "publish";
    return "job";
  }

  async function handleStepFailure(
    failedStep: PublicationRetryStep,
    err: unknown,
    fallbackMessage: string,
  ) {
    const message = err instanceof Error ? err.message : fallbackMessage;
    setError(message);
    if (!createdJob?.publicationJobId) return;
    try {
      const failedJob = await recordPublicationJobError({
        publicationJobId: createdJob.publicationJobId,
        failedStep,
        errorMessage: message,
        technicalDetails: {
          uiStep: failedStep,
          previousStatus: createdJob.status,
        },
      });
      setCreatedJob(failedJob);
      void refreshTimeline(failedJob.publicationJobId);
    } catch {
      // Keep the original operator-facing error visible even if error recording fails.
    }
  }

  useEffect(() => {
    const publicationJobId = initialPublicationJobId?.trim();
    if (!publicationJobId) return;
    const requestedPublicationJobId = publicationJobId;

    let cancelled = false;
    async function loadInitialJob() {
      setLoadBusy(true);
      setError(null);
      setLoadMessage(null);
      try {
        const jobs = await listPublicationJobs({ publicationJobId: requestedPublicationJobId, limit: 1 });
        if (cancelled) return;
        if (!jobs[0]) {
          throw new Error("Publication job was not found.");
        }
        applyLoadedJob(jobs[0]);
        setLoadJobId(requestedPublicationJobId);
        setLoadMessage("Existing publication job loaded.");
        onInitialPublicationJobLoaded?.();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load publication job");
          onInitialPublicationJobLoaded?.();
        }
      } finally {
        if (!cancelled) {
          setLoadBusy(false);
        }
      }
    }

    void loadInitialJob();
    return () => {
      cancelled = true;
    };
  }, [initialPublicationJobId, onInitialPublicationJobLoaded]);

  async function refreshTimeline(publicationJobId: string) {
    setTimelineBusy(true);
    setTimelineMessage(null);
    try {
      const loadedTimeline = await loadPublicationTimeline({ publicationJobId });
      setTimeline(loadedTimeline);
      setTimelineMessage("Timeline refreshed.");
    } catch (err) {
      setTimeline(null);
      setTimelineMessage(err instanceof Error ? err.message : "Timeline could not be loaded.");
    } finally {
      setTimelineBusy(false);
    }
  }

  useEffect(() => {
    if (!createdJob?.publicationJobId) {
      setTimeline(null);
      setTimelineMessage(null);
      return;
    }
    void refreshTimeline(createdJob.publicationJobId);
  }, [createdJob?.publicationJobId, createdJob?.status, createdJob?.updatedAt]);

  useEffect(() => {
    if (!createdJob) {
      setActiveStage("job");
      return;
    }
    setActiveStage((current) => {
      if (current === "brief" && briefText) return current;
      if (current === "prompt" && promptPackText) return current;
      if (current === "images" && generation?.generationJobId && !latestAsset?.assetId) return current;
      if (current === "review" && latestAsset?.assetId) return current;
      if (current === "copy" && selectedAsset?.assetId) return current;
      if (current === "publish" && (copyPackText || publishingExport)) return current;
      return stageForJobStatus(createdJob.status);
    });
  }, [
    briefText,
    copyPackText,
    createdJob,
    generation?.generationJobId,
    latestAsset?.assetId,
    promptPackText,
    publishingExport,
    selectedAsset?.assetId,
  ]);

  function applyLoadedJob(item: PublicationJobLoadItem) {
    const job = item.job;
    setCreatedJob(job);
    setAvatar(job.avatar || defaultFilters.avatar);
    setScene(job.scene || defaultFilters.scene);
    setFormat((job.format as PublicationFormat) || "feed-post");
    setObjective(job.objective || "");
    setBriefText(job.brief ? JSON.stringify(job.brief, null, 2) : "");
    setBriefMessage(null);
    setBriefFeedback("");
    setPromptPackText(job.promptPack ? JSON.stringify(job.promptPack, null, 2) : "");
    setPromptPackMessage(null);
    setCopyPackText(job.publishingPack ? JSON.stringify(job.publishingPack, null, 2) : "");
    setCopyPackMessage(null);
    setPublishingExport(job.publishingExport || null);
    setExportMessage(null);
    setPublishedRecord(job.publishedRecord || null);
    setPublishMessage(null);
    setPublishedUrl("");
    setPublishedAt("");
    setPublishedNotes("");
    setTimeline(null);
    setTimelineMessage(null);
    const existingPublication = job.publishedRecord || null;
    if (existingPublication) {
      setPublishPlatform(existingPublication.platform || "instagram");
      setPublishAccount(existingPublication.account || "");
      setPublishedUrl(existingPublication.publishedUrl || "");
      setPublishedAt(existingPublication.publishedAt || "");
      setPublishedNotes(existingPublication.notes || "");
    } else if (job.publishingExport) {
      setPublishPlatform(job.publishingExport.platform || "instagram");
    }
    setGeneration(item.generation || null);
    setGenerationAttempts(item.generationAttempts || (item.generation ? [item.generation] : []));
    setGenerationMessage("Publication job loaded.");
    setComfyOutputUrl("");
    setLatestAsset(item.latestAsset || null);
    setSelectedAsset(item.selectedAsset || null);
    const savedQualityReview = readRecord(item.latestAsset?.metadata).publicationQualityReview as
      | PublicationQualityReview
      | undefined;
    if (savedQualityReview) {
      setQualityCriteria({
        identity: savedQualityReview.criteria.identity !== false,
        face: savedQualityReview.criteria.face !== false,
        hands: savedQualityReview.criteria.hands !== false,
        feet: savedQualityReview.criteria.feet !== false,
        composition: savedQualityReview.criteria.composition !== false,
        brandFit: savedQualityReview.criteria.brandFit !== false,
        publishability: savedQualityReview.criteria.publishability !== false,
      });
      setRejectionReasons(savedQualityReview.reasons || []);
      setQualityNotes(savedQualityReview.notes || "");
    } else {
      setQualityCriteria({
        identity: true,
        face: true,
        hands: true,
        feet: true,
        composition: true,
        brandFit: true,
        publishability: true,
      });
      setRejectionReasons([]);
      setQualityNotes("");
    }
    setIngestResult(
      item.latestAsset?.assetId
        ? {
            assetId: item.latestAsset.assetId,
            publicationJobId: job.publicationJobId,
            generationJobId: item.generation?.generationJobId || null,
            publicationStatus: job.status,
            generationStatus: item.generation?.status || null,
            objectPath: item.latestAsset.objectPath || null,
            bucket: item.latestAsset.bucket || null,
          }
        : null,
    );
  }

  async function reloadPublicationJob(publicationJobId: string, message?: string) {
    const jobs = await listPublicationJobs({ publicationJobId, limit: 1 });
    if (!jobs[0]) {
      throw new Error("Publication job was not found.");
    }
    applyLoadedJob(jobs[0]);
    if (message) {
      setGenerationMessage(message);
    }
    return jobs[0];
  }

  async function handleRefreshGeneration(options: { silent?: boolean } = {}) {
    if (!createdJob?.publicationJobId || !generation?.generationJobId || generationRefreshBusy) {
      return;
    }
    setGenerationRefreshBusy(true);
    if (!options.silent) {
      setGenerationMessage("Refreshing generation status...");
    }
    try {
      const result = await refreshPublicationGeneration({
        publicationJobId: createdJob.publicationJobId,
        generationJobId: generation.generationJobId,
      });
      const refreshed = await reloadPublicationJob(
        createdJob.publicationJobId,
        result.autoIngested ? "Generation completed and ingested." : "Generation status refreshed.",
      );
      if (result.ingest && typeof result.ingest === "object" && "assetId" in result.ingest) {
        const ingest = result.ingest as IngestComfyOutputResult;
        setIngestResult(ingest);
        const ingestedLatestAsset = refreshed.latestAsset || {
          assetId: ingest.assetId,
          objectPath: ingest.objectPath,
          bucket: ingest.bucket,
          status: "raw",
        };
        setLatestAsset(ingestedLatestAsset);

        const ingestedMetadata = readRecord(ingestedLatestAsset.metadata);
        const ingestedQa = (ingestedMetadata.qa || ingestedLatestAsset.qa) as PublicationQaResult | undefined;
        const ingestedRemediation = readRecord(
          ingestedMetadata.remediation || ingestedMetadata.qaRemediation,
        ) as PublicationQaRemediation;
        const ingestedAttemptsUsed = Math.max(0, Number(ingestedRemediation.attemptsUsed || 0) || 0);
        const ingestedMaxAttempts = Math.max(1, Number(ingestedRemediation.maxAttempts || 3) || 3);
        if (ingestedQa?.status === "blocked" && ingestedAttemptsUsed < ingestedMaxAttempts) {
          const ingestedHumanFeedback = readRecord(ingestedMetadata.publicationHumanFeedback);
          const ingestedHumanFeedbackCategories = Array.isArray(ingestedHumanFeedback.categories)
            ? ingestedHumanFeedback.categories.map(String).filter(Boolean)
            : [];
          const ingestedHumanFeedbackReasons = Array.isArray(ingestedHumanFeedback.reasons)
            ? ingestedHumanFeedback.reasons.map(String).filter(Boolean)
            : [];
          const ingestedHumanFeedbackNotes = String(
            ingestedHumanFeedback.notes || readRecord(ingestedHumanFeedback.promptGuidance).note || "",
          ).trim();
          const ingestedPromptAvoid = [
            ...new Set([
              ...(Array.isArray(ingestedRemediation.promptDelta?.avoid)
                ? ingestedRemediation.promptDelta.avoid.map(String)
                : []),
              ...ingestedHumanFeedbackCategories,
              ...ingestedHumanFeedbackReasons,
            ].filter(Boolean)),
          ];
          const autoRemediation: PublicationQaRemediation = {
            ...ingestedRemediation,
            policyVersion: ingestedRemediation.policyVersion || "qa-remediation-v1",
            status: "auto-remediation-requested",
            reason: ingestedRemediation.reason || "qa-blocked-output",
            sourceGenerationJobId:
              ingestedRemediation.sourceGenerationJobId || generation.generationJobId || null,
            maxAttempts: ingestedMaxAttempts,
            attemptsUsed: ingestedAttemptsUsed,
            nextAction: "submit-regeneration",
            humanFeedback: Object.keys(ingestedHumanFeedback).length > 0 ? ingestedHumanFeedback : undefined,
            promptDelta: {
              ...(ingestedRemediation.promptDelta || {}),
              avoid: ingestedPromptAvoid,
              instruction: [
                ingestedRemediation.promptDelta?.instruction ||
                  "Regenerate with safer crop, clearer body geometry, and no malformed visible hands or feet.",
                ingestedHumanFeedbackNotes ? `Human review note: ${ingestedHumanFeedbackNotes}` : "",
              ].filter(Boolean).join(" "),
            },
          };
          const remediationResult = await generatePublicationImages({
            publicationJobId: createdJob.publicationJobId,
            mode: "comfy-cloud-api",
            remediation: autoRemediation,
          });
          setCreatedJob(remediationResult.job);
          setGeneration(remediationResult.generation);
          setGenerationAttempts((current) => [
            remediationResult.generation,
            ...current.filter(
              (item) => item.generationJobId !== remediationResult.generation.generationJobId,
            ),
          ]);
          setGenerationMessage(
            `Generation was blocked by QA. Remediation attempt ${ingestedAttemptsUsed + 1}/${ingestedMaxAttempts} submitted automatically.`,
          );
          void refreshTimeline(remediationResult.job.publicationJobId);
          return;
        }
      }
      void refreshTimeline(createdJob.publicationJobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh generation status";
      setGenerationMessage(message);
      setError(message);
    } finally {
      setGenerationRefreshBusy(false);
    }
  }

  async function handleLoadJobById() {
    const publicationJobId = loadJobId.trim();
    if (!publicationJobId) return;
    setLoadBusy(true);
    setError(null);
    setLoadMessage(null);
    try {
      const jobs = await listPublicationJobs({ publicationJobId, limit: 1 });
      if (!jobs[0]) {
        throw new Error("Publication job was not found.");
      }
      applyLoadedJob(jobs[0]);
      setLoadMessage("Existing publication job loaded.");
      setShowRecentJobsModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load publication job");
    } finally {
      setLoadBusy(false);
    }
  }

  useEffect(() => {
    if (!isGenerationActive) return;
    const interval = window.setInterval(() => {
      void handleRefreshGeneration({ silent: true });
    }, 7000);
    return () => window.clearInterval(interval);
  }, [isGenerationActive, createdJob?.publicationJobId, generation?.generationJobId, generationRefreshBusy]);

  async function handleLoadRecentJobs() {
    setLoadBusy(true);
    setError(null);
    setLoadMessage(null);
    setShowRecentJobsModal(true);
    try {
      const jobs = await listPublicationJobs({
        avatar,
        scene,
        limit: 8,
      });
      setRecentJobs(jobs);
      setLoadMessage(jobs.length ? "Recent jobs loaded." : "No recent jobs found.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recent publication jobs");
    } finally {
      setLoadBusy(false);
    }
  }

  async function handleCreate() {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    setCreatedJob(null);
    setBriefText("");
    setBriefMessage(null);
    setPromptPackText("");
    setPromptPackMessage(null);
    setCopyPackText("");
    setCopyPackMessage(null);
    setPublishingExport(null);
    setExportMessage(null);
    setPublishedRecord(null);
    setPublishMessage(null);
    setPublishedUrl("");
    setPublishedAt("");
    setPublishedNotes("");
    setGeneration(null);
    setGenerationMessage(null);
    setComfyOutputUrl("");
    setIngestResult(null);
    setLatestAsset(null);
    setSelectedAsset(null);
    setTimeline(null);
    setTimelineMessage(null);
    try {
      const job = await createPublicationJob({
        avatar,
        scene,
        format,
        objective: operatorObjective,
      });
      setCreatedJob(job);
      if (job.brief) {
        setBriefText(JSON.stringify(job.brief, null, 2));
      }
      if (job.promptPack) {
        setPromptPackText(JSON.stringify(job.promptPack, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create publication job");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateBrief(options: { saveEdited: boolean }) {
    if (!createdJob?.publicationJobId) return;
    setBriefBusy(true);
    setError(null);
    setBriefMessage(null);

    try {
      let editedBrief: PublicationBrief | undefined;
      if (options.saveEdited) {
        editedBrief = JSON.parse(briefText) as PublicationBrief;
      }

      const result = await generatePublicationBrief({
        publicationJobId: createdJob.publicationJobId,
        ...(editedBrief ? { brief: editedBrief } : {}),
      });

      setCreatedJob(result.job);
      setBriefText(JSON.stringify(result.brief, null, 2));
      if (result.job.promptPack) {
        setPromptPackText(JSON.stringify(result.job.promptPack, null, 2));
      }
      setBriefMessage(options.saveEdited ? "Brief saved." : "Brief generated.");
    } catch (err) {
      await handleStepFailure("generate-brief", err, "Failed to generate publication brief");
    } finally {
      setBriefBusy(false);
    }
  }

  async function handleApplyBriefFeedback() {
    if (!createdJob?.publicationJobId || !briefFeedback.trim()) return;
    setBriefBusy(true);
    setError(null);
    setBriefMessage(null);

    try {
      const currentBrief = briefText.trim()
        ? (JSON.parse(briefText) as PublicationBrief)
        : ({} as PublicationBrief);
      const feedback = briefFeedback.trim();

      const result = await generatePublicationBrief({
        publicationJobId: createdJob.publicationJobId,
        briefFeedback: {
          notes: feedback,
          currentBrief,
          createdAt: new Date().toISOString(),
        },
      });

      setCreatedJob(result.job);
      setBriefText(JSON.stringify(result.brief, null, 2));
      setBriefFeedback("");
      setPromptPackText("");
      setPromptPackMessage(null);
      setGeneration(null);
      setLatestAsset(null);
      setSelectedAsset(null);
      setBriefMessage("Brief updated with operator feedback.");
    } catch (err) {
      await handleStepFailure("generate-brief", err, "Failed to apply brief feedback");
    } finally {
      setBriefBusy(false);
    }
  }

  async function handleGeneratePromptPack(options: { saveEdited: boolean }) {
    if (!createdJob?.publicationJobId) return;
    setPromptPackBusy(true);
    setError(null);
    setPromptPackMessage(null);

    try {
      let editedPromptPack: PublicationPromptPack | undefined;
      if (options.saveEdited) {
        editedPromptPack = JSON.parse(promptPackText) as PublicationPromptPack;
      }

      const result = await generatePublicationPromptPack({
        publicationJobId: createdJob.publicationJobId,
        ...(editedPromptPack ? { promptPack: editedPromptPack } : {}),
      });

      setCreatedJob(result.job);
      setPromptPackText(JSON.stringify(result.promptPack, null, 2));
      setGeneration(null);
      setGenerationMessage(null);
      setComfyOutputUrl("");
      setIngestResult(null);
      setLatestAsset(null);
      setSelectedAsset(null);
      setCopyPackText("");
      setCopyPackMessage(null);
      setPublishingExport(null);
      setExportMessage(null);
      setPublishedRecord(null);
      setPublishMessage(null);
      setPromptPackMessage(options.saveEdited ? "Prompt pack saved." : "Prompt pack generated.");
    } catch (err) {
      await handleStepFailure("generate-prompt-pack", err, "Failed to generate publication prompt pack");
    } finally {
      setPromptPackBusy(false);
    }
  }

  async function handlePrepareReferences() {
    if (!createdJob?.publicationJobId) return;
    setPrepareReferencesBusy(true);
    setError(null);
    setPromptPackMessage(null);

    try {
      const result = await preparePublicationReferences({
        publicationJobId: createdJob.publicationJobId,
      });
      if (result.job) {
        setCreatedJob(result.job);
        if (result.job.promptPack) {
          setPromptPackText(JSON.stringify(result.job.promptPack, null, 2));
        }
      }
      setPromptPackMessage(
        `References prepared: ${result.preparedCount || 0}. Failures: ${result.failedCount || 0}.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to prepare references";
      setPromptPackMessage(message);
      setError(message);
    } finally {
      setPrepareReferencesBusy(false);
    }
  }

  async function handleGenerateImages() {
    if (!createdJob?.publicationJobId) return;
    setGenerationBusy(true);
    setError(null);
    setGenerationMessage(null);

    try {
      const result = await generatePublicationImages({
        publicationJobId: createdJob.publicationJobId,
        mode: "comfy-cloud-api",
      });
      setCreatedJob(result.job);
      setGeneration(result.generation);
      setGenerationAttempts((current) => [result.generation, ...current.filter((item) => item.generationJobId !== result.generation.generationJobId)]);
      setIngestResult(null);
      setLatestAsset(null);
      setSelectedAsset(null);
      setCopyPackText("");
      setCopyPackMessage(null);
      setPublishingExport(null);
      setExportMessage(null);
      setPublishedRecord(null);
      setPublishMessage(null);
      setGenerationMessage("Generation submitted. The console will refresh until the output is ready.");
      void refreshTimeline(result.job.publicationJobId);
    } catch (err) {
      await handleStepFailure("generate-images", err, "Failed to submit image generation");
    } finally {
      setGenerationBusy(false);
    }
  }

  async function handleStartQaRemediation() {
    if (!createdJob?.publicationJobId || !remediationCanContinue) return;
    setGenerationBusy(true);
    setError(null);
    setGenerationMessage(null);

    try {
      const activePromptAvoid = Array.isArray(activeQaRemediation.promptDelta?.avoid)
        ? activeQaRemediation.promptDelta.avoid.map(String)
        : qaDefectReasons.length
          ? qaDefectReasons
          : qaFlags;
      const remediation: PublicationQaRemediation = {
        ...activeQaRemediation,
        policyVersion: activeQaRemediation.policyVersion || "qa-remediation-v1",
        status: "remediation-requested",
        reason: activeQaRemediation.reason || "qa-blocked-output",
        sourceGenerationJobId:
          activeQaRemediation.sourceGenerationJobId || generation?.generationJobId || null,
        maxAttempts: remediationMaxAttempts,
        attemptsUsed: remediationAttemptsUsed,
        nextAction: "submit-regeneration",
        humanFeedback: Object.keys(latestHumanFeedback).length > 0 ? latestHumanFeedback : undefined,
        promptDelta: {
          ...(activeQaRemediation.promptDelta || {}),
          avoid: [
            ...new Set([
              ...activePromptAvoid,
              ...latestHumanFeedbackCategories,
              ...latestHumanFeedbackReasons,
            ].filter(Boolean)),
          ],
          instruction: [
            activeQaRemediation.promptDelta?.instruction ||
              "Regenerate with safer crop, clearer body geometry, and no malformed visible hands or feet.",
            latestHumanFeedbackNotes ? `Human review note: ${latestHumanFeedbackNotes}` : "",
          ].filter(Boolean).join(" "),
        },
      };
      const result = await generatePublicationImages({
        publicationJobId: createdJob.publicationJobId,
        mode: "comfy-cloud-api",
        remediation,
      });
      setCreatedJob(result.job);
      setGeneration(result.generation);
      setGenerationAttempts((current) => [
        result.generation,
        ...current.filter((item) => item.generationJobId !== result.generation.generationJobId),
      ]);
      setIngestResult(null);
      setLatestAsset(null);
      setSelectedAsset(null);
      setActiveStage("images");
      setGenerationMessage(
        `QA remediation attempt ${remediationAttemptsUsed + 1}/${remediationMaxAttempts} submitted.`,
      );
      void refreshTimeline(result.job.publicationJobId);
    } catch (err) {
      await handleStepFailure("generate-images", err, "Failed to submit QA remediation generation");
    } finally {
      setGenerationBusy(false);
    }
  }

  async function handleIngestComfyOutput() {
    if (!createdJob?.publicationJobId || !generation?.generationJobId || !comfyOutputUrl.trim()) {
      return;
    }
    setIngestBusy(true);
    setError(null);
    setGenerationMessage(null);

    try {
      const result = await ingestComfyOutput({
        publicationJobId: createdJob.publicationJobId,
        generationJobId: generation.generationJobId,
        outputUrl: comfyOutputUrl.trim(),
      });
      setIngestResult(result);
      setLatestAsset({
        assetId: result.assetId,
        objectPath: result.objectPath,
        bucket: result.bucket,
        status: "raw",
      });
      setSelectedAsset(null);
      setGeneration((current) =>
        current
          ? {
              ...current,
              status: result.generationStatus || current.status,
              assetId: result.assetId,
              generatedAssetId: result.generatedAssetId,
              objectPath: result.objectPath,
            }
          : current,
      );
      setCreatedJob((current) =>
        current
          ? {
              ...current,
              status: result.publicationStatus || "review-ready",
            }
          : current,
      );
      setGenerationMessage("Comfy output ingested.");
    } catch (err) {
      await handleStepFailure("ingest-output", err, "Failed to ingest Comfy output");
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleSelectPublicationAsset() {
    if (!createdJob?.publicationJobId || !latestAsset?.assetId) {
      return;
    }
    setSelectAssetBusy(true);
    setError(null);
    setGenerationMessage(null);

    try {
      const review: PublicationQualityReview = {
        contractVersion: "publication-quality-review-v1",
        decision: "select-for-publication",
        criteria: qualityCriteria,
        reasons: [],
        notes: qualityNotes.trim() || "Selected for publication job via Avatares AI Console",
        reviewedAt: new Date().toISOString(),
      };
      const result = await selectPublicationAsset({
        publicationJobId: createdJob.publicationJobId,
        assetId: latestAsset.assetId,
        reviewNotes: JSON.stringify(review),
      });
      setSelectedAsset(result.asset || latestAsset);
      if (result.job) {
        setCreatedJob(result.job);
      } else {
        setCreatedJob((current) =>
          current
            ? {
                ...current,
                status: result.publicationStatus || "assets-ready",
              }
            : current,
        );
      }
      setLatestAsset((current) =>
        current
          ? {
              ...current,
              status: "selected",
            }
          : current,
      );
      setIngestResult((current) =>
        current
          ? {
              ...current,
              publicationStatus: result.publicationStatus,
            }
          : current,
      );
      setGenerationMessage("Publication asset selected.");
    } catch (err) {
      await handleStepFailure("select-asset", err, "Failed to select publication asset");
    } finally {
      setSelectAssetBusy(false);
    }
  }

  async function handleRejectPublicationAsset(decision: PublicationQualityReview["decision"]) {
    if (!latestAsset?.assetId) {
      return;
    }
    setRejectAssetBusy(true);
    setError(null);
    setGenerationMessage(null);

    try {
      const review: PublicationQualityReview = {
        contractVersion: "publication-quality-review-v1",
        decision,
        criteria: qualityCriteria,
        reasons: rejectionReasons,
        notes: qualityNotes.trim() || "Rejected for publication quality reasons.",
        reviewedAt: new Date().toISOString(),
      };
      const result = await rejectAsset(latestAsset.assetId, JSON.stringify(review));
      if (!result.rejected) {
        throw new Error(result.reason || "Publication asset was not rejected.");
      }
      setLatestAsset((current) =>
        current
          ? {
              ...current,
              status: "rejected",
              reviewNotes: JSON.stringify(review),
              metadata: {
                ...readRecord(current.metadata),
                publicationQualityReview: review,
              },
            }
          : current,
      );
      setSelectedAsset(null);
      setGenerationMessage(
        decision === "reject-as-canonical"
          ? "Asset rejected for publication and canonical identity use."
          : "Asset rejected for this publication.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reject publication asset";
      setGenerationMessage(message);
      setError(message);
    } finally {
      setRejectAssetBusy(false);
    }
  }

  async function handleGenerateCopyPack(options: { saveEdited: boolean }) {
    if (!createdJob?.publicationJobId) return;
    setCopyPackBusy(true);
    setError(null);
    setCopyPackMessage(null);
    setPublishingExport(null);
    setExportMessage(null);
    setPublishedRecord(null);
    setPublishMessage(null);

    try {
      let editedCopyPack: PublicationCopyPack | undefined;
      if (options.saveEdited) {
        editedCopyPack = JSON.parse(copyPackText) as PublicationCopyPack;
      }

      const result = await generatePublicationCopyPack({
        publicationJobId: createdJob.publicationJobId,
        ...(editedCopyPack ? { copyPack: editedCopyPack } : {}),
      });
      setCreatedJob(result.job);
      setCopyPackText(JSON.stringify(result.copyPack, null, 2));
      setCopyPackMessage(options.saveEdited ? "Copy pack saved." : "Copy pack generated.");
      setPublishingExport(null);
      setExportMessage(null);
      setPublishedRecord(null);
      setPublishMessage(null);
    } catch (err) {
      await handleStepFailure("generate-copy-pack", err, "Failed to generate publication copy pack");
    } finally {
      setCopyPackBusy(false);
    }
  }

  async function handleExportPublishingPack() {
    if (!createdJob?.publicationJobId) return;
    setExportBusy(true);
    setError(null);
    setExportMessage(null);

    try {
      const copyPack = copyPackText ? (JSON.parse(copyPackText) as PublicationCopyPack) : undefined;
      const result = await exportPublicationPack({
        publicationJobId: createdJob.publicationJobId,
        ...(copyPack?.primaryCaption ? { finalCaption: copyPack.primaryCaption } : {}),
        ...(copyPack?.hashtags ? { hashtags: copyPack.hashtags } : {}),
        ...(copyPack?.platform ? { platform: copyPack.platform } : {}),
        ...(copyPack?.publishingNotes ? { publishingNotes: copyPack.publishingNotes } : {}),
      });
      setCreatedJob(result.job);
      setPublishingExport(result.publishingExport);
      setPublishPlatform(result.publishingExport.platform || "instagram");
      setExportMessage("Publishing pack exported.");
    } catch (err) {
      await handleStepFailure("export-pack", err, "Failed to export publishing pack");
    } finally {
      setExportBusy(false);
    }
  }

  async function handleMarkPublished() {
    if (!createdJob?.publicationJobId || !publishedUrl.trim() || !publishPlatform.trim()) return;
    setPublishBusy(true);
    setError(null);
    setPublishMessage(null);

    try {
      const result = await markPublicationPublished({
        publicationJobId: createdJob.publicationJobId,
        platform: publishPlatform.trim(),
        account: publishAccount.trim(),
        publishedUrl: publishedUrl.trim(),
        publishedAt: publishedAt.trim(),
        notes: publishedNotes.trim(),
      });
      setCreatedJob(result.job);
      setPublishedRecord(result.publishedRecord);
      setPublishMessage("Publication marked as published.");
    } catch (err) {
      await handleStepFailure("mark-published", err, "Failed to mark publication as published");
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleRetryFailedStep() {
    if (!createdJob?.publicationJobId || !canRetryFromConsole || !retryableFailedStep) return;
    setRetryBusy(true);
    setError(null);
    setTimelineMessage(null);

    try {
      const prepared = await retryPublicationJob({
        publicationJobId: createdJob.publicationJobId,
        retryStep: retryableFailedStep,
      });
      setCreatedJob(prepared.job);

      if (prepared.retryStep === "generate-brief") {
        const result = await generatePublicationBrief({
          publicationJobId: prepared.job.publicationJobId,
        });
        setCreatedJob(result.job);
        setBriefText(JSON.stringify(result.brief, null, 2));
        setBriefMessage("Brief generated after retry.");
      } else if (prepared.retryStep === "generate-prompt-pack") {
        const result = await generatePublicationPromptPack({
          publicationJobId: prepared.job.publicationJobId,
        });
        setCreatedJob(result.job);
        setPromptPackText(JSON.stringify(result.promptPack, null, 2));
        setPromptPackMessage("Prompt pack generated after retry.");
      } else if (prepared.retryStep === "generate-images") {
        const result = await generatePublicationImages({
          publicationJobId: prepared.job.publicationJobId,
          mode: "comfy-cloud-api",
        });
        setCreatedJob(result.job);
        setGeneration(result.generation);
        setGenerationMessage("Generation job submitted after retry.");
      } else if (prepared.retryStep === "generate-copy-pack") {
        const result = await generatePublicationCopyPack({
          publicationJobId: prepared.job.publicationJobId,
        });
        setCreatedJob(result.job);
        setCopyPackText(JSON.stringify(result.copyPack, null, 2));
        setCopyPackMessage("Copy pack generated after retry.");
      }

      void refreshTimeline(prepared.job.publicationJobId);
    } catch (err) {
      await handleStepFailure(
        retryableFailedStep,
        err,
        "Failed to retry publication step",
      );
    } finally {
      setRetryBusy(false);
    }
  }

  const recommendedPrimaryAction = (() => {
    if (!createdJob) return null;
    if (createdJob.status === "failed") {
      return {
        label: canRetryFromConsole ? `Retry ${retryableFailedStep}` : "Open job details",
        disabled: canRetryFromConsole ? retryBusy : false,
        busy: retryBusy,
        onClick: () => {
          if (canRetryFromConsole) {
            void handleRetryFailedStep();
          } else {
            setActiveStage("job");
          }
        },
      };
    }
    if (publishedRecord || createdJob.status === "published") {
      return {
        label: "View published package",
        disabled: false,
        busy: false,
        onClick: () => setActiveStage("publish"),
      };
    }
    if (!briefText) {
      return {
        label: "Generate brief",
        disabled: briefBusy,
        busy: briefBusy,
        onClick: () => void handleGenerateBrief({ saveEdited: false }),
      };
    }
    if (!promptPackText) {
      return {
        label: "Generate visual direction",
        disabled: promptPackBusy,
        busy: promptPackBusy,
        onClick: () => void handleGeneratePromptPack({ saveEdited: false }),
      };
    }
    if (isGenerationActive) {
      return {
        label: "Refresh image status",
        disabled: generationRefreshBusy,
        busy: generationRefreshBusy,
        onClick: () => void handleRefreshGeneration(),
      };
    }
    if (!latestAsset?.assetId) {
      return {
        label: "Generate image",
        disabled: generationBusy,
        busy: generationBusy,
        onClick: () => void handleGenerateImages(),
      };
    }
    if (latestAsset.status === "rejected" && !selectedAsset?.assetId) {
      return {
        label: "Generate replacement image",
        disabled: generationBusy,
        busy: generationBusy,
        onClick: () => void handleGenerateImages(),
      };
    }
    if (!selectedAsset?.assetId) {
      return {
        label: "Review image",
        disabled: false,
        busy: false,
        onClick: () => setActiveStage("review"),
      };
    }
    if (!copyPackText) {
      return {
        label: "Generate caption",
        disabled: copyPackBusy,
        busy: copyPackBusy,
        onClick: () => void handleGenerateCopyPack({ saveEdited: false }),
      };
    }
    if (!publishingExport) {
      return {
        label: "Prepare publishing package",
        disabled: exportBusy,
        busy: exportBusy,
        onClick: () => void handleExportPublishingPack(),
      };
    }
    return {
      label: "Open publish step",
      disabled: false,
      busy: false,
      onClick: () => setActiveStage("publish"),
    };
  })();

  return (
    <div className="space-y-5">
      {catalogOptionsLoading && (
        <p className="text-sm text-gray-500">Loading catalog options...</p>
      )}

      <SectionPanel
        title="Create Publication Job"
        description="Start an Estefania influencer publication workflow."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleLoadRecentJobs()}
              disabled={loadBusy}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
            >
              {loadBusy ? "Loading..." : "Load recent"}
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={busy || !canCreate}
              className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? <LoadingSpinner className="size-4" label="Creating..." /> : null}
              {busy ? "Creating..." : "Create job"}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CatalogSelect
            label="Avatar"
            value={avatar}
            options={catalogOptions.avatars}
            onChange={(nextAvatar) => {
              setAvatar(nextAvatar);
              const nextScenes = scenesForAvatar(catalogOptions.scenes, nextAvatar);
              setScene(nextScenes[0]?.value ?? defaultFilters.scene);
            }}
            disabled={busy}
          />

          <CatalogSelect
            label="Scene"
            value={scene}
            options={sceneOptions}
            onChange={setScene}
            disabled={busy}
          />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as PublicationFormat)}
              disabled={busy}
              className={inputClass}
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">Business profile</span>
            <input
              value="influencer-brand"
              readOnly
              disabled
              className={`${inputClass} opacity-80`}
            />
          </label>
        </div>

        {avatarProfile && (
          <div className="mt-4 rounded-md border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-100">{avatarProfile.displayName}</p>
                <p className="mt-1 text-sm text-gray-400">{avatarProfile.primaryObjective}</p>
              </div>
              <a
                href={avatarProfile.primaryPlatform.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
              >
                {avatarProfile.primaryPlatform.handle}
              </a>
            </div>
            <dl className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Business profile</dt>
                <dd className="mt-1 text-gray-200">{avatarProfile.businessProfile}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Content pillars</dt>
                <dd className="mt-1 text-gray-200">{avatarProfile.contentPillars.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Publishing mode</dt>
                <dd className="mt-1 text-gray-200">
                  {avatarProfile.primaryPlatform.publishingMode}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Brand fit</dt>
                <dd className="mt-1 text-gray-200">{avatarProfile.brandFit.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Caption tone</dt>
                <dd className="mt-1 text-gray-200">{avatarProfile.captionTone.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Review triggers</dt>
                <dd className="mt-1 text-gray-200">
                  {avatarProfile.safetyReviewTriggers.join(", ")}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">Objective</span>
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              disabled={busy}
              rows={4}
              className={`${inputClass} min-h-[110px] resize-y`}
            />
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Creative direction</p>
          <p className="mt-1 text-sm text-gray-400">
            Optional guidance for events, moods, details, or constraints. This is folded into the brief.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Topic or event</span>
              <input
                value={creativeTopic}
                onChange={(event) => setCreativeTopic(event.target.value)}
                disabled={busy}
                placeholder="World Cup, city birthday, product launch..."
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Mood</span>
              <input
                value={creativeMood}
                onChange={(event) => setCreativeMood(event.target.value)}
                disabled={busy}
                placeholder="celebratory, urban, reflective, playful..."
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Must include</span>
              <input
                value={creativeMustInclude}
                onChange={(event) => setCreativeMustInclude(event.target.value)}
                disabled={busy}
                placeholder="local landmark, football energy, birthday mention..."
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Avoid</span>
              <input
                value={creativeAvoid}
                onChange={(event) => setCreativeAvoid(event.target.value)}
                disabled={busy}
                placeholder="political tone, forced ad, cliché..."
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-gray-500">
          Internal defaults: avatarShort={avatarShort || "n/a"}, assetType=raw-image,
          status=draft.
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {createdJob && (
          <div className="mt-4 rounded-md border border-emerald-800/50 bg-emerald-950/30 p-4">
            <p className="text-sm font-medium text-emerald-200">Publication job created</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-500">publicationJobId</dt>
                <dd className="mt-0.5 font-mono text-gray-200">{createdJob.publicationJobId}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">status</dt>
                <dd className="mt-0.5 text-gray-200">{createdJob.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">format</dt>
                <dd className="mt-0.5 text-gray-200">{createdJob.format}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">avatar</dt>
                <dd className="mt-0.5 text-gray-200">
                  {optionLabel(catalogOptions.avatars, createdJob.avatar)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">scene</dt>
                <dd className="mt-0.5 text-gray-200">
                  {optionLabel(sceneOptions, createdJob.scene)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">createdAt</dt>
                <dd className="mt-0.5 text-gray-200">{createdJob.createdAt}</dd>
              </div>
            </dl>
          </div>
        )}
      </SectionPanel>

      {showRecentJobsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Continue publication job</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Pick a recent job for {optionLabel(catalogOptions.avatars, avatar)} / {optionLabel(sceneOptions, scene)}, or load a specific ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentJobsModal(false)}
                className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(85vh-90px)] overflow-y-auto p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-gray-400">publicationJobId</span>
                  <input
                    value={loadJobId}
                    onChange={(event) => setLoadJobId(event.target.value)}
                    disabled={loadBusy}
                    placeholder="dc539e40-c15f-47bb-9d7f-68ca901334e2"
                    className={inputClass}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void handleLoadJobById()}
                    disabled={loadBusy || !loadJobId.trim()}
                    className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                  >
                    {loadBusy ? "Loading..." : "Load job"}
                  </button>
                </div>
              </div>

              {loadMessage && (
                <p className="mt-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
                  {loadMessage}
                </p>
              )}

              {loadBusy ? (
                <div className="mt-4 flex items-center justify-center rounded-md border border-dashed border-border bg-surface px-4 py-10 text-sm text-gray-500">
                  <LoadingSpinner className="mr-2 size-4" label="Loading recent jobs..." />
                  Loading recent jobs...
                </div>
              ) : recentJobs.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-md border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-surface">
                      <tr className="text-left text-xs uppercase text-gray-500">
                        <th className="px-3 py-2 font-medium">Job</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Scene</th>
                        <th className="px-3 py-2 font-medium">Generation</th>
                        <th className="px-3 py-2 font-medium">Updated</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentJobs.map((item) => (
                        <tr key={item.job.publicationJobId} className="text-gray-300">
                          <td className="px-3 py-2 font-mono text-xs">
                            {item.job.publicationJobId.slice(0, 8)}...
                          </td>
                          <td className="px-3 py-2">{item.job.status}</td>
                          <td className="px-3 py-2">{optionLabel(sceneOptions, item.job.scene)}</td>
                          <td className="px-3 py-2">{item.generation?.status || "none"}</td>
                          <td className="px-3 py-2">{item.job.updatedAt}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                applyLoadedJob(item);
                                setLoadMessage("Existing publication job loaded.");
                                setShowRecentJobsModal(false);
                              }}
                              className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                            >
                              Continue
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-gray-500">
                  No recent jobs found for this character and scene.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {createdJob && (
        <div className="sticky top-3 z-20">
          <SectionPanel
            title="Recommended Action"
            description="The current operator step for this publication job."
          >
            <div
              className={`rounded-md border px-4 py-3 ${
                operatorNextAction?.tone === "warning"
                  ? "border-amber-800/60 bg-amber-950/40"
                  : operatorNextAction?.tone === "success"
                    ? "border-emerald-800/50 bg-emerald-950/30"
                    : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {humanJobStatus(createdJob.status)}
                  </p>
                  <p className="mt-2 text-base font-medium text-gray-100">
                    {operatorNextAction?.label || "Refresh timeline"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    {operatorNextAction?.description ||
                      "Load the timeline to identify the next operator step."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 lg:min-w-[280px]">
                  {recommendedPrimaryAction && (
                    <button
                      type="button"
                      onClick={recommendedPrimaryAction.onClick}
                      disabled={recommendedPrimaryAction.disabled}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {recommendedPrimaryAction.busy && (
                        <LoadingSpinner className="size-4" label="Working..." />
                      )}
                      {recommendedPrimaryAction.busy ? "Working..." : recommendedPrimaryAction.label}
                    </button>
                  )}
                  {technicalMode && (
                    <dl className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                      <div>
                        <dt>status</dt>
                        <dd className="font-mono text-gray-300">{createdJob.status}</dd>
                      </div>
                      <div>
                        <dt>publicationJobId</dt>
                        <dd className="break-all font-mono text-gray-300">
                          {createdJob.publicationJobId}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {publicationStages.map((stage) => {
                const selected = activeStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setActiveStage(stage.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface-overlay text-gray-300 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </SectionPanel>
        </div>
      )}

      {createdJob && (technicalMode || activeStage === "job") && (
        <SectionPanel
          title="Job Timeline"
          description="Track what has happened and the next required operator action."
          actions={
            <button
              type="button"
              onClick={() => void refreshTimeline(createdJob.publicationJobId)}
              disabled={timelineBusy}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
            >
              {timelineBusy ? "Refreshing..." : "Refresh timeline"}
            </button>
          }
        >
          {timelineMessage && (
            <p
              className={`mb-3 rounded-md border px-3 py-2 text-sm ${
                timeline
                  ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-200"
                  : "border-amber-800/60 bg-amber-950/40 text-amber-200"
              }`}
            >
              {timelineMessage}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Current status</p>
              <p className="mt-2 text-lg font-medium text-gray-100">
                {humanJobStatus(timeline?.status || createdJob.status)}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Next action</p>
              <p className="mt-2 text-sm font-medium text-gray-100">
                {timeline?.nextAction.label || "Refresh timeline"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                {timeline?.nextAction.description ||
                  "Load the timeline to identify the next operator step."}
              </p>
              {timeline?.errorMessage && (
                <p className="mt-4 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {timeline.errorMessage}
                </p>
              )}
              {canRetryFromConsole && (
                <button
                  type="button"
                  onClick={() => void handleRetryFailedStep()}
                  disabled={retryBusy}
                  className="mt-4 w-full rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {retryBusy ? "Retrying..." : `Retry ${retryableFailedStep}`}
                </button>
              )}
              {createdJob.status === "failed" && !canRetryFromConsole && (
                <p className="mt-4 rounded-md border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
                  This failure needs manual review or a dedicated retry handler.
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-surface p-4">
              {timelineBusy && !timeline ? (
                <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                  <LoadingSpinner className="mr-2 size-4" label="Loading timeline..." />
                  Loading timeline...
                </div>
              ) : timeline?.events.length ? (
                <ol className="space-y-3">
                  {timeline.events.map((event, index) => (
                    <li
                      key={`${event.eventType}-${event.createdAt || index}`}
                      className="grid gap-3 rounded-md border border-border bg-surface-overlay p-3 md:grid-cols-[150px_1fr]"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {event.status}
                        </p>
                        <p className="mt-1 break-words text-xs text-gray-400">
                          {event.createdAt || "pending"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-100">{event.label}</p>
                        {technicalMode && (
                          <p className="mt-1 font-mono text-xs text-gray-500">
                            {event.eventType}
                          </p>
                        )}
                        {event.errorMessage && (
                          <p className="mt-2 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                            {event.errorMessage}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
                  No timeline events loaded yet.
                </div>
              )}
            </div>
          </div>
        </SectionPanel>
      )}

      {createdJob && (technicalMode || activeStage === "brief") && (
        <SectionPanel
          title="Publication Brief"
          description="Generate or edit the creative brief before prompt-pack generation."
          actions={
            <>
              <button
                type="button"
                onClick={() => void handleGenerateBrief({ saveEdited: false })}
                disabled={briefBusy}
                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {briefBusy ? "Working..." : briefText ? "Regenerate brief" : "Generate brief"}
              </button>
              {technicalMode && briefText && (
                <button
                  type="button"
                  onClick={() => void handleGenerateBrief({ saveEdited: true })}
                  disabled={briefBusy}
                  className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                >
                  Save edited brief
                </button>
              )}
            </>
          }
        >
          {briefMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {briefMessage}
            </p>
          )}

          {briefText && !technicalMode ? (
            <div className="grid gap-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Creative direction</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-200">
                  {String(briefPreview.visualIntent || "Creative brief is ready.")}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Caption angle</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">
                    {String(briefPreview.captionAngle || "No caption angle provided.")}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Emotional tone</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">
                    {String(briefPreview.emotionalTone || "No emotional tone provided.")}
                  </p>
                </div>
              </div>

              {briefPreview.sceneNotes && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Scene notes</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">
                    {String(briefPreview.sceneNotes)}
                  </p>
                </div>
              )}

              {Array.isArray(briefPreview.captionSeeds) && briefPreview.captionSeeds.length > 0 && (
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Caption ideas</p>
                  <div className="mt-3 grid gap-2">
                    {briefPreview.captionSeeds.slice(0, 4).map((seed) => (
                      <p key={String(seed)} className="rounded-md bg-surface-overlay px-3 py-2 text-sm text-gray-200">
                        {String(seed)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(briefPreview.avoidRules) && briefPreview.avoidRules.length > 0 && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-300">Avoid</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {briefPreview.avoidRules.slice(0, 10).map((rule) => (
                      <span key={String(rule)} className="rounded-full bg-amber-900/50 px-2.5 py-1 text-xs text-amber-100">
                        {String(rule)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {lastBriefFeedbackNotes && (
                <div className="rounded-lg border border-blue-800/50 bg-blue-950/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-300">Last applied feedback</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">{lastBriefFeedbackNotes}</p>
                  {lastBriefFeedbackCreatedAt && (
                    <p className="mt-2 text-xs text-blue-200/70">
                      Applied {new Date(lastBriefFeedbackCreatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-gray-500">
                Technical brief JSON is hidden in standard mode.
              </p>

              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">What would you change?</p>
                <p className="mt-1 text-sm text-gray-400">
                  Add operator feedback without editing JSON. The brief will be updated and the next prompt should follow it.
                </p>
                <textarea
                  value={briefFeedback}
                  onChange={(event) => setBriefFeedback(event.target.value)}
                  disabled={briefBusy}
                  rows={3}
                  placeholder="Make it more urban and connect it with Bogota's birthday, but avoid tourist clichés."
                  className={`${inputClass} mt-3 min-h-[90px] w-full resize-y`}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApplyBriefFeedback()}
                    disabled={briefBusy || !briefFeedback.trim()}
                    className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {briefBusy ? "Applying..." : "Apply feedback to brief"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBriefFeedback("")}
                    disabled={briefBusy || !briefFeedback.trim()}
                    className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : briefText ? (
            <textarea
              value={briefText}
              onChange={(event) => {
                setBriefText(event.target.value);
                setBriefMessage(null);
              }}
              rows={18}
              disabled={briefBusy}
              className={`${inputClass} w-full resize-y font-mono text-xs leading-relaxed`}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
              No brief generated yet.
            </div>
          )}
        </SectionPanel>
      )}

      {createdJob && briefText && (technicalMode || activeStage === "prompt") && (
        <SectionPanel
          title="Prompt Pack"
          description="Create the Comfy-ready prompt pack from the approved publication brief."
          actions={
            <>
              <button
                type="button"
                onClick={() => void handleGeneratePromptPack({ saveEdited: false })}
                disabled={promptPackBusy}
                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {promptPackBusy
                  ? "Working..."
                  : promptPackText
                    ? "Regenerate prompt pack"
                    : "Generate prompt pack"}
              </button>
              {technicalMode && promptPackText && (
                <button
                  type="button"
                  onClick={() => void handleGeneratePromptPack({ saveEdited: true })}
                  disabled={promptPackBusy}
                  className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                >
                  Save edited prompt pack
                </button>
              )}
              {technicalMode && promptPackText && (
                <button
                  type="button"
                  onClick={() => void handlePrepareReferences()}
                  disabled={prepareReferencesBusy}
                  className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                >
                  {prepareReferencesBusy ? "Preparing..." : "Prepare references"}
                </button>
              )}
            </>
          }
        >
          {promptPackMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {promptPackMessage}
            </p>
          )}

          {promptPackText && !technicalMode ? (
            <div className="grid gap-3 rounded-md border border-border bg-surface p-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Visual direction</p>
                <p className="mt-1 text-gray-200">
                  {String(promptOperatorSummary.visualDirection || promptPackPreview.sceneDetails || "Prompt pack is ready.")}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pose</p>
                  <p className="mt-1 text-gray-300">
                    {String(promptOperatorSummary.pose || promptCompositionPolicy.pose || "One coherent natural pose.")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Hands / risk control</p>
                  <p className="mt-1 text-gray-300">
                    {String(promptCompositionPolicy.hands || "Hands simple, relaxed, clearly readable, or mostly out of frame.")}
                  </p>
                </div>
              </div>
              {Array.isArray(promptOperatorSummary.riskControls) && promptOperatorSummary.riskControls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {promptOperatorSummary.riskControls.slice(0, 6).map((item) => (
                    <span key={String(item)} className="rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-300">
                      {String(item)}
                    </span>
                  ))}
                </div>
              )}
              {promptHumanFeedbackUsed && (
                <div className="rounded-md border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                    Human review memory used
                  </p>
                  <p className="mt-1 text-xs text-amber-100/90">
                    {Number(promptHumanFeedbackInfluence.feedbackCount || 0) || promptHumanFeedbackCategories.length} prior review
                    signal(s) influenced this prompt pack.
                  </p>
                  {promptHumanFeedbackCategories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {promptHumanFeedbackCategories.slice(0, 8).map((category) => (
                        <span key={category} className="rounded-full bg-amber-900/50 px-2 py-1 text-xs text-amber-100">
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Technical prompt JSON is hidden in standard mode.
              </p>
            </div>
          ) : promptPackText ? (
            <textarea
              value={promptPackText}
              onChange={(event) => {
                setPromptPackText(event.target.value);
                setPromptPackMessage(null);
              }}
              rows={20}
              disabled={promptPackBusy}
              className={`${inputClass} w-full resize-y font-mono text-xs leading-relaxed`}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
              No prompt pack generated yet.
            </div>
          )}
        </SectionPanel>
      )}

      {createdJob && promptPackText && (technicalMode || activeStage === "images" || activeStage === "review") && (
        <SectionPanel
          title="Image Generation"
          description="Submit the prompt pack to the image-generation stage."
          actions={
            <div className="flex flex-wrap gap-2">
              {generation && (
                <button
                  type="button"
                  onClick={() => void handleRefreshGeneration()}
                  disabled={generationRefreshBusy}
                  className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                >
                  {generationRefreshBusy ? "Refreshing..." : "Refresh status"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleGenerateImages()}
                disabled={generationBusy}
                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {generationBusy ? "Submitting..." : generation ? "Submit again" : "Generate images"}
              </button>
            </div>
          }
        >
          {generationMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {generationMessage}
            </p>
          )}

          {generation ? (
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-500">generationJobId</dt>
                  <dd className="mt-0.5 font-mono text-gray-200">{generation.generationJobId}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">status</dt>
                  <dd className="mt-0.5 text-gray-200">{generation.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">runMode</dt>
                  <dd className="mt-0.5 text-gray-200">{generation.runMode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">providerStatus</dt>
                  <dd className="mt-0.5 text-gray-200">
                    {readGenerationValue(generation, "providerStatus") || generationProviderStatus || "unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">tracking</dt>
                  <dd className="mt-0.5 text-gray-200">
                    {isGenerationActive ? "Auto-refreshing" : "Idle"}
                  </dd>
                </div>
              </dl>
              {generation.instructions && generation.instructions.length > 0 && (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-400">
                  {generation.instructions.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ol>
              )}

              {latestAsset?.assetId && (
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-100">Latest generated image</p>
                      <p className="mt-1 text-xs text-gray-500">
                        This is the newest ingested output for the active publication job.
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        qaStatus === "pass"
                          ? "bg-emerald-950 text-emerald-200"
                          : qaStatus === "review_required"
                            ? "bg-amber-950 text-amber-200"
                            : qaStatus === "blocked"
                              ? "bg-red-950 text-red-200"
                              : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      QA: {qaStatus}
                    </span>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
                    <PublicationAssetPreview asset={latestAsset} />
                    <div className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-gray-500">assetId</dt>
                        <dd className="mt-0.5 break-all font-mono text-xs text-gray-200">
                          {latestAsset.assetId}
                        </dd>
                      </div>
                      {latestAsset.objectPath && (
                        <div>
                          <dt className="text-xs text-gray-500">objectPath</dt>
                          <dd className="mt-0.5 break-all font-mono text-xs text-gray-400">
                            {latestAsset.objectPath}
                          </dd>
                        </div>
                      )}
                      <QaSummary qa={latestAssetQa} defective={latestAssetDefective} />
                      {assetImageUrl(latestAsset) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <a
                            href={assetImageUrl(latestAsset) || undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 transition hover:border-gray-500 hover:text-white"
                          >
                            Open image
                          </a>
                          <CopyButton value={assetImageUrl(latestAsset) || ""} label="Copy image URL" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {generationAttempts.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-surface">
                      <tr className="text-left text-xs uppercase text-gray-500">
                        <th className="px-3 py-2 font-medium">Attempt</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Provider</th>
                        <th className="px-3 py-2 font-medium">Asset</th>
                        <th className="px-3 py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {generationAttempts.map((attempt) => (
                        <tr key={attempt.generationJobId} className="text-gray-300">
                          <td className="px-3 py-2 font-mono text-xs">
                            {attempt.generationJobId.slice(0, 8)}...
                          </td>
                          <td className="px-3 py-2">{attempt.status || "unknown"}</td>
                          <td className="px-3 py-2">
                            {readGenerationValue(attempt, "providerStatus") || "unknown"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {assetImageUrl({
                              assetId: readGenerationValue(attempt, "assetId"),
                              bucket: readGenerationValue(attempt, "bucket") || latestAsset?.bucket || null,
                              objectPath: readGenerationValue(attempt, "objectPath"),
                            }) ? (
                              <a
                                href={
                                  assetImageUrl({
                                    assetId: readGenerationValue(attempt, "assetId"),
                                    bucket: readGenerationValue(attempt, "bucket") || latestAsset?.bucket || null,
                                    objectPath: readGenerationValue(attempt, "objectPath"),
                                  }) || undefined
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-border bg-surface-overlay px-2 py-1 text-gray-200 hover:border-gray-500 hover:text-white"
                              >
                                Open
                              </a>
                            ) : (
                              <span className="font-mono">
                                {(readGenerationValue(attempt, "assetId") || "").slice(0, 8) || "none"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {String(attempt.updatedAt || attempt.completedAt || attempt.startedAt || "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-md border border-border bg-surface p-4">
                {technicalMode && (
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-gray-400">Comfy output URL</span>
                      <input
                        value={comfyOutputUrl}
                        onChange={(event) => setComfyOutputUrl(event.target.value)}
                        disabled={ingestBusy}
                        placeholder="https://cloud.comfy.org/api/view?filename=..."
                        className={inputClass}
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => void handleIngestComfyOutput()}
                        disabled={ingestBusy || !comfyOutputUrl.trim()}
                        className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                      >
                        {ingestBusy ? "Ingesting..." : "Ingest output"}
                      </button>
                    </div>
                  </div>
                )}

                {ingestResult && (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs text-gray-500">assetId</dt>
                      <dd className="mt-0.5 font-mono text-gray-200">{ingestResult.assetId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">publicationStatus</dt>
                      <dd className="mt-0.5 text-gray-200">{ingestResult.publicationStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">generationStatus</dt>
                      <dd className="mt-0.5 text-gray-200">{ingestResult.generationStatus}</dd>
                    </div>
                    {ingestResult.objectPath && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs text-gray-500">objectPath</dt>
                        <dd className="mt-0.5 break-all font-mono text-gray-200">
                          {ingestResult.objectPath}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                {latestAsset?.assetId && (
                  <div className="mt-4 rounded-md border border-border bg-surface-overlay p-3">
                    <div className="grid gap-4 lg:grid-cols-[minmax(220px,320px)_1fr]">
                      <PublicationAssetPreview asset={latestAsset} />
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                        <p className="text-sm font-medium text-gray-200">Publication asset</p>
                        <p className="mt-1 break-all font-mono text-xs text-gray-500">
                          {latestAsset.assetId}
                        </p>
                        {assetImageUrl(latestAsset) && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <a
                              href={assetImageUrl(latestAsset) || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-gray-200 transition hover:border-gray-500 hover:text-white"
                            >
                              Open image
                            </a>
                            <CopyButton value={assetImageUrl(latestAsset) || ""} label="Copy image URL" />
                          </div>
                        )}
                        {selectedAsset?.assetId === latestAsset.assetId && (
                          <p className="mt-2 text-sm text-emerald-200">
                            Selected for this publication job.
                          </p>
                        )}
                        {latestAsset.status === "rejected" && (
                          <div className="mt-3 rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                            <p className="font-medium">Image rejected.</p>
                            <p className="mt-1 text-xs text-amber-200">
                              This candidate was discarded. Use the recommended action to generate a replacement image.
                            </p>
                          </div>
                        )}
                        <div className="mt-3">
                          <QaSummary qa={latestAssetQa} defective={latestAssetDefective} />
                        </div>
                        {latestAssetDefective && (
                          <div className="mt-3 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-100">
                            <p className="font-medium">Blocked from normal selection.</p>
                            <p className="mt-1 text-red-200">
                              {qaDefectReasons.length
                                ? qaDefectReasons.slice(0, 4).join(", ")
                                : qaFlags.slice(0, 4).join(", ") || "QA marked this output as defective."}
                            </p>
                            {typeof qaRemediation.status === "string" && (
                              <p className="mt-1 text-red-200">Remediation: {qaRemediation.status}</p>
                            )}
                            <div className="mt-3 rounded-md border border-red-800/70 bg-red-950/50 p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-red-100">QA remediation loop</p>
                                  <p className="mt-1 text-red-200">
                                    Attempt {Math.min(remediationAttemptsUsed, remediationMaxAttempts)}/
                                    {remediationMaxAttempts}
                                    {remediationExhausted ? " exhausted; human review required." : " available."}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleStartQaRemediation()}
                                  disabled={generationBusy || !remediationCanContinue}
                                  className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                                >
                                  {generationBusy
                                    ? "Submitting..."
                                    : remediationExhausted
                                      ? "Attempts exhausted"
                                      : "Generate safer attempt"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {latestAssetQualityReview && (
                          <p className="mt-2 text-xs text-gray-500">
                            Last review: {latestAssetQualityReview.decision}
                          </p>
                        )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleRejectPublicationAsset("reject-for-publication")}
                          disabled={
                            rejectAssetBusy ||
                            selectedAsset?.assetId === latestAsset.assetId ||
                            latestAsset.status === "rejected"
                          }
                          className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs font-medium text-red-100 hover:border-red-600 disabled:opacity-50"
                        >
                          {latestAsset.status === "rejected"
                            ? "Already rejected"
                            : rejectAssetBusy
                              ? "Rejecting..."
                              : "Reject for publication"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRejectPublicationAsset("reject-as-canonical")}
                          disabled={
                            rejectAssetBusy ||
                            selectedAsset?.assetId === latestAsset.assetId ||
                            latestAsset.status === "rejected"
                          }
                          className="rounded-md border border-amber-900 bg-amber-950 px-3 py-2 text-xs font-medium text-amber-100 hover:border-amber-600 disabled:opacity-50"
                        >
                          Reject as canonical
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSelectPublicationAsset()}
                          disabled={
                            selectAssetBusy ||
                            selectedAsset?.assetId === latestAsset.assetId ||
                            !latestAsset.assetId ||
                            latestAsset.status === "rejected" ||
                            qaStatus === "blocked"
                          }
                          className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                        >
                          {selectAssetBusy
                            ? "Selecting..."
                            : selectedAsset?.assetId === latestAsset.assetId
                              ? "Selected"
                              : latestAsset.status === "rejected"
                                ? "Rejected"
                              : qaStatus === "blocked"
                                ? "Blocked by QA"
                              : "Select for publication"}
                        </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500">Quality checklist</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {QUALITY_CRITERIA.map((criterion) => (
                            <label
                              key={criterion.id}
                              className="flex gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-300"
                              title={criterion.help}
                            >
                              <input
                                type="checkbox"
                                checked={qualityCriteria[criterion.id]}
                                onChange={(event) =>
                                  setQualityCriteria((current) => ({
                                    ...current,
                                    [criterion.id]: event.target.checked,
                                  }))
                                }
                              />
                              <span>{criterion.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase text-gray-500">Rejection reasons</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {REJECTION_REASONS.map((reason) => (
                            <label
                              key={reason.id}
                              className="flex gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-300"
                            >
                              <input
                                type="checkbox"
                                checked={rejectionReasons.includes(reason.id)}
                                onChange={(event) =>
                                  setRejectionReasons((current) =>
                                    event.target.checked
                                      ? [...current, reason.id]
                                      : current.filter((item) => item !== reason.id),
                                  )
                                }
                              />
                              <span>{reason.label}</span>
                            </label>
                          ))}
                        </div>
                        <label className="mt-3 flex flex-col gap-1 text-sm">
                          <span className="text-gray-400">Review notes</span>
                          <textarea
                            value={qualityNotes}
                            onChange={(event) => setQualityNotes(event.target.value)}
                            rows={3}
                            className={inputClass}
                            placeholder="Describe identity, anatomy, composition, or publishing concerns."
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
              No generation job submitted yet.
            </div>
          )}
        </SectionPanel>
      )}

      {createdJob && selectedAsset?.assetId && (technicalMode || activeStage === "copy") && (
        <SectionPanel
          title="Caption / Copy Pack"
          description="Generate or edit the manual publishing copy for the selected asset."
          actions={
            <>
              <button
                type="button"
                onClick={() => void handleGenerateCopyPack({ saveEdited: false })}
                disabled={copyPackBusy}
                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {copyPackBusy
                  ? "Working..."
                  : copyPackText
                    ? "Regenerate copy"
                    : "Generate copy"}
              </button>
              {copyPackText && (
                <button
                  type="button"
                  onClick={() => void handleGenerateCopyPack({ saveEdited: true })}
                  disabled={copyPackBusy}
                  className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
                >
                  Save edited copy
                </button>
              )}
            </>
          }
        >
          {copyPackMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {copyPackMessage}
            </p>
          )}

          {copyPackText ? (
            <textarea
              value={copyPackText}
              onChange={(event) => {
                setCopyPackText(event.target.value);
                setCopyPackMessage(null);
              }}
              rows={18}
              disabled={copyPackBusy}
              className={`${inputClass} w-full resize-y font-mono text-xs leading-relaxed`}
            />
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
              No copy pack generated yet.
            </div>
          )}
        </SectionPanel>
      )}

      {createdJob && copyPackText && (technicalMode || activeStage === "publish") && (
        <SectionPanel
          title="Publishing Pack"
          description="Export the approved image and copy for manual publishing."
          actions={
            <button
              type="button"
              onClick={() => void handleExportPublishingPack()}
              disabled={exportBusy}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {exportBusy ? "Exporting..." : publishingExport ? "Regenerate export" : "Export pack"}
            </button>
          }
        >
          {exportMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {exportMessage}
            </p>
          )}

          {publishingExport ? (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="rounded-md border border-border bg-surface p-3">
                  {publishingExport.imageUrl ? (
                    <a href={publishingExport.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={publishingExport.imageUrl}
                        alt="Selected publication asset"
                        className="aspect-[4/5] w-full rounded-md object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center rounded-md border border-dashed border-border text-center text-xs text-gray-500">
                      No image URL available
                    </div>
                  )}
                  {publishingExport.imageUrl && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={publishingExport.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-border bg-surface-overlay px-2.5 py-1 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
                      >
                        Open image
                      </a>
                      <CopyButton value={publishingExport.imageUrl} label="Copy image URL" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-md border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-200">Final caption</h4>
                      <CopyButton value={publishingExport.finalCaption} label="Copy caption" />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                      {publishingExport.finalCaption}
                    </p>
                  </div>

                  <div className="rounded-md border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-200">Hashtags</h4>
                      <CopyButton
                        value={(publishingExport.hashtags || []).join(" ")}
                        label="Copy hashtags"
                      />
                    </div>
                    <p className="mt-3 break-words text-sm text-gray-300">
                      {(publishingExport.hashtags || []).join(" ")}
                    </p>
                  </div>

                  {publishingExport.publishingNotes && (
                    <div className="rounded-md border border-border bg-surface p-4">
                      <h4 className="text-sm font-medium text-gray-200">Publishing notes</h4>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                        {publishingExport.publishingNotes}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <CopyButton
                      value={`${publishingExport.finalCaption}\n\n${(publishingExport.hashtags || []).join(" ")}`}
                      label="Copy post text"
                    />
                    <CopyButton
                      value={JSON.stringify(publishingExport, null, 2)}
                      label="Copy export JSON"
                    />
                  </div>
                </div>
              </div>

              <dl className="grid gap-3 rounded-md border border-border bg-surface p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-gray-500">status</dt>
                  <dd className="mt-0.5 text-gray-200">{publishingExport.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">platform</dt>
                  <dd className="mt-0.5 text-gray-200">{publishingExport.platform}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">assetId</dt>
                  <dd className="mt-0.5 break-all font-mono text-gray-200">
                    {publishingExport.assetId || "n/a"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">exportedAt</dt>
                  <dd className="mt-0.5 text-gray-200">{publishingExport.exportedAt || "n/a"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
              No publishing pack exported yet.
            </div>
          )}
        </SectionPanel>
      )}

      {createdJob && publishingExport && (technicalMode || activeStage === "publish") && (
        <SectionPanel
          title="Published Record"
          description="Record the manual Instagram publication after posting."
          actions={
            <button
              type="button"
              onClick={() => void handleMarkPublished()}
              disabled={publishBusy || !publishedUrl.trim() || !publishPlatform.trim()}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {publishBusy ? "Saving..." : publishedRecord ? "Update published record" : "Mark published"}
            </button>
          }
        >
          {publishMessage && (
            <p className="mb-3 rounded-md border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
              {publishMessage}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Platform</span>
              <input
                value={publishPlatform}
                onChange={(event) => setPublishPlatform(event.target.value)}
                disabled={publishBusy}
                placeholder="instagram"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Account</span>
              <input
                value={publishAccount}
                onChange={(event) => setPublishAccount(event.target.value)}
                disabled={publishBusy}
                placeholder="@account"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-gray-400">Published URL</span>
              <input
                value={publishedUrl}
                onChange={(event) => setPublishedUrl(event.target.value)}
                disabled={publishBusy}
                placeholder="https://www.instagram.com/p/..."
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-400">Published at</span>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
                disabled={publishBusy}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="text-gray-400">Notes</span>
              <textarea
                value={publishedNotes}
                onChange={(event) => setPublishedNotes(event.target.value)}
                disabled={publishBusy}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </label>
          </div>

          {publishedRecord && (
            <div className="mt-4 rounded-md border border-emerald-800/50 bg-emerald-950/30 p-4">
              <p className="text-sm font-medium text-emerald-200">Publication recorded</p>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs text-gray-500">status</dt>
                  <dd className="mt-0.5 text-gray-200">{publishedRecord.status}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">platform</dt>
                  <dd className="mt-0.5 text-gray-200">{publishedRecord.platform}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">account</dt>
                  <dd className="mt-0.5 text-gray-200">{publishedRecord.account || "n/a"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">publishedAt</dt>
                  <dd className="mt-0.5 text-gray-200">{publishedRecord.publishedAt}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="text-xs text-gray-500">publishedUrl</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-2 break-all font-mono text-gray-200">
                    <a
                      href={publishedRecord.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent-hover"
                    >
                      {publishedRecord.publishedUrl}
                    </a>
                    <CopyButton value={publishedRecord.publishedUrl} label="Copy URL" />
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </SectionPanel>
      )}

      <SectionPanel title="Next Steps" description="Wave 1 publication flow">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-400">
          <li>Generate a structured brief with DeepSeek.</li>
          <li>Create a Comfy Cloud prompt pack.</li>
          <li>Generate images and ingest outputs.</li>
          <li>Review candidates and select a publication asset.</li>
          <li>Generate caption/copy and export the publishing pack.</li>
        </ol>
      </SectionPanel>
    </div>
  );
}
