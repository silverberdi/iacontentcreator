# Operación visual con RunComfy

Esta carpeta es la fuente central de trazabilidad para modelos, workflows y generaciones realizadas mediante RunComfy.

## Reglas obligatorias

1. Todo modelo, LoRA, checkpoint, ControlNet o recurso equivalente se registra antes de usarse en una generación destinada a publicación.
2. Todo workflow debe estar registrado antes de marcar una salida como aprobada.
3. Un asset puede entrar a `raw`, `selected` o `rejected` durante laboratorio.
4. Un asset solo puede entrar a `approved` o `published` si el modelo y workflow asociados tienen estado permitido.
5. Las evidencias de licencia se guardan en `evidence/`.
6. Los assets pertenecen al avatar, no a esta carpeta global.
7. Los assets se mueven hacia el destino; no se copian para evitar duplicación.

## Estados de modelos

- `PENDING_REVIEW`: identificado, todavía sin decisión.
- `LAB_ONLY`: permitido solo para experimentación; no publicar ni monetizar.
- `APPROVED_COMMERCIAL`: evidencia revisada y uso comercial permitido según la licencia documentada.
- `REJECTED`: no usar.
- `REQUIRES_LEGAL_REVIEW`: existe ambigüedad importante.

## Estados de workflows

- `LAB_ONLY`
- `APPROVED`
- `RETIRED`

## Etapas de assets

- `raw`: resultado bruto recibido.
- `selected`: candidato seleccionado, todavía no publicable.
- `approved`: autorizado para uso del proyecto, sujeto a revisión humana final.
- `rejected`: descartado.
- `published`: usado/publicado; no eliminar sin política de archivo.

## Integración futura

Cuando se habilite automatización con n8n, este registro será la base para:
- bloquear generaciones publicables con recursos no aprobados;
- guardar costos por avatar/workflow;
- auditar qué modelo produjo cada imagen;
- enviar trabajos a un deployment de RunComfy.
