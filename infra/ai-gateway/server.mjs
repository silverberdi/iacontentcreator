import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT || 8095);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_TOKEN || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const VISUAL_QA_API_KEY = process.env.VISUAL_QA_API_KEY || "";
const VISUAL_QA_BASE_URL = (process.env.VISUAL_QA_BASE_URL || "").replace(/\/$/, "");
const VISUAL_QA_MODEL = process.env.VISUAL_QA_MODEL || "";
const VISUAL_QA_PROVIDER = String(process.env.VISUAL_QA_PROVIDER || "").trim().toLowerCase();
const LOCAL_VISUAL_QA_URL = (process.env.LOCAL_VISUAL_QA_URL || "http://local-visual-qa:8096").replace(/\/$/, "");
const COMFYUI_API_KEY = process.env.COMFY_CLOUD_API_KEY || process.env.SILVERMAN_COMFYUI_API_KEY || "";
const COMFYUI_BASE_URL = (process.env.COMFY_CLOUD_BASE_URL || process.env.SILVERMAN_COMFYUI_BASE_URL || "https://cloud.comfy.org").replace(/\/$/, "");
const COMFYUI_API_PREFIX = `/${String(process.env.COMFY_CLOUD_API_PREFIX || process.env.SILVERMAN_COMFYUI_API_PREFIX || "/api").replace(/^\/+|\/+$/g, "")}`;
const COMFYUI_AUTH_HEADER_NAME = process.env.COMFY_CLOUD_AUTH_HEADER_NAME || process.env.SILVERMAN_COMFYUI_AUTH_HEADER_NAME || "X-API-Key";
const COMFYUI_SUBMIT_PATH = `/${String(process.env.COMFY_CLOUD_SUBMIT_PATH || process.env.SILVERMAN_COMFYUI_SUBMIT_PATH || "/prompt").replace(/^\/+|\/+$/g, "")}`;
const COMFYUI_UPLOAD_PATH = `/${String(process.env.COMFY_CLOUD_UPLOAD_PATH || process.env.SILVERMAN_COMFYUI_UPLOAD_PATH || "/upload/image").replace(/^\/+|\/+$/g, "")}`;
const COMFYUI_ENABLE_FACE_DETAILER = ["1", "true", "yes"].includes(
  String(process.env.COMFY_CLOUD_ENABLE_FACE_DETAILER || "").toLowerCase(),
);
const ESTEFANIA_COMFY_TEMPLATE_PATH = path.join(
  process.cwd(),
  "templates",
  "estefania-montealegre-api.json",
);
const DEFAULT_PROFILE_ROOT = fs.existsSync(path.join(process.cwd(), "profiles"))
  ? path.join(process.cwd(), "profiles")
  : path.join(process.cwd(), "infra", "ai-gateway", "profiles");
const AVATAR_PROFILE_ROOT = process.env.AVATAR_PROFILE_ROOT || DEFAULT_PROFILE_ROOT;

const REQUIRED_BRIEF_FIELDS = [
  "visualIntent",
  "captionAngle",
  "emotionalTone",
  "avoidRules",
  "suggestedFormat",
];

const REQUIRED_COPY_PACK_FIELDS = [
  "primaryCaption",
  "captionAlternatives",
  "hashtags",
  "publishingNotes",
];

const REQUIRED_PROMPT_PACK_FIELDS = [
  "positivePrompt",
  "negativePrompt",
  "identityReminders",
  "sceneDetails",
  "visualAvoidRules",
  "compositionPolicy",
];

const QA_FIELDS = ["identity", "face", "hands", "feet", "composition", "publishability"];

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function randomSeed() {
  return Number(crypto.randomInt(1, 1_000_000_000));
}

function loadEstefaniaWorkflowTemplate() {
  const raw = fs.readFileSync(ESTEFANIA_COMFY_TEMPLATE_PATH, "utf8");
  return JSON.parse(raw);
}

function profilePathForAvatar(avatarSlug) {
  const safeSlug = String(avatarSlug || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeSlug) return null;
  return path.join(AVATAR_PROFILE_ROOT, `${safeSlug}.json`);
}

function loadAvatarProfile(avatarSlug) {
  const profilePath = profilePathForAvatar(avatarSlug);
  if (!profilePath || !fs.existsSync(profilePath)) return null;
  return JSON.parse(fs.readFileSync(profilePath, "utf8"));
}

function profileSummary(profile) {
  if (!profile) return null;
  return {
    avatarSlug: profile.metadata?.avatarSlug || null,
    displayName: profile.metadata?.displayName || null,
    businessProfile: profile.metadata?.businessProfile || null,
    avatarType: profile.metadata?.avatarType || null,
    profileStatus: profile.metadata?.profileStatus || null,
    primaryObjective: profile.businessIntent?.primaryObjective || null,
    contentPillars: profile.contentSystem?.contentPillars || [],
    brandFit: profile.businessModule?.brandFit || [],
    commercialToneAllowed: profile.businessModule?.commercialToneAllowed || [],
    captionTone: profile.voiceAndLanguage?.tone || [],
    visualPriorities: profile.visualIdentity?.priorityOrder || [],
    visualAvoid: profile.visualIdentity?.negativeDirections || [],
    safetyReviewTriggers: profile.safetyBoundaries?.humanReviewTriggers || [],
    primaryPlatforms: profile.platformStrategy?.primaryPlatforms || [],
  };
}

function withAvatarProfile(context) {
  const avatarSlug = context?.job?.avatar || context?.avatar || "estefania-montealegre";
  const avatarProfile = loadAvatarProfile(avatarSlug);
  if (!avatarProfile) return context;
  return {
    ...context,
    avatarProfile,
    avatarProfileSummary: profileSummary(avatarProfile),
  };
}

function dimensionsForFormat(format) {
  if (format === "story") return { width: 768, height: 1344 };
  return { width: 896, height: 1152 };
}

function normalizeReferenceImageContract(referenceImage) {
  if (!referenceImage) {
    return {
      mode: "template-default",
      comfyInputName: null,
      source: null,
      ignoredReason: null,
    };
  }

  if (typeof referenceImage === "string") {
    const legacyValue = referenceImage.trim();
    if (legacyValue.includes("/") || legacyValue.includes("\\")) {
      return {
        mode: "template-default",
        comfyInputName: null,
        source: { legacyValue },
        ignoredReason:
          "Legacy reference image string looks like a path; only Comfy input filenames are valid for LoadImage",
      };
    }
    return {
      mode: "legacy-string",
      comfyInputName: legacyValue,
      source: { legacyValue },
      ignoredReason: null,
    };
  }

  if (typeof referenceImage !== "object") {
    return {
      mode: "template-default",
      comfyInputName: null,
      source: { invalidType: typeof referenceImage },
      ignoredReason: "referenceImage must be an object or a Comfy input filename string",
    };
  }

  const comfyInputName = String(
    referenceImage.comfyInputName ||
      referenceImage.comfyImage ||
      referenceImage.fileName ||
      "",
  ).trim();

  if (comfyInputName) {
    return {
      mode: "comfy-input",
      comfyInputName,
      source: referenceImage,
      ignoredReason: null,
    };
  }

  return {
    mode: "template-default",
    comfyInputName: null,
    source: referenceImage,
    ignoredReason:
      "Reference image has no comfyInputName; MinIO object paths cannot be used as Comfy LoadImage filenames",
  };
}

