function sql(value) {
  if (value === undefined || value === null || String(value).trim() === "") return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function sqlJson(value) {
  return sql(JSON.stringify(value ?? {})) + "::jsonb";
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

const row = $input.first()?.json || {};
if (row.ok === false || row.ok === "f" || !row.publicationJobId) {
  const error = row.error || "Publication job not found";
  return [{ json: { query: `SELECT false AS ok, ${sql(error)} AS error;` } }];
}
if (!row.brief && !row.manualPromptPack) {
  return [{ json: { query: "SELECT false AS ok, 'Publication brief is required before generating a prompt pack' AS error;" } }];
}

const manualPromptPack = row.manualPromptPack && typeof row.manualPromptPack === "object" ? row.manualPromptPack : null;
const referenceImages = parseJson(row.referenceImages, []);
const humanFeedback = parseJson(row.humanFeedback, []);
const feedbackForPrompt = Array.isArray(humanFeedback)
  ? humanFeedback.slice(0, 8).map((item) => {
      const feedback = item?.feedback && typeof item.feedback === "object" ? item.feedback : {};
      return {
        assetId: item?.assetId || null,
        assetStatus: item?.assetStatus || null,
        decision: feedback.decision || null,
        categories: Array.isArray(feedback.categories) ? feedback.categories.slice(0, 8) : [],
        reasons: Array.isArray(feedback.reasons) ? feedback.reasons.slice(0, 8) : [],
        failedCriteria: Array.isArray(feedback.failedCriteria) ? feedback.failedCriteria.slice(0, 8) : [],
        notes: String(feedback.notes || feedback.promptGuidance?.note || "").slice(0, 500),
      };
    }).filter((item) => item.decision || item.categories.length || item.notes)
  : [];
let promptPack = manualPromptPack;
let provider = manualPromptPack ? "manual" : "deepseek";
let providerMeta = null;

if (!promptPack) {
  let gateway;
  try {
    gateway = await this.helpers.httpRequest({
      method: "POST",
      url: "http://ai-gateway:8095/publication-prompt-pack",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": `publication-prompt-pack-${row.publicationJobId}`,
      },
      body: {
        publicationJobId: row.publicationJobId,
        job: {
          publicationJobId: row.publicationJobId,
          avatar: row.avatar,
          scene: row.scene,
          format: row.format,
          objective: row.objective,
          businessProfile: row.businessProfile,
          assetType: row.assetType,
          status: row.status,
          brief: parseJson(row.brief, {}),
        },
        brief: parseJson(row.brief, {}),
        avatarDisplayName: row.avatarDisplayName,
        avatarShort: row.avatarShort,
        sceneDisplayName: row.sceneDisplayName,
        sceneDescription: row.sceneDescription,
        sceneVisualIntent: row.sceneVisualIntent,
        sceneAllowedMood: row.sceneAllowedMood,
        sceneAvoidRules: parseJson(row.sceneAvoidRules, []),
        sceneContentAngle: row.sceneContentAngle,
        scenePromptNotes: row.scenePromptNotes,
        referenceImages,
        humanFeedback: feedbackForPrompt,
      },
      json: true,
      timeout: 120000,
    });
  } catch (error) {
    gateway = { ok: false, error: error?.message || "Prompt pack gateway request failed." };
  }

  if (!gateway?.ok || !gateway.promptPack) {
    const error = gateway?.error || "DeepSeek prompt pack was not generated.";
    return [{ json: { query: `SELECT false AS ok, ${sql(error)} AS error;` } }];
  }

  promptPack = gateway.promptPack;
  if (feedbackForPrompt.length > 0) {
    promptPack = {
      ...promptPack,
      humanFeedbackInfluence: {
        contractVersion: "publication-human-feedback-influence-v1",
        used: true,
        feedbackCount: feedbackForPrompt.length,
        categories: [...new Set(feedbackForPrompt.flatMap((item) => item.categories))].slice(0, 12),
      },
    };
  }
  providerMeta = {
    provider: gateway.provider || "deepseek",
    model: gateway.model || null,
    requestId: gateway.requestId || null,
    latencyMs: gateway.latencyMs || null,
    humanFeedbackUsed: feedbackForPrompt.length > 0,
    humanFeedbackCount: feedbackForPrompt.length,
  };
}

const query = `
UPDATE publication_jobs
SET
  prompt_pack = ${sqlJson(promptPack)},
  status = 'prompt-ready',
  error_message = NULL,
  updated_at = now(),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'promptPackProvider', ${sql(provider)},
    'promptPackProviderMeta', ${sqlJson(providerMeta)},
    'promptPackHumanFeedback', ${sqlJson(feedbackForPrompt)},
    'promptPackGeneratedAt', now()
  )
WHERE publication_job_id = ${sql(row.publicationJobId)}::uuid
RETURNING
  true AS ok,
  publication_job_id AS "publicationJobId",
  avatar,
  scene,
  format,
  objective,
  business_profile AS "businessProfile",
  asset_type AS "assetType",
  status,
  brief,
  prompt_pack AS "promptPack",
  created_at AS "createdAt",
  updated_at AS "updatedAt";
`;

return [{ json: { query } }];
