CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS character_canon_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar text NOT NULL REFERENCES character_onboarding(avatar) ON DELETE CASCADE,
  canon_version integer NOT NULL,
  schema_version text NOT NULL DEFAULT 'character-canon-v1',
  status text NOT NULL DEFAULT 'draft',
  canon_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  canon_markdown text NOT NULL DEFAULT '',
  conversation_summary text,
  import_summary text,
  approved_at timestamptz,
  approved_by text,
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avatar, canon_version)
);

CREATE INDEX IF NOT EXISTS character_canon_versions_avatar_status_idx
  ON character_canon_versions (avatar, status, canon_version DESC);

SELECT jsonb_build_object(
  'canons', COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'avatar', avatar,
    'canonVersion', canon_version,
    'schemaVersion', schema_version,
    'status', status,
    'canonJson', canon_json,
    'canonMarkdown', canon_markdown,
    'conversationSummary', conversation_summary,
    'importSummary', import_summary,
    'approvedAt', approved_at,
    'approvedBy', approved_by,
    'createdAt', created_at,
    'updatedAt', updated_at
  ) ORDER BY canon_version DESC), '[]'::jsonb),
  'approvedCanon', (
    SELECT jsonb_build_object(
      'id', approved.id,
      'avatar', approved.avatar,
      'canonVersion', approved.canon_version,
      'schemaVersion', approved.schema_version,
      'status', approved.status,
      'canonJson', approved.canon_json,
      'canonMarkdown', approved.canon_markdown,
      'conversationSummary', approved.conversation_summary,
      'importSummary', approved.import_summary,
      'approvedAt', approved.approved_at,
      'approvedBy', approved.approved_by,
      'createdAt', approved.created_at,
      'updatedAt', approved.updated_at
    )
    FROM character_canon_versions approved
    WHERE approved.avatar = $1 AND approved.status = 'approved'
    ORDER BY approved.canon_version DESC
    LIMIT 1
  )
) AS result
FROM character_canon_versions
WHERE avatar = $1;