function patchEstefaniaWorkflow({ job = {}, promptPack = {}, generationJobId, referenceImage }) {
  const workflow = cloneJson(loadEstefaniaWorkflowTemplate());
  const originalReferenceImage = workflow["47"]?.inputs?.image || null;
  const normalizedReferenceImage = normalizeReferenceImageContract(referenceImage);
  const format = job.format || promptPack.format || "feed-post";
  const { width, height } = dimensionsForFormat(format);
  const positivePrompt = String(promptPack.positivePrompt || promptPack.positive_prompt || "").trim();
  if (!positivePrompt) {
    return { ok: false, error: "promptPack.positivePrompt is required", category: "invalid_request" };
  }

  workflow["112:6"].inputs.text = positivePrompt;
  workflow["112:110"].inputs.width = Number(promptPack.width || width);
  workflow["112:110"].inputs.height = Number(promptPack.height || height);
  workflow["112:31"].inputs.seed = Number(promptPack.seed || randomSeed());
  if (workflow["112:122"]) {
    workflow["112:122"].inputs.seed = Number(promptPack.faceDetailSeed || randomSeed());
  }
  workflow["9"].inputs.filename_prefix = [
    "avatares-ai",
    job.publicationJobId || job.publication_job_id || "publication",
    generationJobId || "generation",
  ]
    .map((part) => String(part).replace(/[^a-zA-Z0-9_-]/g, "-"))
    .join("/");

  if (normalizedReferenceImage.comfyInputName) {
    workflow["47"].inputs.image = normalizedReferenceImage.comfyInputName;
  }

  if (COMFYUI_ENABLE_FACE_DETAILER) {
    workflow["9"].inputs.images = ["112:122", 0];
  } else {
    workflow["9"].inputs.images = ["112:8", 0];
    delete workflow["112:122"];
    delete workflow["112:123"];
    delete workflow["112:124"];
    delete workflow["112:125"];
  }

  return {
    ok: true,
    workflow,
    patched: {
      positivePromptNode: "112:6",
      referenceImageNode: "47",
      saveImageNode: "9",
      width: workflow["112:110"].inputs.width,
      height: workflow["112:110"].inputs.height,
      seed: workflow["112:31"].inputs.seed,
      faceDetailerEnabled: COMFYUI_ENABLE_FACE_DETAILER,
      faceDetailSeed: workflow["112:122"]?.inputs?.seed || null,
      filenamePrefix: workflow["9"].inputs.filename_prefix,
      referenceImage: workflow["47"].inputs.image,
      referenceImageContract: {
        mode: normalizedReferenceImage.mode,
        source: normalizedReferenceImage.source,
        originalTemplateImage: originalReferenceImage,
        appliedComfyInputName: normalizedReferenceImage.comfyInputName,
        effectiveComfyInputName: workflow["47"].inputs.image,
        ignoredReason: normalizedReferenceImage.ignoredReason,
      },
    },
  };
}

