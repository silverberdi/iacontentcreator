function sql(value) {
  if (value === undefined || value === null) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function sqlJson(value) {
  return sql(JSON.stringify(value ?? null)) + '::jsonb';
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
const avatar = slug(body.avatar || body.canonJson?.avatar || '');
const allowedStatuses = new Set([
  'draft',
  'proposed',
  'proposed-import',
  'operator-reviewed',
  'approved',
  'superseded',
]);
const status = allowedStatuses.has(String(body.status)) ? String(body.status) : 'draft';
const schemaVersion = String(body.schemaVersion || body.schema_version || 'character-canon-v1').trim();
const canonJson = body.canonJson && typeof body.canonJson === 'object' ? body.canonJson : {};
const canonMarkdown = String(body.canonMarkdown || body.canon_markdown || '').trim();
const conversationSummary = String(body.conversationSummary || body.conversation_summary || '').trim();
const importSummary = String(body.importSummary || body.import_summary || '').trim();
const approvedBy = String(body.approvedBy || body.approved_by || 'operator').trim();

if (!avatar || !canonJson || Object.keys(canonJson).length === 0) {
  return [{ json: { query: "SELECT false AS ok, 'avatar and canonJson are required' AS error;" } }];
}

const query = `
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

WITH next_version AS (
  SELECT COALESCE(MAX(canon_version), 0) + 1 AS canon_version
  FROM character_canon_versions
  WHERE avatar = ${sql(avatar)}
), superseded AS (
  UPDATE character_canon_versions
  SET status = 'superseded',
      superseded_at = now(),
      updated_at = now()
  WHERE avatar = ${sql(avatar)}
    AND status = 'approved'
    AND ${status === 'approved' ? 'true' : 'false'}
  RETURNING id
), saved AS (
  INSERT INTO character_canon_versions (
    avatar,
    canon_version,
    schema_version,
    status,
    canon_json,
    canon_markdown,
    conversation_summary,
    import_summary,
    approved_at,
    approved_by
  )
  SELECT
    ${sql(avatar)},
    next_version.canon_version,
    ${sql(schemaVersion)},
    ${sql(status)},
    ${sqlJson(canonJson)},
    ${sql(canonMarkdown)},
    ${sql(conversationSummary)},
    ${sql(importSummary)},
    CASE WHEN ${sql(status)} = 'approved' THEN now() ELSE NULL END,
    CASE WHEN ${sql(status)} = 'approved' THEN ${sql(approvedBy)} ELSE NULL END
  FROM next_version
  RETURNING *
)
SELECT true AS ok,
  jsonb_build_object(
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
  ) AS canon
FROM saved;
`;

return [{ json: { query } }];
