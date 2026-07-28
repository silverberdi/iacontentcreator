const context = $("Download Comfy Output To Inbox").first().json;
const rows = $input.all().map((item) => item.json || {});
const registered = rows.find((item) => item.assetId || item.asset_id || item.sha256 === context.sha256) || rows[0] || {};
const returnedAssetId = registered.assetId || registered.asset_id || null;

function sql(value) {
  if (value === undefined || value === null || String(value).trim() === "") return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function sqlJson(value) {
  return sql(JSON.stringify(value || {})) + "::jsonb";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

const promptPack = context.promptPack && typeof context.promptPack === "object" ? context.promptPack : {};
const compositionPolicy =
  promptPack.compositionPolicy && typeof promptPack.compositionPolicy === "object" ? promptPack.compositionPolicy : {};
const rejectIf = Array.isArray(compositionPolicy.rejectIf) ? compositionPolicy.rejectIf.map(String) : [];
const qaFlags = [];
if (rejectIf.some((item) => item.toLowerCase().includes("foot") || item.toLowerCase().includes("toe"))) {
  qaFlags.push("foot-risk-review");
}
if (rejectIf.some((item) => item.toLowerCase().includes("hand") || item.toLowerCase().includes("finger"))) {
  qaFlags.push("hand-risk-review");
}
if (rejectIf.some((item) => item.toLowerCase().includes("identity") || item.toLowerCase().includes("face"))) {
  qaFlags.push("identity-review");
}

let qa = {
  contractVersion: "publication-image-qa-v1",
  provider: "heuristic-pre-visual",
  status: qaFlags.length ? "review_required" : "pass",
  scores: {
    identity: 0.5,
    face: 0.5,
    hands: qaFlags.includes("hand-risk-review") ? 0.4 : 0.7,
    feet: qaFlags.includes("foot-risk-review") ? 0.4 : 0.7,
    composition: 0.6,
    publishability: 0.5,
  },
  flags: qaFlags,
  notes: ["Heuristic QA only; human review is still required before publication."],
  defectSeverity: qaFlags.length ? "review" : "none",
  defectReasons: [],
  correctionRecommended: qaFlags.includes("hand-risk-review") || qaFlags.includes("foot-risk-review"),
  correctionMode:
    qaFlags.includes("hand-risk-review") || qaFlags.includes("foot-risk-review")
      ? "manual-or-future-inpaint-pass"
      : null,
  reviewedAt: new Date().toISOString(),
};

try {
  const qaResult = await this.helpers.httpRequest({
    method: "POST",
    url: "http://ai-gateway:8095/publication-image-qa",
    headers: { "Content-Type": "application/json", "X-Request-Id": "publication-image-qa-" + context.publicationJobId },
    body: {
      avatar: context.avatar,
      scene: context.scene,
      promptPack,
      mimeType: context.mimeType || "image/png",
      fileBase64: context.downloadedBase64,
    },
    json: true,
    timeout: 120000,
  });
  if (qaResult?.qa) qa = qaResult.qa;
} catch (error) {
  qa.notes = [...(qa.notes || []), "Visual QA request failed: " + (error?.message || "unknown error")];
}

const qaStatus = String(qa.status || "review_required");
const isDefective = qaStatus === "blocked";
const defectReasons = normalizeArray(qa.defectReasons).length ? normalizeArray(qa.defectReasons) : normalizeArray(qa.flags);
const activeRemediation =
  context.remediation && typeof context.remediation === "object"
    ? context.remediation
    : context.publicationMetadata?.qaRemediation && typeof context.publicationMetadata.qaRemediation === "object"
      ? context.publicationMetadata.qaRemediation
      : null;
const activeRemediationAttempts = Array.isArray(activeRemediation?.attempts)
  ? activeRemediation.attempts
  : [];
const remediation = isDefective
  ? {
      ...(activeRemediation || {}),
      policyVersion: "qa-remediation-v1",
      status:
        Number(activeRemediation?.attemptsUsed || 0) >= Number(activeRemediation?.maxAttempts || 3)
          ? "exhausted"
          : "pending-regeneration",
      reason: "qa-blocked-output",
      sourceGenerationJobId: context.generationJobId,
      sourceOutputUrl: context.outputUrl,
      maxAttempts: Number(activeRemediation?.maxAttempts || 3),
      attemptsUsed: Number(activeRemediation?.attemptsUsed || 0),
      nextAction:
        Number(activeRemediation?.attemptsUsed || 0) >= Number(activeRemediation?.maxAttempts || 3)
          ? "human-review-required"
          : "auto-regenerate",
      promptDelta: {
        avoid: defectReasons,
        instruction: "Regenerate with safer crop, clearer body geometry, and no visible malformed hands or feet.",
      },
      attempts: [
        ...activeRemediationAttempts,
        {
          generationJobId: context.generationJobId,
          assetId: returnedAssetId,
          status: "blocked",
          defectReasons,
          reviewedAt: qa.reviewedAt || new Date().toISOString(),
        },
      ],
      createdAt: activeRemediation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  : activeRemediation
    ? {
        ...activeRemediation,
        status: "passed",
        nextAction: "human-review-candidate",
        passedGenerationJobId: context.generationJobId,
        passedAt: new Date().toISOString(),
        attempts: [
          ...activeRemediationAttempts,
          {
            generationJobId: context.generationJobId,
            assetId: returnedAssetId,
            status: qaStatus,
            reviewedAt: qa.reviewedAt || new Date().toISOString(),
          },
        ],
      }
    : null;

const metadata = {
  source: "publication-comfy-output-ingest",
  publicationJobId: context.publicationJobId,
  generationJobId: context.generationJobId,
  outputUrl: context.outputUrl,
  comfyFilename: context.comfyFilename,
  comfySubfolder: context.comfySubfolder,
  downloadedFileName: context.downloadedFileName,
  sha256: context.sha256,
  qa,
  defective: isDefective,
  defectReasons,
  remediation,
};

const generatedStatus = isDefective ? "defective" : "generated";
const generationStatus = isDefective ? "blocked" : "review_required";
const reviewNotes = isDefective
  ? "Blocked by QA: " + (defectReasons.join(", ") || "defective generated image")
  : "Generated by Comfy Cloud API for publication job";
const assetPredicate = returnedAssetId
  ? "(asset_id = " + sql(returnedAssetId) + " OR sha256 = " + sql(context.sha256) + ")"
  : "sha256 = " + sql(context.sha256);

const query = `
WITH asset_target AS (
  SELECT * FROM canonical_asset_registry WHERE ${assetPredicate} ORDER BY created_at DESC LIMIT 1
), asset_update AS (
  UPDATE canonical_asset_registry car
  SET
    metadata = COALESCE(car.metadata, '{}'::jsonb) || (${sqlJson(metadata)} || jsonb_build_object('bucket', car.bucket, 'objectPath', car.object_path, 'assetId', car.asset_id)),
    review_notes = ${sql(reviewNotes)}
  FROM asset_target t
  WHERE car.asset_id = t.asset_id
  RETURNING car.*
), generated AS (
  INSERT INTO generated_assets (generated_asset_id, job_id, asset_id, avatar, scene, asset_type, status, review_notes, metadata, created_at, updated_at)
  SELECT gen_random_uuid(), ${sql(context.generationJobId)}::uuid, asset_id::uuid, avatar, scene, asset_type, ${sql(generatedStatus)}, ${sql(reviewNotes)}, (${sqlJson(metadata)} || jsonb_build_object('bucket', bucket, 'objectPath', object_path, 'assetId', asset_id)), now(), now()
  FROM asset_update
  ON CONFLICT (asset_id)
  DO UPDATE SET
    job_id = EXCLUDED.job_id,
    status = ${sql(generatedStatus)},
    review_notes = ${sql(reviewNotes)},
    metadata = generated_assets.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING *
), generation_update AS (
  UPDATE generation_jobs
  SET
    status = ${sql(generationStatus)},
    result_payload = result_payload || (${sqlJson(metadata)} || jsonb_build_object('assetId', (SELECT asset_id FROM asset_update LIMIT 1), 'bucket', (SELECT bucket FROM asset_update LIMIT 1), 'objectPath', (SELECT object_path FROM asset_update LIMIT 1))),
    completed_at = now(),
    updated_at = now()
  WHERE job_id = ${sql(context.generationJobId)}::uuid
  RETURNING *
), publication_update AS (
  UPDATE publication_jobs
  SET
    status = 'review-ready',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'latestGeneratedAssetId', (SELECT asset_id FROM asset_update LIMIT 1),
      'latestGeneratedAssetObjectPath', (SELECT object_path FROM asset_update LIMIT 1),
      'latestGeneratedAssetSha256', (SELECT sha256 FROM asset_update LIMIT 1),
      'latestGeneratedAssetQa', ${sqlJson(qa)},
      'latestGeneratedAssetDefective', ${isDefective ? "true" : "false"},
      'latestGeneratedAssetDefectReasons', ${sqlJson(defectReasons)},
      'latestUsableGeneratedAssetId', CASE WHEN ${isDefective ? "true" : "false"} THEN metadata->>'latestUsableGeneratedAssetId' ELSE (SELECT asset_id::text FROM asset_update LIMIT 1) END,
      'qaRemediation', COALESCE(${sqlJson(remediation)}, metadata->'qaRemediation'),
      'generatedAssetReadyAt', now()
    ),
    updated_at = now()
  WHERE publication_job_id = ${sql(context.publicationJobId)}::uuid
  RETURNING *
), event AS (
  INSERT INTO publication_job_events (publication_job_id, event_type, event_label, event_status, event_payload, error_message)
  SELECT ${sql(context.publicationJobId)}::uuid,
    CASE WHEN ${isDefective ? "true" : "false"} THEN 'image-defective' ELSE 'image-qa-completed' END,
    CASE WHEN ${isDefective ? "true" : "false"} THEN 'Generated image blocked by QA' ELSE 'Generated image QA completed' END,
    CASE WHEN ${isDefective ? "true" : "false"} THEN 'blocked' ELSE 'completed' END,
    ${sqlJson({ qa, defective: isDefective, defectReasons, remediation })},
    CASE WHEN ${isDefective ? "true" : "false"} THEN ${sql(reviewNotes)} ELSE NULL END
  RETURNING *
), remediation_event AS (
  INSERT INTO publication_job_events (publication_job_id, event_type, event_label, event_status, event_payload, error_message)
  SELECT ${sql(context.publicationJobId)}::uuid,
    CASE
      WHEN ${isDefective ? "true" : "false"} AND ${Number(remediation?.attemptsUsed || 0) >= Number(remediation?.maxAttempts || 3) ? "true" : "false"} THEN 'remediation-exhausted'
      WHEN ${isDefective ? "true" : "false"} THEN 'remediation-started'
      ELSE 'remediation-passed'
    END,
    CASE
      WHEN ${isDefective ? "true" : "false"} AND ${Number(remediation?.attemptsUsed || 0) >= Number(remediation?.maxAttempts || 3) ? "true" : "false"} THEN 'QA remediation attempts exhausted'
      WHEN ${isDefective ? "true" : "false"} THEN 'QA remediation needed'
      ELSE 'QA remediation passed'
    END,
    CASE
      WHEN ${isDefective ? "true" : "false"} AND ${Number(remediation?.attemptsUsed || 0) >= Number(remediation?.maxAttempts || 3) ? "true" : "false"} THEN 'failed'
      ELSE 'completed'
    END,
    ${sqlJson({ qa, defective: isDefective, defectReasons, remediation })},
    NULL
  WHERE ${remediation ? "true" : "false"}
  RETURNING *
)
SELECT
  (SELECT row_to_json(asset_update) FROM asset_update LIMIT 1) AS asset,
  (SELECT row_to_json(generated) FROM generated LIMIT 1) AS generated_asset,
  (SELECT row_to_json(generation_update) FROM generation_update LIMIT 1) AS generation_job,
  (SELECT row_to_json(publication_update) FROM publication_update LIMIT 1) AS publication_job;
`;

return [{ json: { ok: true, query, returnedAssetId, context, qa, defective: isDefective, remediation } }];