async function submitComfyPrompt({ workflow, clientId }) {
  if (!COMFYUI_API_KEY) {
    return {
      ok: false,
      error: "COMFY_CLOUD_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const started = Date.now();
  const url = `${COMFYUI_BASE_URL}${COMFYUI_API_PREFIX}${COMFYUI_SUBMIT_PATH}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      [COMFYUI_AUTH_HEADER_NAME]: COMFYUI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: workflow,
      client_id: clientId || crypto.randomUUID(),
    }),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      provider: "comfy-cloud",
      status: response.status,
      latencyMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    provider: "comfy-cloud",
    endpoint: url.replace(COMFYUI_API_KEY, "***"),
    latencyMs: Date.now() - started,
    response: data || text,
  };
}

function extractComfyPromptId(input = {}) {
  const candidates = [
    input.promptId,
    input.prompt_id,
    input.providerPromptId,
    input.provider_prompt_id,
    input.response?.prompt_id,
    input.response?.promptId,
    input.providerResponse?.prompt_id,
    input.providerResponse?.promptId,
    input.resultPayload?.providerResponse?.prompt_id,
    input.resultPayload?.providerResponse?.promptId,
  ];
  return String(candidates.find(Boolean) || "").trim();
}

function collectComfyOutputImages(historyPayload, promptId) {
  const root =
    historyPayload?.[promptId] ||
    historyPayload?.history?.[promptId] ||
    historyPayload?.prompt ||
    historyPayload ||
    {};
  const outputs = root.outputs || root.output || {};
  const images = [];
  for (const [nodeId, nodeOutput] of Object.entries(outputs || {})) {
    const nodeImages = Array.isArray(nodeOutput?.images) ? nodeOutput.images : [];
    for (const image of nodeImages) {
      if (!image?.filename) continue;
      const type = image.type || "output";
      const subfolder = image.subfolder || "";
      const params = new URLSearchParams({ filename: image.filename, type });
      if (subfolder) params.set("subfolder", subfolder);
      images.push({
        nodeId,
        filename: image.filename,
        type,
        subfolder,
        outputUrl: `${COMFYUI_BASE_URL}${COMFYUI_API_PREFIX}/view?${params.toString()}`,
      });
    }
  }
  return images;
}

async function getComfyPublicationStatus(input = {}) {
  if (!COMFYUI_API_KEY) {
    return {
      ok: false,
      error: "COMFY_CLOUD_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const promptId = extractComfyPromptId(input);
  if (!promptId) {
    return {
      ok: false,
      error: "Comfy prompt id is required to refresh generation status",
      category: "invalid_request",
    };
  }

  const started = Date.now();
  const headers = {
    [COMFYUI_AUTH_HEADER_NAME]: COMFYUI_API_KEY,
  };
  const endpoints = [
    `${COMFYUI_BASE_URL}${COMFYUI_API_PREFIX}/jobs/${encodeURIComponent(promptId)}`,
    `${COMFYUI_BASE_URL}${COMFYUI_API_PREFIX}/history/${encodeURIComponent(promptId)}`,
  ];

  let response;
  let text = "";
  let data = null;
  let endpoint = endpoints[0];
  for (const candidate of endpoints) {
    endpoint = candidate;
    response = await fetch(candidate, { headers });
    text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    const unavailableMessage = String(data?.error?.message || "");
    if (
      response.ok &&
      data?.error?.type === "not_found" &&
      unavailableMessage.includes("/api/jobs")
    ) {
      continue;
    }
    break;
  }

  if (response.status === 404) {
    return {
      ok: true,
      provider: "comfy-cloud",
      promptId,
      status: "running",
      completed: false,
      outputs: [],
      response: data || text,
      endpoint,
      latencyMs: Date.now() - started,
    };
  }

  if (!response.ok || data?.error) {
    return {
      ok: false,
      provider: "comfy-cloud",
      promptId,
      status: "error",
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      httpStatus: response.status,
      endpoint,
      latencyMs: Date.now() - started,
    };
  }

  const outputs = collectComfyOutputImages(data, promptId);
  const providerStatus = String(data?.status || data?.execution_status?.status_str || "").toLowerCase();
  const completed = outputs.length > 0 || data?.execution_status?.completed === true || providerStatus === "completed" || providerStatus === "success";
  const failed = providerStatus === "failed" || providerStatus === "error";
  return {
    ok: !failed,
    provider: "comfy-cloud",
    promptId,
    status: failed ? "error" : completed ? "completed" : "running",
    completed,
    outputs,
    response: data || text,
    endpoint,
    latencyMs: Date.now() - started,
  };
}

function validateComfyViewUrl(outputUrl) {
  let url;
  try {
    url = new URL(String(outputUrl || ""));
  } catch {
    return { ok: false, error: "outputUrl must be a valid URL" };
  }
  if (url.protocol !== "https:" || url.hostname !== "cloud.comfy.org" || url.pathname !== "/api/view") {
    return { ok: false, error: "Only https://cloud.comfy.org/api/view output URLs are allowed" };
  }
  const filename = url.searchParams.get("filename");
  const type = url.searchParams.get("type") || "output";
  const subfolder = url.searchParams.get("subfolder") || "";
  if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return { ok: false, error: "outputUrl is missing a valid filename" };
  }
  return { ok: true, url, filename, type, subfolder };
}

async function downloadComfyOutput(outputUrl) {
  if (!COMFYUI_API_KEY) {
    return {
      ok: false,
      error: "COMFY_CLOUD_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const validated = validateComfyViewUrl(outputUrl);
  if (!validated.ok) {
    return { ok: false, error: validated.error, category: "invalid_request" };
  }

  const started = Date.now();
  const response = await fetch(validated.url, {
    headers: {
      [COMFYUI_AUTH_HEADER_NAME]: COMFYUI_API_KEY,
    },
  });
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  if (!response.ok) {
    return {
      ok: false,
      error: buffer.toString("utf8").slice(0, 300) || response.statusText,
      category: "provider_error",
      provider: "comfy-cloud",
      status: response.status,
      latencyMs: Date.now() - started,
    };
  }

  if (!contentType.startsWith("image/") || buffer.length < 1000) {
    return {
      ok: false,
      error: "Comfy output response was not a valid image",
      category: "invalid_provider_output",
      provider: "comfy-cloud",
      status: response.status,
      contentType,
      byteLength: buffer.length,
      latencyMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    provider: "comfy-cloud",
    latencyMs: Date.now() - started,
    filename: validated.filename,
    type: validated.type,
    subfolder: validated.subfolder,
    mimeType: contentType,
    byteLength: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    base64: buffer.toString("base64"),
  };
}

function safeComfyInputName(filename, assetId) {
  const parsed = path.parse(String(filename || "reference.png"));
  const ext = parsed.ext && /^[.][a-zA-Z0-9]+$/.test(parsed.ext) ? parsed.ext : ".png";
  const base = [parsed.name || "reference", assetId || crypto.randomUUID()]
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return `${base}${ext}`;
}

async function uploadComfyInputImage(input = {}) {
  if (!COMFYUI_API_KEY) {
    return {
      ok: false,
      error: "COMFY_CLOUD_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const fileBase64 = String(input.fileBase64 || input.base64 || "").trim();
  if (!fileBase64) {
    return { ok: false, error: "fileBase64 is required", category: "invalid_request" };
  }

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    return { ok: false, error: "fileBase64 must be valid base64", category: "invalid_request" };
  }

  if (buffer.length < 1000) {
    return { ok: false, error: "reference image is too small or empty", category: "invalid_request" };
  }

  const mimeType = String(input.mimeType || "image/png").trim();
  if (!mimeType.startsWith("image/")) {
    return { ok: false, error: "mimeType must be an image type", category: "invalid_request" };
  }

  const comfyInputName = safeComfyInputName(input.filename || input.objectPath, input.assetId);
  const form = new FormData();
  form.append("image", new Blob([buffer], { type: mimeType }), comfyInputName);
  form.append("overwrite", "true");

  const started = Date.now();
  const endpoint = `${COMFYUI_BASE_URL}${COMFYUI_API_PREFIX}${COMFYUI_UPLOAD_PATH}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      [COMFYUI_AUTH_HEADER_NAME]: COMFYUI_API_KEY,
    },
    body: form,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.error) {
    return {
      ok: false,
      provider: "comfy-cloud",
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      httpStatus: response.status,
      endpoint,
      comfyInputName,
      latencyMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    provider: "comfy-cloud",
    endpoint,
    latencyMs: Date.now() - started,
    comfyInputName: data?.name || data?.filename || comfyInputName,
    response: data || text,
    source: {
      assetId: input.assetId || null,
      bucket: input.bucket || null,
      objectPath: input.objectPath || null,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      byteLength: buffer.length,
      mimeType,
    },
  };
}

function normalizeQa(raw, fallbackFlags = []) {
  const source = raw && typeof raw === "object" ? raw : {};
  const scores = {};
  for (const field of QA_FIELDS) {
    const value = Number(source.scores?.[field] ?? source[field]);
    scores[field] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  }
  const flags = normalizeArray(source.flags, fallbackFlags);
  const sourceStatus = String(source.status || "").trim().toLowerCase();
  const defectReasons = normalizeArray(source.defectReasons || source.defect_reasons, []);
  const blocked =
    sourceStatus === "blocked" ||
    scores.identity < 0.35 ||
    scores.face < 0.35 ||
    scores.publishability < 0.35;
  const reviewRequired =
    blocked ||
    sourceStatus === "review_required" ||
    flags.length > 0 ||
    scores.hands < 0.55 ||
    scores.feet < 0.55 ||
    scores.composition < 0.55;
  return {
    contractVersion: "publication-image-qa-v1",
    provider: String(source.provider || "heuristic-pre-visual"),
    status: blocked ? "blocked" : reviewRequired ? "review_required" : "pass",
    scores,
    flags,
    notes: normalizeArray(source.notes, ["Human review is required before publication."]),
    defectSeverity: source.defectSeverity || source.defect_severity || (blocked ? "blocked" : reviewRequired ? "review" : "none"),
    defectReasons,
    correctionRecommended: Boolean(source.correctionRecommended ?? (scores.hands < 0.55 || scores.feet < 0.55)),
    correctionMode: source.correctionMode || (scores.hands < 0.55 || scores.feet < 0.55 ? "future-inpaint-pass" : null),
    reviewedAt: new Date().toISOString(),
  };
}

async function evaluateLocalVisualQa(input = {}, fallbackFlags = []) {
  if (!input.fileBase64) {
    return null;
  }

  const started = Date.now();
  const response = await fetch(`${LOCAL_VISUAL_QA_URL}/qa/anatomy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      avatar: input.avatar || "estefania-montealegre",
      scene: input.scene || null,
      mimeType: input.mimeType || "image/png",
      fileBase64: input.fileBase64,
      promptPack: input.promptPack || {},
    }),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    return {
      ok: false,
      provider: "local-visual-qa",
      error: data?.error || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      status: response.status,
      latencyMs: Date.now() - started,
      qa: {
        ...normalizeQa(data?.qa || { flags: fallbackFlags }),
        provider: "local-visual-qa",
      },
    };
  }

  return {
    ok: true,
    provider: "local-visual-qa",
    model: "local-anatomy",
    latencyMs: Date.now() - started,
    qa: {
      ...normalizeQa(data?.qa, fallbackFlags),
      provider: "local-visual-qa",
    },
  };
}

async function evaluatePublicationImageQa(input = {}) {
  const promptPack = input.promptPack && typeof input.promptPack === "object" ? input.promptPack : {};
  const compositionPolicy =
    promptPack.compositionPolicy && typeof promptPack.compositionPolicy === "object"
      ? promptPack.compositionPolicy
      : {};
  const rejectIf = normalizeArray(compositionPolicy.rejectIf, []);
  const fallbackFlags = [];
  if (rejectIf.some((item) => /foot|feet|toe|toes/.test(item.toLowerCase()))) {
    fallbackFlags.push("foot-risk-review");
  }
  if (rejectIf.some((item) => /hand|hands|finger|fingers/.test(item.toLowerCase()))) {
    fallbackFlags.push("hand-risk-review");
  }
  if (rejectIf.some((item) => item.toLowerCase().includes("identity") || item.toLowerCase().includes("face"))) {
    fallbackFlags.push("identity-review");
  }

  if (VISUAL_QA_PROVIDER === "local") {
    try {
      const localResult = await evaluateLocalVisualQa(input, fallbackFlags);
      if (localResult) return localResult;
    } catch (error) {
      return {
        ok: true,
        qa: {
          ...normalizeQa({ flags: [...fallbackFlags, "local-visual-qa-unavailable"] }),
          provider: "heuristic-pre-visual",
          notes: [
            `Local visual QA is unavailable: ${error.message}`,
            "The system fell back to conservative heuristic review.",
          ],
        },
        provider: "heuristic-pre-visual",
      };
    }
  }

  if (!VISUAL_QA_API_KEY || !VISUAL_QA_BASE_URL || !VISUAL_QA_MODEL || !input.fileBase64) {
    return {
      ok: true,
      qa: {
        ...normalizeQa({ flags: fallbackFlags }),
        provider: "heuristic-pre-visual",
        notes: [
          "Visual QA provider is not configured; this is a conservative heuristic review.",
          "Configure VISUAL_QA_API_KEY, VISUAL_QA_BASE_URL, and VISUAL_QA_MODEL for pixel-level scoring.",
        ],
      },
      provider: "heuristic-pre-visual",
    };
  }

  const started = Date.now();
  const mimeType = String(input.mimeType || "image/png");
  const response = await fetch(`${VISUAL_QA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VISUAL_QA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISUAL_QA_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict visual QA reviewer for AI influencer images. Return only JSON with scores 0..1 for identity, face, hands, feet, composition, publishability; flags array; notes array; correctionRecommended boolean; correctionMode string or null.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                avatar: input.avatar || "estefania-montealegre",
                scene: input.scene || null,
                criteria: "Check face consistency, identity drift, hands, feet, body geometry, composition, and whether the asset is usable for Instagram publication.",
                promptPack,
              }),
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${input.fileBase64}` },
            },
          ],
        },
      ],
    }),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    return {
      ok: false,
      provider: "visual-qa",
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      status: response.status,
      latencyMs: Date.now() - started,
      qa: normalizeQa({ flags: fallbackFlags }),
    };
  }
  let parsed = null;
  try {
    const content = data?.choices?.[0]?.message?.content;
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    parsed = null;
  }
  return {
    ok: true,
    provider: "visual-qa",
    model: VISUAL_QA_MODEL,
    latencyMs: Date.now() - started,
    qa: {
      ...normalizeQa(parsed, fallbackFlags),
      provider: "visual-qa",
    },
  };
}

function normalizeBrief(raw, context) {
  const source = raw && typeof raw === "object" ? raw : {};
  const job = context.job || {};
  const scene = context.sceneContext || {};
  const brief = {
    visualIntent: String(
      source.visualIntent ||
        source.visual_intent ||
        scene.visualIntent ||
        scene.description ||
        `${job.avatarDisplayName || job.avatar || "Estefania"} in ${job.sceneDisplayName || job.scene || "scene"}`,
    ).trim(),
    captionAngle: String(
      source.captionAngle ||
        source.caption_angle ||
        scene.contentAngle ||
        job.objective ||
        "A natural lifestyle moment with brand-friendly emotional texture.",
    ).trim(),
    emotionalTone: String(
      source.emotionalTone ||
        source.emotional_tone ||
        scene.allowedMood ||
        "warm, spontaneous, close, softly aspirational",
    ).trim(),
    avoidRules: normalizeArray(source.avoidRules || source.avoid_rules, [
      "No luxury obsession or billionaire cues",
      "No motivational poster tone",
      "No overproduced influencer copy",
      "No forced spanglish",
      "No inconsistent facial identity or body exaggeration",
    ]),
    suggestedFormat: String(source.suggestedFormat || source.suggested_format || job.format || "feed-post").trim(),
    contentPillars: normalizeArray(source.contentPillars || source.content_pillars, [
      "lifestyle",
      "travel",
      "wellness",
      "social life",
      "personal thoughts",
    ]),
    sceneNotes: String(source.sceneNotes || source.scene_notes || scene.promptNotes || "").trim(),
    captionSeeds: normalizeArray(source.captionSeeds || source.caption_seeds, []),
    generationNotes: String(source.generationNotes || source.generation_notes || "").trim(),
  };

  const missing = REQUIRED_BRIEF_FIELDS.filter((field) => {
    const value = brief[field];
    return Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
  });

  return { brief, missing };
}

function buildDeepSeekMessages(context) {
  const profile = context.avatarProfileSummary || {};
  const operatorFeedback = context.operatorFeedback && typeof context.operatorFeedback === "object"
    ? context.operatorFeedback
    : null;
  const currentBrief = context.currentBrief && typeof context.currentBrief === "object"
    ? context.currentBrief
    : null;
  const revisionMode = Boolean(operatorFeedback?.notes && currentBrief);
  const systemPrompt = [
    `You are the creative strategist for ${profile.displayName || "Estefanía Montealegre"}, a fictional AI influencer.`,
    "Return only strict JSON.",
    "Use the provided avatarProfile and avatarProfileSummary as the operating source for business intent, voice, visual rules, safety boundaries, and brand fit.",
    "Do not override profile rules with generic influencer advice.",
    "Captions should feel like natural thoughts, not produced ad copy.",
    "Avoid motivational speeches, generic self-help, overproduced influencer copy, forced spanglish, artificial sadness, identity inconsistency, and unsupported commercial claims.",
    revisionMode
      ? "You are revising an existing brief. Preserve what still works, apply the operator feedback semantically, and do not merely append feedback text."
      : "",
  ].join(" ");

  const userPrompt = {
    task: revisionMode
      ? "Revise the current structured publication brief using the operator feedback."
      : "Generate a structured publication brief for an AI influencer content job.",
    requiredJsonShape: {
      visualIntent: "string",
      captionAngle: "string",
      emotionalTone: "string",
      avoidRules: ["string"],
      suggestedFormat: "string",
      contentPillars: ["string"],
      sceneNotes: "string",
      captionSeeds: ["string"],
      generationNotes: "string",
    },
    ...context,
    currentBrief,
    operatorFeedback,
    businessGoal:
      "Generate content that makes brands interested in Estefanía and creates a believable lifestyle media asset that can later become a publishing pack.",
  };

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPrompt) },
  ];
}

async function callDeepSeek(context) {
  if (!DEEPSEEK_API_KEY) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const started = Date.now();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: buildDeepSeekMessages(withAvatarProfile(context)),
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      status: response.status,
      latencyMs: Date.now() - started,
    };
  }

  const content = data?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return {
      ok: false,
      error: "DeepSeek returned non-JSON content",
      category: "invalid_provider_json",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      latencyMs: Date.now() - started,
    };
  }

  const enrichedContext = withAvatarProfile(context);
  const { brief, missing } = normalizeBrief(parsed, enrichedContext);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Generated brief is missing required fields: ${missing.join(", ")}`,
      category: "invalid_brief_shape",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      latencyMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    provider: "deepseek",
    model: DEEPSEEK_MODEL,
    latencyMs: Date.now() - started,
    brief,
  };
}

