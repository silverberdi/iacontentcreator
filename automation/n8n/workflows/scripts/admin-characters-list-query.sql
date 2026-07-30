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

INSERT INTO character_onboarding (
  avatar,
  avatar_type,
  avatar_short,
  display_name,
  business_profile,
  primary_objective,
  content_pillars,
  caption_tone,
  brand_fit,
  publishing_limits,
  review_triggers,
  reference_policy,
  scenes,
  onboarding_status,
  notes
)
SELECT
  ac.avatar,
  CASE
    WHEN ac.avatar_kind IN ('influencer', 'gfe-bfe', 'authority') THEN ac.avatar_kind
    WHEN ac.avatar_kind IN ('gfe', 'bfe', 'soft-gfe', 'soft-bfe') THEN 'gfe-bfe'
    WHEN ac.avatar_kind IN ('technical-authority', 'expert', 'educator') THEN 'authority'
    ELSE 'influencer'
  END,
  ac.avatar_short,
  ac.display_name,
  COALESCE(NULLIF(ac.avatar_kind, ''), 'influencer-brand'),
  COALESCE(ac.description, ''),
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"identityCanon":true,"sceneCanon":true,"supportingReference":true,"rejectedReference":true}'::jsonb,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'scene', sc.scene,
      'displayName', sc.display_name,
      'description', COALESCE(sc.description, '')
    ) ORDER BY sc.display_name)
    FROM scene_catalog sc
    WHERE sc.avatar = ac.avatar AND sc.is_enabled = true
  ), '[]'::jsonb),
  'ready-for-tests',
  'Imported from existing avatar catalog.'
FROM avatar_catalog ac
WHERE ac.is_enabled = true
ON CONFLICT (avatar) DO NOTHING;

UPDATE character_onboarding
SET avatar_type = 'influencer'
WHERE avatar = 'estefania-montealegre' AND avatar_type IS DISTINCT FROM 'influencer';

UPDATE character_onboarding
SET avatar_type = CASE
  WHEN lower(COALESCE(business_profile, '')) IN ('gfe', 'bfe', 'soft-gfe', 'soft-bfe', 'relationship-companion') THEN 'gfe-bfe'
  WHEN lower(COALESCE(business_profile, '')) IN ('technical-authority', 'authority-brand', 'expert', 'educator') THEN 'authority'
  ELSE avatar_type
END
WHERE avatar_type = 'influencer'
  AND lower(COALESCE(business_profile, '')) IN ('gfe', 'bfe', 'soft-gfe', 'soft-bfe', 'relationship-companion', 'technical-authority', 'authority-brand', 'expert', 'educator');

SELECT jsonb_build_object(
  'characters', COALESCE(jsonb_agg(jsonb_build_object(
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
  ) ORDER BY display_name), '[]'::jsonb)
) AS result
FROM character_onboarding;
