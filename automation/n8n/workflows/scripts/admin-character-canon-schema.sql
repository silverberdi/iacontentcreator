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

CREATE TABLE IF NOT EXISTS character_canon_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar text NOT NULL REFERENCES character_onboarding(avatar) ON DELETE CASCADE,
  source_kind text NOT NULL DEFAULT 'markdown-import',
  source_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_hash text NOT NULL,
  status text NOT NULL DEFAULT 'proposed-import',
  canon_version_id uuid REFERENCES character_canon_versions(id) ON DELETE SET NULL,
  import_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (avatar, source_hash)
);