function normalizePromptPack(raw, context) {
  const source = raw && typeof raw === "object" ? raw : {};
  const job = context.job || {};
  const brief = context.brief || job.brief || {};
  const referenceImages = Array.isArray(context.referenceImages) ? context.referenceImages : [];
  const humanFeedback = Array.isArray(context.humanFeedback) ? context.humanFeedback.slice(0, 8) : [];
  const operatorBriefFeedback =
    context.operatorBriefFeedback && typeof context.operatorBriefFeedback === "object"
      ? context.operatorBriefFeedback
      : {};
  const humanFeedbackCategories = [
    ...new Set(
      humanFeedback.flatMap((item) => {
        const feedback = item?.feedback && typeof item.feedback === "object" ? item.feedback : item;
        return Array.isArray(feedback?.categories) ? feedback.categories.map(String) : [];
      }),
    ),
  ].slice(0, 12);
  const sortedReferenceImages = [...referenceImages].sort((a, b) => {
    const aPrepared = a?.comfyInputName ? 0 : 1;
    const bPrepared = b?.comfyInputName ? 0 : 1;
    if (aPrepared !== bPrepared) return aPrepared - bPrepared;
    const aCanonical = a?.isCanonical || a?.status === "canonical" ? 0 : 1;
    const bCanonical = b?.isCanonical || b?.status === "canonical" ? 0 : 1;
    return aCanonical - bCanonical;
  });
  const identityReferences = sortedReferenceImages
    .filter((ref) => ref?.status === "canonical" || ref?.isCanonical || ref?.status === "selected")
    .slice(0, 4);
  const preparedIdentityReferences = identityReferences.filter((ref) => ref?.comfyInputName);
  const compositionPolicy =
    source.compositionPolicy && typeof source.compositionPolicy === "object"
      ? source.compositionPolicy
      : {};
  const promptPack = {
    positivePrompt: String(source.positivePrompt || "").trim(),
    negativePrompt: String(source.negativePrompt || "").trim(),
    identityReminders: normalizeArray(source.identityReminders, [
      `${context.avatarDisplayName || job.avatar || "Estefanía Montealegre"} must remain visually consistent with approved reference images`,
      "photorealistic lifestyle portrait, natural expression, believable candid presence",
    ]),
    sceneDetails: String(source.sceneDetails || brief.visualIntent || "").trim(),
    visualAvoidRules: normalizeArray(source.visualAvoidRules, []),
    referenceImages: sortedReferenceImages,
    identityReferences,
    preparedIdentityReferences,
    sceneReferences: sortedReferenceImages.slice(0, 6),
    compositionPolicy: {
      framing: String(compositionPolicy.framing || "medium close-up or waist-up portrait").trim(),
      pose: String(compositionPolicy.pose || "one coherent natural pose only").trim(),
      hands: String(compositionPolicy.hands || "hands should be simple, relaxed, clearly readable, or mostly out of frame").trim(),
      feet: String(compositionPolicy.feet || "do not mention or emphasize feet unless the scene explicitly requires them").trim(),
      camera: String(compositionPolicy.camera || "natural 50mm lifestyle photography, no extreme angle").trim(),
      rejectIf: normalizeArray(compositionPolicy.rejectIf, [
        "contradictory pose",
        "extra fingers or extra hands",
        "merged hands with objects",
        "distorted hands",
        "identity drift",
      ]),
    },
    suggestedFormat: String(source.suggestedFormat || brief.suggestedFormat || job.format || "feed-post").trim(),
    comfyHints: {
      aspectRatio: source.comfyHints?.aspectRatio || (job.format === "story" ? "9:16" : "4:5"),
      outputIntent: source.comfyHints?.outputIntent || "publication-candidate",
      assetType: "raw-image",
    },
    comfyReferencePolicy: {
      contractVersion: "comfy-reference-image-v1",
      loadImageRequiresComfyInputName: true,
      minioObjectPathIsNotComfyInput: true,
      primaryReferencePolicy: "Use the first prepared approved identity reference as the Comfy LoadImage anchor.",
      preparedIdentityReferenceCount: preparedIdentityReferences.length,
    },
    operatorSummary: {
      visualDirection: String(source.operatorSummary?.visualDirection || source.sceneDetails || brief.visualIntent || "").trim(),
      pose: String(source.operatorSummary?.pose || compositionPolicy.pose || "").trim(),
      riskControls: normalizeArray(source.operatorSummary?.riskControls, []),
    },
    humanFeedbackInfluence: {
      contractVersion: "publication-human-feedback-influence-v1",
      used: humanFeedback.length > 0,
      feedbackCount: humanFeedback.length,
      categories: humanFeedbackCategories,
    },
    operatorBriefFeedbackInfluence: {
      contractVersion: "operator-brief-feedback-prompt-influence-v1",
      used: operatorBriefFeedback.used === true,
      lastFeedback: operatorBriefFeedback.lastFeedback || null,
      recentFeedback: normalizeArray(operatorBriefFeedback.recentFeedback, []).slice(0, 5),
    },
    source: {
      publicationJobId: job.publicationJobId || context.publicationJobId || null,
      generatedFrom: "publication-brief",
      generator: "deepseek-publication-prompt-pack-v1",
    },
  };

  const missing = REQUIRED_PROMPT_PACK_FIELDS.filter((field) => {
    const value = promptPack[field];
    if (field === "compositionPolicy") return !value || typeof value !== "object";
    return Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
  });
  if (!promptPack.positivePrompt || promptPack.positivePrompt.length < 80) missing.push("positivePrompt:min-length");
  if (!promptPack.negativePrompt || promptPack.negativePrompt.length < 40) missing.push("negativePrompt:min-length");
  return { promptPack, missing: [...new Set(missing)] };
}

