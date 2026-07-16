# Avatares AI — Delete Ingest Profile

## Endpoint

```text
POST /webhook/admin/ingest-profiles/delete
```

## Request body

```json
{
  "profileId": "uuid-of-profile",
  "profile_id": "uuid-of-profile"
}
```

## Delete eligibility

There is no direct `ingest_profiles → assets` foreign key exposed to the dashboard.

Deletion is allowed only when **no rows exist** in `canonical_asset_registry` for the profile’s:

```text
avatar
scene
asset_type   (matches ingest profile assetType)
```

The Asset Review Dashboard pre-checks the same rule via `POST /assets/review-candidates` with `limit: 1`.

## Suggested n8n workflow logic

1. Load profile by `profile_id` from `ingest_profiles`.
2. Count assets:

```sql
SELECT COUNT(*)::int AS asset_count
FROM canonical_asset_registry
WHERE avatar = $1
  AND scene = $2
  AND asset_type = $3;
```

3. If `asset_count > 0`, respond:

```json
{
  "ok": false,
  "deleted": false,
  "error": "This profile cannot be deleted because assets already exist for it.",
  "assetCount": 12
}
```

4. If `asset_count = 0`, delete:

```sql
DELETE FROM ingest_profiles
WHERE profile_id = $4
RETURNING profile_id, profile_name;
```

5. Success response:

```json
{
  "ok": true,
  "deleted": true,
  "profileId": "...",
  "profileName": "Estefanía / Coffee Rain / Raw Image"
}
```

## Notes

- Physical delete only (no soft-delete).
- If the deleted row was `is_active = true`, clear or reassign active profile in the same workflow before responding.
- Publish workflow as `Avatares_AI_Admin_Delete_Ingest_Profile_v1.json` (or equivalent).
