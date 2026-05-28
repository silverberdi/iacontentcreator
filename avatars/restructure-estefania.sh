#!/usr/bin/env bash
set -euo pipefail

ROOT="estefania-montealegre"
BACKUP_QUARANTINE="$ROOT/_quarantine"

if [ ! -d "$ROOT" ]; then
  echo "ERROR: No existe la carpeta $ROOT"
  exit 1
fi

echo "==> Reestructurando $ROOT"

mkdir -p \
  "$ROOT/00-identity" \
  "$ROOT/01-lore" \
  "$ROOT/02-visual/references/approved" \
  "$ROOT/02-visual/references/rejected" \
  "$ROOT/02-visual/references/exploration" \
  "$ROOT/03-prompts" \
  "$ROOT/04-production/comfyui/workflows" \
  "$ROOT/04-production/runcomfy/assets" \
  "$ROOT/04-production/generations/approved" \
  "$ROOT/04-production/generations/rejected" \
  "$ROOT/04-production/generations/drafts" \
  "$ROOT/04-production/datasets/training-candidates" \
  "$ROOT/05-content" \
  "$ROOT/06-growth" \
  "$ROOT/07-system/identity-preservation" \
  "$ROOT/08-assets" \
  "$BACKUP_QUARANTINE"

move_if_exists() {
  local src="$1"
  local dst="$2"

  if [ -e "$src" ]; then
    mkdir -p "$(dirname "$dst")"

    if [ -e "$dst" ]; then
      echo "WARN: destino ya existe, enviando a quarantine: $src"
      mkdir -p "$BACKUP_QUARANTINE/conflicts"
      mv "$src" "$BACKUP_QUARANTINE/conflicts/$(basename "$src")"
    else
      echo "MOVE: $src -> $dst"
      mv "$src" "$dst"
    fi
  fi
}

move_dir_contents() {
  local src="$1"
  local dst="$2"

  if [ -d "$src" ]; then
    mkdir -p "$dst"
    shopt -s dotglob nullglob
    for item in "$src"/*; do
      move_if_exists "$item" "$dst/$(basename "$item")"
    done
    shopt -u dotglob nullglob
  fi
}

quarantine_if_exists() {
  local src="$1"
  if [ -e "$src" ]; then
    mkdir -p "$BACKUP_QUARANTINE/discarded"
    echo "QUARANTINE: $src"
    mv "$src" "$BACKUP_QUARANTINE/discarded/$(basename "$src")"
  fi
}

# Identity / psychology
move_dir_contents "$ROOT/00-core" "$ROOT/00-identity"
move_dir_contents "$ROOT/01-psychology" "$ROOT/00-identity"

# Visual markdown canon
move_if_exists "$ROOT/02-visual/visual-system.md" "$ROOT/02-visual/visual-canon.md"
move_if_exists "$ROOT/02-visual/visual-dna-master.md" "$ROOT/02-visual/visual-dna-master.md"
move_if_exists "$ROOT/02-visual/camera-dna.md" "$ROOT/02-visual/camera-language.md"
move_if_exists "$ROOT/02-visual/fashion-dna.md" "$ROOT/02-visual/wardrobe.md"
move_if_exists "$ROOT/02-visual/environment-dna.md" "$ROOT/02-visual/environment-dna.md"
move_if_exists "$ROOT/02-visual/hero-face-exploration.md" "$ROOT/02-visual/hero-face-exploration.md"
move_if_exists "$ROOT/02-visual/hero-shot-blueprints.md" "$ROOT/02-visual/hero-shot-blueprints.md"
move_if_exists "$ROOT/02-visual/visual-execution-roadmap.md" "$ROOT/02-visual/visual-execution-roadmap.md"
move_if_exists "$ROOT/02-visual/selection-registry.md" "$ROOT/02-visual/selection-registry.md"

# Visual image references
move_dir_contents "$ROOT/02-visual/01-canon" "$ROOT/02-visual/references/approved"
move_dir_contents "$ROOT/02-visual/02-style" "$ROOT/02-visual/references/exploration"
move_dir_contents "$ROOT/02-visual/03-reference-pack" "$ROOT/02-visual/references/approved"

# Content
move_dir_contents "$ROOT/03-content" "$ROOT/05-content"

# Prompts / production docs
move_if_exists "$ROOT/04-production/prompt-foundations.md" "$ROOT/03-prompts/prompt-foundations.md"
move_if_exists "$ROOT/04-production/prompt-iterations.md" "$ROOT/03-prompts/prompt-iterations.md"
move_if_exists "$ROOT/04-production/visual-exploration-pack.md" "$ROOT/03-prompts/visual-exploration-pack.md"

# Workflows
move_dir_contents "$ROOT/04-production/workflows" "$ROOT/04-production/comfyui/workflows"

# Assets
move_dir_contents "$ROOT/05-assets/references" "$ROOT/04-production/datasets"
move_dir_contents "$ROOT/05-assets/runcomfy" "$ROOT/04-production/runcomfy/assets"
move_dir_contents "$ROOT/05-assets/selects" "$ROOT/04-production/generations/approved"
move_dir_contents "$ROOT/05-assets/generations" "$ROOT/04-production/generations/drafts"
move_dir_contents "$ROOT/05-assets/training-candidates" "$ROOT/04-production/datasets/training-candidates"
move_dir_contents "$ROOT/05-assets/identity-preservation-v02" "$ROOT/07-system/identity-preservation"

# Legacy core datasets
move_dir_contents "$ROOT/estefania-core-v1" "$ROOT/04-production/datasets/legacy-core-v1"
move_dir_contents "$ROOT/estefania-core-v2" "$ROOT/04-production/datasets/legacy-core-v2"

# Empty / obsolete folders to quarantine
quarantine_if_exists "$ROOT/prompts"
quarantine_if_exists "$ROOT/05-assets/audit-contact-sheets"
quarantine_if_exists "$ROOT/05-assets/exports"

# Remove empty dirs safely
find "$ROOT" -type d -empty -not -path "$BACKUP_QUARANTINE*" -delete

echo "==> Listo."
echo "Revisa: $BACKUP_QUARANTINE"
echo "Si todo está bien, puedes eliminar _quarantine manualmente."