function buildPromptPackMessages(context) {
  const profile = context.avatarProfileSummary || {};
  const humanFeedback = Array.isArray(context.humanFeedback) ? context.humanFeedback.slice(0, 8) : [];
  const operatorBriefFeedback =
    context.operatorBriefFeedback && typeof context.operatorBriefFeedback === "object"
      ? context.operatorBriefFeedback
      : {};
  const compactHumanFeedback = humanFeedback
    .map((item) => {
      const feedback = item?.feedback && typeof item.feedback === "object" ? item.feedback : {};
      return {
        assetId: item?.assetId || null,
        decision: feedback.decision || null,
        categories: normalizeArray(feedback.categories, []).slice(0, 8),
        reasons: normalizeArray(feedback.reasons, []).slice(0, 8),
        failedCriteria: normalizeArray(feedback.failedCriteria, []).slice(0, 8),
        notes: String(feedback.notes || feedback.promptGuidance?.note || "").slice(0, 500),
      };
    })
    .filter((item) => item.decision || item.categories.length || item.reasons.length || item.notes);
  const humanFeedbackCategories = [
    ...new Set(compactHumanFeedback.flatMap((item) => item.categories)),
  ].slice(0, 12);
  const operatorFeedbackNotes = String(operatorBriefFeedback.lastFeedback?.notes || "").trim();
  const systemPrompt = [
    `You are the image prompt director for ${profile.displayName || "Estefanía Montealegre"}, a fictional AI influencer.`,
    "Return only strict JSON.",
    "You own the final Comfy image prompt. Do not delegate composition to templates.",
    "Use human review feedback as advisory memory, not as a permanent identity rewrite.",
    "Do not overfit to one review note; preserve brand identity and the current scene brief.",
    "Create one coherent visual instruction, not a list of conflicting pose ideas.",
    "Never combine seated, leaning, walking, and hand-in-pocket unless they form one physically plausible pose.",
    "Do not mention feet for waist-up or medium close-up framing.",
    "Hands must be either clearly simple and relaxed, or mostly out of frame. Avoid phones, cups, bags, passports, or objects in hands unless explicitly required.",
    "Do not overload the negative prompt. Keep it focused on defects that matter for image generation.",
    "The operator will not edit JSON; produce a usable prompt pack now.",
    operatorFeedbackNotes
      ? "Operator brief feedback has already been applied to the brief; reflect it concretely in the image prompt without merely quoting it."
      : "",
  ].join(" ");

  const userPrompt = {
    task: "Generate the final Comfy-ready prompt pack for this publication image.",
    requiredJsonShape: {
      positivePrompt: "string",
      negativePrompt: "string",
      identityReminders: ["string"],
      sceneDetails: "string",
      visualAvoidRules: ["string"],
      compositionPolicy: {
        framing: "string",
        pose: "string",
        hands: "string",
        feet: "string",
        camera: "string",
        rejectIf: ["string"],
      },
      suggestedFormat: "string",
      operatorSummary: {
        visualDirection: "string",
        pose: "string",
        riskControls: ["string"],
      },
    },
    ...context,
    humanFeedbackSummary: {
      feedbackCount: compactHumanFeedback.length,
      categories: humanFeedbackCategories,
      recentFeedback: compactHumanFeedback,
      instruction: "Address repeated rejection categories in the new prompt while keeping the avatar natural and expressive.",
    },
    operatorBriefFeedbackSummary: {
      used: operatorBriefFeedback.used === true,
      lastFeedback: operatorBriefFeedback.lastFeedback || null,
      recentFeedback: normalizeArray(operatorBriefFeedback.recentFeedback, []).slice(0, 5),
      instruction: operatorFeedbackNotes
        ? "Translate this operator feedback into concrete visual choices, mood, constraints, and risk controls."
        : "No operator brief feedback has been applied.",
    },
    hardRules: [
      "Use exactly one physically plausible pose.",
      "Prefer waist-up or medium close-up framing.",
      "If human feedback is present, address repeated rejection categories without making the image stiff or over-constrained.",
      "If the scene includes a railing, use either relaxed hands on/near railing OR one hand in pocket, not both.",
      "If hands are not essential, keep them mostly out of frame or relaxed and unobtrusive.",
      "Do not include 'feet' in the positive prompt unless full body is explicitly requested.",
      "Avoid repeating the same scene description twice.",
    ],
  };

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPrompt) },
  ];
}

