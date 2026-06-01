# Avatares AI — Review Notes API Pendiente

## Estado

Pendiente.

## Objetivo

Crear un endpoint para actualizar notas de revisión sin cambiar el estado del asset.

Actualmente se puede escribir `reviewNotes` cuando:

```text
se promueve un asset
se rechaza un asset
```

Pero no existe un endpoint dedicado para editar notas sin modificar `status`.

## Endpoint propuesto

```text
POST /webhook/assets/update-review-notes
```

## Payload propuesto

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Better face consistency, but hands are weak."
}
```

## Respuesta esperada

```json
{
  "updated": true,
  "assetId": "...",
  "status": "raw",
  "reviewNotes": "Better face consistency, but hands are weak."
}
```

## Reglas propuestas

```text
1. No cambia status.
2. No cambia is_canonical.
3. No cambia canonical_group.
4. Actualiza review_notes en columna directa.
5. Actualiza metadata.reviewNotes en JSONB.
```

## Prioridad

Baja.

No bloquea el ciclo mínimo de curación porque ya existen:

```text
List Review Candidates
Promote Canonical
Reject Asset
Get Canonical
```

## Cuándo implementarlo

Implementar antes del Viewer / Dashboard si la UI necesita edición de notas sin promover/rechazar.
