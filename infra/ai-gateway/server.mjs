import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT || 8095);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_TOKEN || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const COMFYUI_API_KEY = process.env.COMFY_CLOUD_API_KEY || process.env.SILVERMAN_COMFYUI_API_KEY || "";
const COMFYUI_BASE_URL = (process.env.COMFY_CLOUD_BASE_URL || process.env.SILVERMAN_COMFYUI_BASE_URL || "https://cloud.comfy.org").replace(/\/$/, "");
const COMFYUI_API_PREFIX = `/${String(process.env.COMFY_CLOUD_API_PREFIX || process.env.SILVERMAN_COMFYUI_API_PREFIX || "/api").replace(/^\/+|\/+$/g, "")}`;
const COMFYUI_AUTH_HEADER_NAME = process.env.COMFY_CLOUD_AUTH_HEADER_NAME || process.env.SILVERMAN_COMFYUI_AUTH_HEADER_NAME || "X-API-Key";
const COMFYUI_SUBMIT_PATH = `/${String(process.env.COMFY_CLOUD_SUBMIT_PATH || process.env.SILVERMAN_COMFYUI_SUBMIT_PATH || "/prompt").replace(/^\/+|\/+$/g, "")}`;
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
  const systemPrompt = [
    `You are the creative strategist for ${profile.displayName || "Estefanía Montealegre"}, a fictional AI influencer.`,
    "Return only strict JSON.",
    "Use the provided avatarProfile and avatarProfileSummary as the operating source for business intent, voice, visual rules, safety boundaries, and brand fit.",
    "Do not override profile rules with generic influencer advice.",
    "Captions should feel like natural thoughts, not produced ad copy.",
    "Avoid motivational speeches, generic self-help, overproduced influencer copy, forced spanglish, artificial sadness, identity inconsistency, and unsupported commercial claims.",
  ].join(" ");

  const userPrompt = {
    task: "Generate a structured publication brief for an AI influencer content job.",
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
            authHeaderName: COMFYUI_AUTH_HEADER_NAME,
            estefaniaTemplate: fs.existsSync(ESTEFANIA_COMFY_TEMPLATE_PATH),
            downloadOutput: true,
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