async function callDeepSeekPromptPack(context) {
  if (!DEEPSEEK_API_KEY) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not configured", category: "missing_credentials" };
  }
  const started = Date.now();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: buildPromptPackMessages(withAvatarProfile(context)),
      temperature: 0.55,
      response_format: { type: "json_object" },
    }),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    return {
      ok: false,
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      status: response.status,
      latencyMs: Date.now() - started,
    };
  }
  const content = data?.choices?.[0]?.message?.content;
  let parsed;
  try { parsed = typeof content === "string" ? JSON.parse(content) : content; } catch {
    return { ok: false, error: "DeepSeek returned non-JSON content", category: "invalid_provider_json", provider: "deepseek", model: DEEPSEEK_MODEL, latencyMs: Date.now() - started };
  }
  const enrichedContext = withAvatarProfile(context);
  const { promptPack, missing } = normalizePromptPack(parsed, enrichedContext);
  if (missing.length > 0) {
    return { ok: false, error: `Generated prompt pack is missing required fields: ${missing.join(", ")}`, category: "invalid_prompt_pack_shape", provider: "deepseek", model: DEEPSEEK_MODEL, latencyMs: Date.now() - started };
  }
  return { ok: true, provider: "deepseek", model: DEEPSEEK_MODEL, latencyMs: Date.now() - started, promptPack };
}

