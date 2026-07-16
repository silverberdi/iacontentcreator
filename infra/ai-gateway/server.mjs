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

function dimensionsForFormat(format) {
  if (format === "story") return { width: 768, height: 1344 };
  return { width: 896, height: 1152 };
}

function patchEstefaniaWorkflow({ job = {}, promptPack = {}, generationJobId, referenceImage }) {
  const workflow = cloneJson(loadEstefaniaWorkflowTemplate());
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

  if (referenceImage) {
    workflow["47"].inputs.image = referenceImage;
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
  const systemPrompt = [
    "You are the creative strategist for Estefanía Montealegre, a fictional AI influencer.",
    "Return only strict JSON.",
    "Estefanía is a Colombian lifestyle creator based between Medellín and Miami.",
    "She should feel real, warm, natural, socially curious, elegant without being pretentious, aspirational but reachable.",
    "She is not a luxury billionaire character.",
    "Captions should feel like natural thoughts: casual, warm, smart, spontaneous, lightly reflective, sometimes lightly sarcastic.",
    "Avoid motivational speeches, generic self-help, overproduced influencer copy, forced spanglish, artificial sadness, and identity inconsistency.",
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
      messages: buildDeepSeekMessages(context),
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

  const { brief, missing } = normalizeBrief(parsed, context);
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
  const systemPrompt = [
    "You are the social copywriter for Estefanía Montealegre, a fictional AI influencer.",
    "Return only strict JSON.",
    "Estefanía is a Colombian lifestyle creator. She should sound natural, warm, smart, casual, and brand-friendly.",
    "The business goal is to make brands interested in her through believable lifestyle content.",
    "Avoid generic self-help, motivational speeches, forced spanglish, luxury obsession, influencer clichés, and overproduced ad copy.",
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
      messages: buildCopyPackMessages(context),
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

  const { copyPack, missing } = normalizeCopyPack(parsed, context);
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

    if (req.method === "POST" && url.pathname === "/comfy/publication-submit") {
      await handleComfyPublicationSubmit(req, res, requestId);
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
