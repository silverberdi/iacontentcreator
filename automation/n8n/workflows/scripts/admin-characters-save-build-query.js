function sql(value) {
  if (value === undefined || value === null) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function sqlJson(value) {
  return sql(JSON.stringify(value ?? null)) + '::jsonb';
}
function arr(value) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}
function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

const body = $json.body || $json;
const displayName = String(body.displayName || body.display_name || '').trim();
const avatar = slug(body.avatar || displayName);
const allowedTypes = new Set(['influencer', 'gfe-bfe', 'authority']);
const avatarTypeInput = String(body.avatarType || body.avatar_type || '').trim();
const avatarType = allowedTypes.has(avatarTypeInput) ? avatarTypeInput : 'influencer';
const avatarShort = slug(body.avatarShort || body.avatar_short || avatar.split('-')[0] || '');
const businessProfile = String(body.businessProfile || body.business_profile || 'influencer-brand').trim();
const primaryObjective = String(body.primaryObjective || body.primary_objective || '').trim();
const contentPillars = arr(body.contentPillars || body.content_pillars);
const captionTone = arr(body.captionTone || body.caption_tone);
const brandFit = arr(body.brandFit || body.brand_fit);
const publishingLimits = arr(body.publishingLimits || body.publishing_limits);
const reviewTriggers = arr(body.reviewTriggers || body.review_triggers);
const referencePolicy = body.referencePolicy && typeof body.referencePolicy === 'object' ? body.referencePolicy : {};
const scenes = Array.isArray(body.scenes)
  ? body.scenes
      .map((scene) => ({
        scene: slug(scene.scene || scene.displayName || scene.display_name),
        displayName: String(scene.displayName || scene.display_name || scene.scene || '').trim(),
        description: String(scene.description || '').trim(),
      }))
      .filter((scene) => scene.scene && scene.displayName)
  : [];
const allowedStatuses = new Set(['draft', 'references-needed', 'identity-review', 'ready-for-tests', 'ready']);
const status = allowedStatuses.has(String(body.status)) ? String(body.status) : 'draft';
const notes = String(body.notes || '').trim();

if (!avatar || !avatarShort || !displayName) {
  return { json: { query: "SELECT false AS ok, 'displayName, avatar, and avatarShort are required' AS error;" } };
}

const query = `
CREATE TABLE IF NOT EXISTS character_onboarding (
  avatar text PRIMARY KEY,
  avatar_short text NOT NULL,
  display_name text NOT NULL,
  business_profile text NOT NULL DEFAULT 'influencer-brand',
  primary_objective text NOT NULL DEFAULT '',
  content_pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption_tone jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_fit jsonb NOT NULL DEFAULT '[]'::jsonb,
  publishing_limits jsonb NOT NULL DEFAULT '[]'::jsonb,
  reference_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE character_onboarding ADD COLUMN IF NOT EXISTS avatar_type text NOT NULL DEFAULT 'influencer';
ALTER TABLE character_onboarding ADD COLUMN IF NOT EXISTS review_triggers jsonb NOT NULL DEFAULT '[]'::jsonb;
WITH saved AS (
  INSERT INTO character_onboarding (
    avatar, avatar_type, avatar_short, display_name, business_profile, primary_objective,
    content_pillars, caption_tone, brand_fit, publishing_limits, review_triggers, reference_policy,
    scenes, onboarding_status, notes
  ) VALUES (
    ${sql(avatar)}, ${sql(avatarType)}, ${sql(avatarShort)}, ${sql(displayName)}, ${sql(businessProfile)}, ${sql(primaryObjective)},
    ${sqlJson(contentPillars)}, ${sqlJson(captionTone)}, ${sqlJson(brandFit)}, ${sqlJson(publishingLimits)}, ${sqlJson(reviewTriggers)}, ${sqlJson(referencePolicy)},
    ${sqlJson(scenes)}, ${sql(status)}, ${sql(notes)}
  )
  ON CONFLICT (avatar) DO UPDATE SET
    avatar_type = EXCLUDED.avatar_type,
    avatar_short = EXCLUDED.avatar_short,
    display_name = EXCLUDED.display_name,
    business_profile = EXCLUDED.business_profile,
    primary_objective = EXCLUDED.primary_objective,
    content_pillars = EXCLUDED.content_pillars,
    caption_tone = EXCLUDED.caption_tone,
    brand_fit = EXCLUDED.brand_fit,
    publishing_limits = EXCLUDED.publishing_limits,
    review_triggers = EXCLUDED.review_triggers,
    reference_policy = EXCLUDED.reference_policy,
    scenes = EXCLUDED.scenes,
    onboarding_status = EXCLUDED.onboarding_status,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING *
), avatar_upsert AS (
  INSERT INTO avatar_catalog (avatar, avatar_short, display_name, avatar_kind, description, notes, is_enabled)
  SELECT avatar, avatar_short, display_name, avatar_type, primary_objective, notes, true FROM saved
  ON CONFLICT (avatar) DO UPDATE SET
    avatar_short = EXCLUDED.avatar_short,
    display_name = EXCLUDED.display_name,
    avatar_kind = EXCLUDED.avatar_kind,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    is_enabled = true,
    disabled_at = NULL,
    disabled_reason = NULL,
    updated_at = now()
  RETURNING *
), scene_rows AS (
  SELECT item->>'scene' AS scene, item->>'displayName' AS display_name, COALESCE(item->>'description', '') AS description
  FROM saved, jsonb_array_elements(saved.scenes) AS item
), scene_upsert AS (
  INSERT INTO scene_catalog (scene, display_name, description, is_enabled, is_active, avatar)
  SELECT scene, display_name, description, true, true, NULL FROM scene_rows
  ON CONFLICT (scene) DO UPDATE SET
    avatar = NULL,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_enabled = true,
    is_active = true,
    disabled_at = NULL,
    disabled_reason = NULL,
    updated_at = now()
  RETURNING *
)
SELECT true AS ok,
  jsonb_build_object(
    'avatar', avatar,
    'avatarType', avatar_type,
    'avatarShort', avatar_short,
    'displayName', display_name,
    'businessProfile', business_profile,
    'primaryObjective', primary_objective,
    'contentPillars', content_pillars,
    'captionTone', caption_tone,
    'brandFit', brand_fit,
    'publishingLimits', publishing_limits,
    'reviewTriggers', review_triggers,
    'referencePolicy', reference_policy,
    'scenes', scenes,
    'status', onboarding_status,
    'notes', notes,
    'createdAt', created_at,
    'updatedAt', updated_at,
    'readiness', jsonb_build_object(
      'profileComplete', (avatar <> '' AND avatar_short <> '' AND display_name <> '' AND avatar_type <> '' AND business_profile <> '' AND primary_objective <> '' AND jsonb_array_length(content_pillars) > 0 AND jsonb_array_length(caption_tone) > 0 AND jsonb_array_length(brand_fit) > 0 AND jsonb_array_length(review_triggers) > 0),
      'hasScenes', jsonb_array_length(scenes) > 0,
      'hasReferencePlan', COALESCE((reference_policy->>'identityCanon')::boolean, false) AND COALESCE((reference_policy->>'sceneCanon')::boolean, false),
      'readyForPublication', onboarding_status = 'ready'
    )
  ) AS character
FROM saved;
`;

return { json: { query } };