function normalizeCopyPack(raw, context) {
  const source = raw && typeof raw === "object" ? raw : {};
  const job = context.job || {};
  const brief = context.brief || {};
  const selectedAsset = context.selectedAsset || {};
  const captionSeeds = normalizeArray(brief.captionSeeds || brief.caption_seeds, []);
  const primaryCaption = String(
    source.primaryCaption ||
      source.primary_caption ||
      source.caption ||
      captionSeeds[0] ||
      brief.captionAngle ||
      "Hay días que se sienten mejor cuando uno baja el ritmo y mira un poco por la ventana.",
  ).trim();
  const captionAlternatives = normalizeArray(
    source.captionAlternatives || source.caption_alternatives || source.alternatives,
    captionSeeds.length > 1 ? captionSeeds.slice(1) : [],
  ).slice(0, 5);
  const hashtags = normalizeArray(source.hashtags || source.hashTags, [
    "#EstefaniaMontealegre",
    "#LifestyleColombia",
    "#CoffeeMood",
    "#SlowLiving",
  ])
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`))
    .slice(0, 12);
  const storyText = normalizeArray(source.storyText || source.story_text || source.storyFrames, [
    "Lluvia afuera.",
    "Café adentro.",
    "Nada más urgente por un minuto.",
  ]).slice(0, 5);
  const ctaOptions = normalizeArray(source.ctaOptions || source.cta_options, [
    "¿También te pasa que la lluvia cambia el ritmo del día?",
    "Team café con lluvia o silencio total?",
  ]).slice(0, 5);
  const publishingNotes = String(
    source.publishingNotes ||
      source.publishing_notes ||
      `Use selected asset ${selectedAsset.assetId || selectedAsset.asset_id || "n/a"} for a ${job.format || "feed-post"}.`,
  ).trim();

  const copyPack = {
    primaryCaption,
    captionAlternatives,
    hashtags,
    storyText,
    ctaOptions,
    publishingNotes,
    platform: String(source.platform || "instagram").trim(),
    tone: String(source.tone || brief.emotionalTone || "warm, natural, lightly reflective").trim(),
    language: String(source.language || "es-CO").trim(),
    selectedAssetId: String(selectedAsset.assetId || selectedAsset.asset_id || "").trim(),
  };

  const missing = REQUIRED_COPY_PACK_FIELDS.filter((field) => {
    const value = copyPack[field];
    return Array.isArray(value) ? value.length === 0 : !String(value || "").trim();
  });

  return { copyPack, missing };
}

function buildCopyPackMessages(context) {
  const profile = context.avatarProfileSummary || {};
  const systemPrompt = [
    `You are the social copywriter for ${profile.displayName || "Estefanía Montealegre"}, a fictional AI influencer.`,
    "Return only strict JSON.",
    "Use the provided avatarProfile and avatarProfileSummary as the operating source for business intent, caption tone, brand fit, claims policy, and review boundaries.",
    "The business goal is to make brands interested through believable lifestyle content.",
    "Avoid generic self-help, motivational speeches, forced spanglish, luxury obsession, influencer clichés, overproduced ad copy, and unsupported product claims.",
    "Spanish should feel natural for Colombia/LatAm, not stiff translation.",
  ].join(" ");

  const userPrompt = {
    task: "Generate a publication copy pack for a selected AI influencer image.",
    requiredJsonShape: {
      primaryCaption: "string",
      captionAlternatives: ["string"],
      hashtags: ["string"],
      storyText: ["string"],
      ctaOptions: ["string"],
      publishingNotes: "string",
      platform: "string",
      tone: "string",
      language: "string",
    },
    ...context,
  };

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPrompt) },
  ];
}

async function callDeepSeekCopyPack(context) {
  if (!DEEPSEEK_API_KEY) {
    return {
      ok: false,
      error: "DEEPSEEK_API_KEY is not configured",
      category: "missing_credentials",
    };
  }

  const started = Date.now();
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: buildCopyPackMessages(withAvatarProfile(context)),
      temperature: 0.75,
      response_format: { type: "json_object" },
    }),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: data?.error?.message || data?.message || text.slice(0, 300) || response.statusText,
      category: "provider_error",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      status: response.status,
      latencyMs: Date.now() - started,
    };
  }

  const content = data?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return {
      ok: false,
      error: "DeepSeek returned non-JSON content",
      category: "invalid_provider_json",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      latencyMs: Date.now() - started,
    };
  }

  const enrichedContext = withAvatarProfile(context);
  const { copyPack, missing } = normalizeCopyPack(parsed, enrichedContext);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Generated copy pack is missing required fields: ${missing.join(", ")}`,
      category: "invalid_copy_pack_shape",
      provider: "deepseek",
      model: DEEPSEEK_MODEL,
      latencyMs: Date.now() - started,
    };
  }

  return {
    ok: true,
    provider: "deepseek",
    model: DEEPSEEK_MODEL,
    latencyMs: Date.now() - started,
    copyPack,
  };
}

