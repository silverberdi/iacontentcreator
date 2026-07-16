#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_ROOT="$BASE_DIR/snapshots"
COMPOSE_FILE="$HOME/local-ai-stack/compose.yaml"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SNAPSHOT_DIR="$SNAPSHOT_ROOT/$TIMESTAMP"

mkdir -p "$SNAPSHOT_DIR"/{docker,n8n,postgres,system}

if [ -f "$COMPOSE_FILE" ]; then
  cp "$COMPOSE_FILE" "$SNAPSHOT_DIR/docker/compose.yaml"
fi

if [ -f "$HOME/local-ai-stack/.env" ]; then
  grep -vE 'PASSWORD|SECRET|KEY|TOKEN' "$HOME/local-ai-stack/.env" > "$SNAPSHOT_DIR/docker/env.redacted" || true
fi

docker compose -f "$COMPOSE_FILE" ps > "$SNAPSHOT_DIR/system/docker-compose-ps.txt" || true

docker ps > "$SNAPSHOT_DIR/system/docker-ps.txt" || true

docker exec local-ai-stack-postgres-1 pg_dump \
  -U n8n \
  -d n8n \
  --schema-only \
  > "$SNAPSHOT_DIR/postgres/schema.sql" || true

docker exec local-ai-stack-postgres-1 psql \
  -U n8n \
  -d n8n \
  -c "\\d canonical_asset_registry" \
  > "$SNAPSHOT_DIR/postgres/canonical_asset_registry.describe.txt" || true

docker exec local-ai-stack-n8n-1 n8n export:workflow \
  --all \
  --output=/tmp/workflows.json || true

docker cp \
  local-ai-stack-n8n-1:/tmp/workflows.json \
  "$SNAPSHOT_DIR/n8n/workflows.json" || true
  
echo "Snapshot created: $SNAPSHOT_DIR"
