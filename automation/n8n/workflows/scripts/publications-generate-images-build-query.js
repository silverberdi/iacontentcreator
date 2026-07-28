function sql(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function sqlJson(value) {
  return sql(JSON.stringify(value ?? {})) + '::jsonb';
}
const body = $json.body || $json;
const publicationJobId = String(body.publicationJobId || body.publication_job_id || '').trim();
const mode = String(body.mode || 'comfy-cloud-api').trim();
const referencePreparation = body.referencePreparation && typeof body.referencePreparation === 'object' ? body.referencePreparation : { ok: true, skipped: true };
const referencePreparationError = referencePreparation.ok === false ? (referencePreparation.error || 'Reference preparation failed') : null;
const remediationInput = body.remediation && typeof body.remediation === 'object' ? body.remediation : null;
const remediationMaxAttempts = Math.max(1, Math.min(Number(remediationInput?.maxAttempts || 3) || 3, 5));
const remediationAttemptsUsed = Math.max(0, Number(remediationInput?.attemptsUsed || 0) || 0);
const remediationAttemptNumber = remediationAttemptsUsed + 1;
const remediationActive = Boolean(remediationInput);
const remediationPayload = remediationActive
  ? {
      ...remediationInput,
      status: 'remediation-submitted',
      maxAttempts: remediationMaxAttempts,
      attemptsUsed: remediationAttemptNumber,
      nextAction: 'wait-for-remediation-generation',
      updatedAt: new Date().toISOString(),
    }
  : null;
const remediationPromptPatch = remediationActive
  ? {
      qaRemediationPromptDelta: remediationPayload?.promptDelta || {},
      qaRemediationInstruction:
        remediationPayload?.promptDelta?.instruction ||
        'Regenerate with safer crop, clearer body geometry, and no malformed visible hands or feet.',
      qaRemediationAvoid: Array.isArray(remediationPayload?.promptDelta?.avoid)
        ? remediationPayload.promptDelta.avoid
        : [],
    }
  : {};
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(publicationJobId)) {
  return [{ json: { query: "SELECT false AS ok, 'publicationJobId is required' AS error;" } }];
}
const requestPayload = {
  ...body,
  source: remediationActive ? 'publication-job-qa-remediation' : 'publication-job-generate-images',
  requestedAt: new Date().toISOString(),
  mode,
  remediation: remediationPayload,
};
const query = `
WITH job AS (
  SELECT *
  FROM publication_jobs
  WHERE publication_job_id = ${sql(publicationJobId)}::uuid
  LIMIT 1
), validation AS (
  SELECT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM job) THEN 'Publication job not found'
      WHEN (SELECT prompt_pack FROM job) IS NULL THEN 'Prompt pack is required before generating images'
      WHEN ${sql(referencePreparationError)} IS NOT NULL THEN ${sql(referencePreparationError)}
      WHEN ${remediationActive ? 'true' : 'false'} AND ${remediationAttemptsUsed} >= ${remediationMaxAttempts} THEN 'QA remediation attempts exhausted'
      ELSE NULL
    END AS error
), queued AS (
  INSERT INTO generation_jobs (
    avatar,
    scene,
    asset_type,
    platform,
    status,
    run_mode,
    prompt_pack,
    request_payload,
    started_at,
    updated_at
  )
  SELECT
    avatar,
    scene,
    COALESCE(asset_type, 'raw-image'),
    'instagram',
    'running',
    ${sql(mode)},
    CASE
      WHEN ${remediationActive ? 'true' : 'false'} THEN jsonb_set(
        prompt_pack || ${sqlJson(remediationPromptPatch)},
        '{positivePrompt}',
        to_jsonb(CONCAT(
          COALESCE(prompt_pack->>'positivePrompt', ''),
          E'\n\nQA remediation instruction: ',
          ${sql(remediationPromptPatch.qaRemediationInstruction || '')},
          CASE
            WHEN ${sql((remediationPromptPatch.qaRemediationAvoid || []).join(', '))} IS NULL THEN ''
            ELSE CONCAT(' Avoid: ', ${sql((remediationPromptPatch.qaRemediationAvoid || []).join(', '))}, '.')
          END
        ))
      )
      ELSE prompt_pack
    END,
    ${sqlJson(requestPayload)},
    now(),
    now()
  FROM job
  WHERE (SELECT error FROM validation) IS NULL
  RETURNING *
), updated_publication AS (
  UPDATE publication_jobs pj
  SET
    status = 'generating',
    error_message = NULL,
    updated_at = now(),
    metadata = COALESCE(pj.metadata, '{}'::jsonb) || jsonb_build_object(
      'generationJobId', (SELECT job_id FROM queued),
      'generationRunMode', ${sql(mode)},
      'generationSubmittedAt', now(),
      'generationProvider', 'comfy-cloud-api',
      'referencePreparation', ${sqlJson(referencePreparation)},
      'qaRemediation', COALESCE(${sqlJson(remediationPayload)}, pj.metadata->'qaRemediation'),
      'generationInstructions', jsonb_build_array(
        'Submitted to Comfy Cloud API through ai-gateway.',
        'Wait for Comfy Cloud output metadata.',
        'Run or trigger ingest to register generated assets.',
        'US-005 links outputs back to the publication job.'
      )
    )
  WHERE pj.publication_job_id = (SELECT publication_job_id FROM job)
    AND EXISTS (SELECT 1 FROM queued)
  RETURNING
    pj.publication_job_id AS "publicationJobId",
    pj.avatar,
    pj.scene,
    pj.format,
    pj.objective,
    pj.business_profile AS "businessProfile",
    pj.asset_type AS "assetType",
    pj.status,
    pj.brief,
    pj.prompt_pack AS "promptPack",
    pj.created_at AS "createdAt",
    pj.updated_at AS "updatedAt"
), remediation_event AS (
  INSERT INTO publication_job_events (publication_job_id, event_type, event_label, event_status, event_payload, error_message)
  SELECT
    ${sql(publicationJobId)}::uuid,
    'remediation-submitted',
    'QA remediation generation submitted',
    'completed',
    ${sqlJson(remediationPayload)} || jsonb_build_object('generationJobId', (SELECT job_id FROM queued)),
    NULL
  WHERE ${remediationActive ? 'true' : 'false'}
    AND EXISTS (SELECT 1 FROM queued)
  RETURNING *
)
SELECT
  CASE WHEN (SELECT error FROM validation) IS NULL THEN true ELSE false END AS ok,
  (SELECT error FROM validation) AS error,
  (SELECT row_to_json(updated_publication) FROM updated_publication) AS job,
  (SELECT jsonb_build_object(
    'generationJobId', job_id,
    'avatar', avatar,
    'scene', scene,
    'assetType', asset_type,
    'platform', platform,
    'status', status,
    'runMode', run_mode,
    'startedAt', started_at,
    'promptPack', prompt_pack,
    'referencePreparation', ${sqlJson(referencePreparation)},
    'remediation', ${sqlJson(remediationPayload)},
    'instructions', jsonb_build_array(
      'Submitted to Comfy Cloud API through ai-gateway.',
      'Wait for Comfy Cloud output metadata.',
      'Run or trigger ingest to register generated assets.',
      'US-005 will link generated outputs back to this publication job.'
    )
  ) FROM queued) AS generation;
`;
return [{ json: { query } }];