async function handlePublicationBrief(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await callDeepSeek(body);
  const status = result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502;
  console.log(
    JSON.stringify({
      requestId,
      route: "publication-brief",
      ok: result.ok,
      provider: result.provider || "deepseek",
      model: result.model || DEEPSEEK_MODEL,
      category: result.category || "ok",
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, status, { requestId, ...result });
}

async function handlePublicationCopyPack(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await callDeepSeekCopyPack(body);
  const status = result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502;
  console.log(
    JSON.stringify({
      requestId,
      route: "publication-copy-pack",
      ok: result.ok,
      provider: result.provider || "deepseek",
      model: result.model || DEEPSEEK_MODEL,
      category: result.category || "ok",
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, status, { requestId, ...result });
}

async function handlePublicationPromptPack(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await callDeepSeekPromptPack(body);
  const status = result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502;
  console.log(
    JSON.stringify({
      requestId,
      route: "publication-prompt-pack",
      ok: result.ok,
      provider: result.provider || "deepseek",
      model: result.model || DEEPSEEK_MODEL,
      category: result.category || "ok",
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, status, { requestId, ...result });
}

async function handleAvatarProfile(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const avatarSlug = body.avatar || body.avatarSlug || "estefania-montealegre";
  const profile = loadAvatarProfile(avatarSlug);
  if (!profile) {
    jsonResponse(res, 404, {
      ok: false,
      requestId,
      error: `Avatar profile not found: ${avatarSlug}`,
      category: "profile_not_found",
    });
    return;
  }

  jsonResponse(res, 200, {
    ok: true,
    requestId,
    profile,
    summary: profileSummary(profile),
  });
}

async function handleComfyPublicationSubmit(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const patched = patchEstefaniaWorkflow(body);
  if (!patched.ok) {
    jsonResponse(res, 400, { requestId, ...patched });
    return;
  }

  if (body.dryRun === true) {
    jsonResponse(res, 200, {
      ok: true,
      requestId,
      provider: "comfy-cloud",
      dryRun: true,
      patched: patched.patched,
      workflow: patched.workflow,
    });
    return;
  }

  const result = await submitComfyPrompt({
    workflow: patched.workflow,
    clientId: body.clientId || body.generationJobId,
  });
  console.log(
    JSON.stringify({
      requestId,
      route: "comfy/publication-submit",
      ok: result.ok,
      provider: "comfy-cloud",
      category: result.category || "ok",
      status: result.status || 200,
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502, {
    requestId,
    ...result,
    patched: patched.patched,
  });
}

async function handleComfyPublicationStatus(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await getComfyPublicationStatus(body);
  console.log(
    JSON.stringify({
      requestId,
      route: "comfy/publication-status",
      ok: result.ok,
      provider: "comfy-cloud",
      category: result.category || "ok",
      status: result.status || "unknown",
      promptId: result.promptId || null,
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, result.ok ? 200 : result.category === "missing_credentials" ? 503 : 400, {
    requestId,
    ...result,
  });
}

async function handleComfyDownloadOutput(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await downloadComfyOutput(body.outputUrl || body.url);
  console.log(
    JSON.stringify({
      requestId,
      route: "comfy/download-output",
      ok: result.ok,
      provider: "comfy-cloud",
      category: result.category || "ok",
      status: result.status || 200,
      latencyMs: result.latencyMs || 0,
      byteLength: result.byteLength || 0,
    }),
  );
  jsonResponse(res, result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502, {
    requestId,
    ...result,
  });
}

async function handleComfyPrepareReference(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await uploadComfyInputImage(body);
  console.log(
    JSON.stringify({
      requestId,
      route: "comfy/prepare-reference",
      ok: result.ok,
      provider: "comfy-cloud",
      category: result.category || "ok",
      latencyMs: result.latencyMs || 0,
      comfyInputName: result.comfyInputName || null,
    }),
  );
  jsonResponse(res, result.ok ? 200 : result.category === "missing_credentials" ? 503 : 502, {
    requestId,
    ...result,
  });
}

async function handlePublicationImageQa(req, res, requestId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    jsonResponse(res, 400, { ok: false, requestId, error: "Invalid JSON body", category: "invalid_request" });
    return;
  }

  const result = await evaluatePublicationImageQa(body);
  console.log(
    JSON.stringify({
      requestId,
      route: "publication-image-qa",
      ok: result.ok,
      provider: result.provider || "visual-qa",
      model: result.model || VISUAL_QA_MODEL || null,
      status: result.qa?.status || null,
      latencyMs: result.latencyMs || 0,
    }),
  );
  jsonResponse(res, result.ok ? 200 : 502, { requestId, ...result });
}

const server = http.createServer(async (req, res) => {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  const url = new URL(req.url || "/", `http://${req.headers.host || "ai-gateway"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      jsonResponse(res, 200, {
        ok: true,
        service: "ai-gateway",
        providers: {
          deepseek: {
            configured: Boolean(DEEPSEEK_API_KEY),
            model: DEEPSEEK_MODEL,
          },
          avatarProfiles: {
            root: AVATAR_PROFILE_ROOT,
            estefania: Boolean(loadAvatarProfile("estefania-montealegre")),
          },
          comfyCloud: {
            configured: Boolean(COMFYUI_API_KEY),
            baseUrl: COMFYUI_BASE_URL,
            apiPrefix: COMFYUI_API_PREFIX,
            submitPath: COMFYUI_SUBMIT_PATH,
            uploadPath: COMFYUI_UPLOAD_PATH,
            authHeaderName: COMFYUI_AUTH_HEADER_NAME,
            estefaniaTemplate: fs.existsSync(ESTEFANIA_COMFY_TEMPLATE_PATH),
            downloadOutput: true,
          },
          visualQa: {
            provider: VISUAL_QA_PROVIDER || (VISUAL_QA_API_KEY && VISUAL_QA_BASE_URL && VISUAL_QA_MODEL ? "openai-compatible" : "heuristic-pre-visual"),
            configured:
              VISUAL_QA_PROVIDER === "local" ||
              Boolean(VISUAL_QA_API_KEY && VISUAL_QA_BASE_URL && VISUAL_QA_MODEL),
            baseUrl: VISUAL_QA_BASE_URL || null,
            localUrl: VISUAL_QA_PROVIDER === "local" ? LOCAL_VISUAL_QA_URL : null,
            model: VISUAL_QA_MODEL || null,
          },
        },
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/publication-brief") {
      await handlePublicationBrief(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/publication-copy-pack") {
      await handlePublicationCopyPack(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/publication-prompt-pack") {
      await handlePublicationPromptPack(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/avatar-profile") {
      await handleAvatarProfile(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/comfy/publication-submit") {
      await handleComfyPublicationSubmit(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/comfy/publication-status") {
      await handleComfyPublicationStatus(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/comfy/download-output") {
      await handleComfyDownloadOutput(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/comfy/prepare-reference") {
      await handleComfyPrepareReference(req, res, requestId);
      return;
    }

    if (req.method === "POST" && url.pathname === "/publication-image-qa") {
      await handlePublicationImageQa(req, res, requestId);
      return;
    }

    jsonResponse(res, 404, { ok: false, requestId, error: "Not found" });
  } catch (error) {
    console.error(JSON.stringify({ requestId, ok: false, category: "gateway_error", message: error.message }));
    jsonResponse(res, 500, { ok: false, requestId, error: "Gateway error", category: "gateway_error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      ok: true,
      service: "ai-gateway",
      port: PORT,
      deepseekConfigured: Boolean(DEEPSEEK_API_KEY),
      comfyCloudConfigured: Boolean(COMFYUI_API_KEY),
    }),
  );
});
