function sql(value) {
  if (value === undefined || value === null || String(value).trim() === '') return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}
const body = $json.body || $json;
const publicationJobId = String(body.publicationJobId || body.publication_job_id || '').trim();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(publicationJobId)) {
  return [{ json: { query: "SELECT false AS ok, 'publicationJobId is required' AS error;" } }];
}
const manualPromptPack = body.promptPack && typeof body.promptPack === 'object' ? body.promptPack : null;
const query = `
WITH job AS (
  SELECT *
  FROM publication_jobs
  WHERE publication_job_id = ${sql(publicationJobId)}::uuid
  LIMIT 1
), scene_refs AS (
  SELECT
    car.asset_id,
    car.bucket,
    car.object_path,
    car.status,
    car.is_canonical,
    car.created_at,
    car.metadata,
    'scene-canon' AS reference_role,
    'scene-canon' AS reference_source,
    1 AS reference_priority
  FROM canonical_asset_registry car
  JOIN job pj ON pj.avatar = car.avatar
  WHERE car.scene = (SELECT scene FROM job)
    AND car.asset_type = 'raw-image'
    AND COALESCE(car.status, '') IN ('canonical', 'selected', 'raw')
  ORDER BY
    CASE
      WHEN COALESCE(car.is_canonical, false) = true OR car.status = 'canonical' THEN 1
      WHEN car.status = 'selected' THEN 2
      WHEN car.status = 'raw' THEN 3
      ELSE 4
    END,
    car.created_at DESC
  LIMIT 6
), identity_refs AS (
  SELECT
    car.asset_id,
    car.bucket,
    car.object_path,
    car.status,
    car.is_canonical,
    car.created_at,
    car.metadata,
    'identity-canon' AS reference_role,
    'identity-canon-fallback' AS reference_source,
    2 AS reference_priority
  FROM canonical_asset_registry car
  JOIN job pj ON pj.avatar = car.avatar
  WHERE car.scene IN ('portrait-canon', 'public-identity')
    AND car.asset_type = 'raw-image'
    AND COALESCE(car.status, '') IN ('canonical', 'selected', 'raw')
  ORDER BY
    CASE
      WHEN COALESCE(car.is_canonical, false) = true OR car.status = 'canonical' THEN 1
      WHEN car.status = 'selected' THEN 2
      WHEN car.status = 'raw' THEN 3
      ELSE 4
    END,
    car.created_at DESC
  LIMIT 4
), refs AS (
  SELECT * FROM scene_refs
  UNION ALL
  SELECT * FROM identity_refs
  WHERE NOT EXISTS (SELECT 1 FROM scene_refs)
), human_feedback AS (
  SELECT
    car.asset_id,
    car.status,
    car.review_notes,
    car.created_at,
    car.metadata->'publicationHumanFeedback' AS feedback
  FROM canonical_asset_registry car
  JOIN job pj ON pj.avatar = car.avatar AND pj.scene = car.scene
  WHERE car.asset_type = 'raw-image'
    AND car.metadata->'publicationHumanFeedback' IS NOT NULL
    AND car.asset_id::text <> COALESCE(pj.metadata->>'latestGeneratedAssetId', '')
  ORDER BY car.created_at DESC
  LIMIT 8
)
SELECT
  true AS ok,
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
  pj.updated_at AS "updatedAt",
  ac.display_name AS "avatarDisplayName",
  ac.avatar_short AS "avatarShort",
  sc.display_name AS "sceneDisplayName",
  COALESCE(sc.description, '') AS "sceneDescription",
  COALESCE(sb.visual_intent, '') AS "sceneVisualIntent",
  COALESCE(sb.allowed_mood, '') AS "sceneAllowedMood",
  COALESCE(sb.avoid, '[]'::jsonb) AS "sceneAvoidRules",
  COALESCE(sb.content_angle, '') AS "sceneContentAngle",
  COALESCE(sb.prompt_notes, '') AS "scenePromptNotes",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'assetId', asset_id,
      'status', status,
      'isCanonical', COALESCE(is_canonical, false),
      'minioBucket', bucket,
      'minioObjectPath', object_path,
      'objectPath', object_path,
      'publicUrl', '/minio/' || bucket || '/' || object_path,
      'url', '/minio/' || bucket || '/' || object_path,
      'comfyInputName', NULLIF(metadata->>'comfyInputName', ''),
      'comfyLoadable', NULLIF(metadata->>'comfyInputName', '') IS NOT NULL,
      'referenceRole', reference_role,
      'source', reference_source
    ) ORDER BY reference_priority, created_at DESC)
    FROM refs
  ), '[]'::jsonb) AS "referenceImages",
  COALESCE((
    SELECT jsonb_build_object(
      'strategy', CASE WHEN EXISTS (SELECT 1 FROM scene_refs) THEN 'scene-canon' ELSE 'identity-canon-fallback' END,
      'sceneReferenceCount', (SELECT COUNT(*) FROM scene_refs),
      'identityReferenceCount', (SELECT COUNT(*) FROM identity_refs),
      'usesActiveIngestProfile', false,
      'note', 'Creative reference selection is resolved from canonical_asset_registry by avatar and scene. Active ingest profiles are ignored.'
    )
  ), '{}'::jsonb) AS "referenceResolution",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'assetId', asset_id,
      'assetStatus', status,
      'createdAt', created_at,
      'feedback', feedback
    ))
    FROM human_feedback
  ), '[]'::jsonb) AS "humanFeedback",
  ${sql(JSON.stringify(manualPromptPack))}::jsonb AS "manualPromptPack"
FROM job pj
LEFT JOIN avatar_catalog ac ON ac.avatar = pj.avatar
LEFT JOIN scene_catalog sc ON sc.avatar = pj.avatar AND sc.scene = pj.scene
LEFT JOIN scene_brief_catalog sb ON sb.avatar = pj.avatar AND sb.scene = pj.scene
LIMIT 1;
`;
return [{ json: { query } }];
