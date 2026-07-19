# Avatares AI — Handoff Para Nueva Conversacion

Fecha de handoff: 2026-07-19  
Repo local: `/Users/silveriobernal/Documents/Code/Development/iacontentcreator`  
Branch actual: `codex-wave1-estefania-stabilization`  
Ultimo commit confirmado: `d329e31 docs: prioritize compact publications workspace`  
Servidor principal: `silverman@192.168.0.194`  
Stack en servidor: `~/local-ai-stack`  
Consola publica: `https://avatars.silverman.pro`  
Consola LAN/local service: `http://192.168.0.194:8088` / container escucha detras de `127.0.0.1:8088`  

Este documento existe para iniciar una conversacion nueva sin perder contexto. La conversacion anterior ya era grande y se sentia lenta. La siguiente conversacion debe leer este archivo primero y continuar desde aqui.

---

## 1. Que Es Este Proyecto

El proyecto se llama Avatares AI dentro del repo `iacontentcreator`.

La idea general es crear y operar avatares virtuales semi autonomos de diferentes lineas de negocio:

- Influencers AI.
- GFE/BFE o companionship monetizable, con limites y decisiones de seguridad pendientes.
- Authority / expertos tecnicos o personajes de autoridad.

El objetivo no es solo generar imagenes. El objetivo es montar una operacion: personajes con identidad consistente, contenidos, generacion visual, revision, seleccion, copy, exportacion, y publicacion manual o asistida.

El sistema debe funcionar de forma semi autonoma:

- La IA puede ayudar a generar brief, prompt, imagen, copy, QA y recomendaciones.
- El operador humano mantiene control sobre decisiones criticas.
- La publicacion final queda en manos del usuario.
- Ninguna imagen debe canonizarse automaticamente.
- Nada debe publicarse automaticamente en Wave 1.

La primera fase real de producto es Wave 1: terminar a Estefania Montealegre como influencer AI operable.

---

## 2. Intencion De Negocio

La intencion de negocio fue definida durante la conversacion y documentada en el repo.

### Estefania Montealegre

Estefania es la influencer AI principal.

Objetivo:

- Generar contenido organico de lifestyle.
- Construir afinidad de audiencia.
- Hacer que marcas se interesen en ella.
- Prepararla para vender colaboraciones o branded content.

Plataforma inicial:

- Instagram.

Cuenta creada por el usuario:

- Email: `estefania.montealegre.ai@gmail.com`
- Instagram handle: `@estefaniamontealegre.ai`
- URL: `https://www.instagram.com/estefaniamontealegre.ai/`

Decision importante:

- Se acepto usar `.ai` en el handle.
- Se recomendo marcarla como AI creator.
- La publicacion es manual-assisted por ahora.

### Diana "Didi" Duarte

Didi es el avatar GFE.

Objetivo:

- Monetizacion tipo GFE/companionship.
- Posible uso de plataformas como Fansly.
- Hay que revisar reglas de plataforma, consentimiento, safety, limites de contenido y monetizacion antes de implementarla.

Didi no es prioridad tecnica de Wave 1.

### Authority Avatars

Los authority/expertos tecnicos se veran mas adelante cuando Estefania ya este andando.

Hay avatares como Donovan J. Scott, Silverio Bernal y Andres Ferrer en el repo, con distinto nivel de documentacion.

---

## 3. Metodologia De Trabajo

Se esta trabajando con Product Backlog y User Stories.

Archivo principal de backlog:

- `planning/backlog/WAVE-01-estefania-publications.md`

Wave actual:

- Wave 1 — Estefania Publications MVP.

Reglas de metodologia:

- Cada cambio importante debe tener US.
- Las US se redactan antes de implementar cuando el alcance cambia.
- Las US deben quedar en el backlog con status, prioridad, epic, acceptance criteria, technical tasks, dependencies y notes.
- Se hace commit/push frecuente.
- Se despliega al servidor cuando el cambio afecta la consola o n8n live.
- No crear documentos innecesarios cuando el usuario pide solo respuesta en pantalla.
- En handoffs o cambios de fase, si conviene, si se crean documentos.

Decisiones de proceso importantes:

- No se deben hardcodear valores que luego impidan agregar mas avatares.
- Estefania es foco de Wave 1, pero la estructura debe permitir otros avatares.
- `assetType` existe internamente pero se decidio ocultarlo en UI y usar `raw-image` como default.
- `status` se usa para el estado operativo visible; `assetType` no debe dirigir la UX del operador.
- Se esta migrando hacia contratos de perfil en JSON, pero todavia hay MD importantes.
- El contrato de personaje no debe ser un unico MD para todos; debe existir un estandar minimo con extensiones por avatar.

---

## 4. Arquitectura General

Flujo conceptual de Wave 1:

```text
console
-> n8n
-> ai-gateway
-> DeepSeek / AI providers
-> Comfy Cloud
-> MinIO
-> Postgres
-> Asset Review
-> Publishing Pack
-> publicacion manual en Instagram
```

Componentes:

- Consola web React/Vite: `apps/asset-review-dashboard`.
- Gateway interno de auth para la consola: `apps/asset-review-dashboard/server/auth-gateway.mjs`.
- n8n workflows versionados: `automation/n8n/workflows`.
- ai-gateway Node service: `infra/ai-gateway`.
- MinIO para assets.
- Postgres para registry, jobs, metadata y eventos.
- Comfy Cloud para generacion visual.
- Cloudflare Tunnel para publicar la consola.
- Google OAuth para login.

---

## 5. Infraestructura Y Servicios

Servidor:

- Host: `192.168.0.194`
- Usuario SSH: `silverman`
- Stack path: `~/local-ai-stack`

Servicios importantes en el server:

- `local-ai-stack-asset-review-dashboard-1`
- `local-ai-stack-n8n-1`
- `local-ai-stack-n8n-gateway-1`
- `local-ai-stack-ai-gateway-1`
- `local-ai-stack-postgres-1`
- MinIO service dentro del stack.

Consola:

- Publica: `https://avatars.silverman.pro`
- LAN: `http://192.168.0.194:8088`

Cloudflare:

- El tunnel actual publicado usa hostname `avatars.silverman.pro`.
- La ruta publica debe apuntar al servicio de consola en `http://localhost:8088` o equivalente desde el host donde corre `cloudflared`.
- Hubo confusion inicial con `avatar-ai.silverman.pro`; el hostname final correcto es `avatars.silverman.pro`.

Google OAuth:

- Configurado para login con Gmail.
- Authorized JavaScript origin: `https://avatars.silverman.pro`
- Authorized redirect URI: `https://avatars.silverman.pro/auth/callback`
- App publicada en produccion en Google Auth Platform.
- Hubo errores previos:
  - `invalid_client` por client id/secret/config incorrecta.
  - `Invalid OAuth state` por usar/callback incorrecto o abrir URL callback directamente.
- Ya esta funcionando login.

Accesos autorizados:

- `silverio.bernal@gmail.com`: Admin + technical mode.
- `ltmoralesp84@gmail.com`: admin.
- Otros usuarios pueden registrarse pero quedan pendientes de aprobacion por Silverio antes de entrar.

---

## 6. Variables Y Secretos

No incluir secretos en commits ni en este handoff.

Secretos/config conocidos por tipo:

- Google OAuth client id/secret en server/env.
- DeepSeek API key y modelo en `ai-gateway`.
- Comfy Cloud API key/config en server/env.
- MinIO base URL y credenciales en server/env.
- Visual QA provider opcional en `ai-gateway`.

DeepSeek:

- Se configuro API key.
- Modelo recomendado/usado: DeepSeek Chat o el modelo configurado en `DEEPSEEK_MODEL`.
- Las llamadas a DeepSeek deben pasar por `ai-gateway`, no directamente desde n8n.

Comfy:

El usuario tenia variables de otra app:

```text
SILVERMAN_COMFYUI_API_KEY=[token]
SILVERMAN_COMFYUI_API_PREFIX=/api
SILVERMAN_COMFYUI_AUTH_HEADER_NAME=X-API-Key
SILVERMAN_COMFYUI_BASE_URL=https://cloud.comfy.org
```

Decision:

- No necesariamente usar los mismos nombres.
- Copiar/adaptar al entorno de este proyecto.
- Token fue copiado desde `~/silverman-blog-linkedin-worker/.env` hacia el server/config del proyecto.

Visual QA:

`infra/ai-gateway/README.md` define:

```text
VISUAL_QA_API_KEY=...
VISUAL_QA_BASE_URL=https://api.openai-compatible-provider.example/v1
VISUAL_QA_MODEL=...
```

Si `VISUAL_QA_*` no esta configurado, el gateway devuelve QA heuristica explicita y no pretende inspeccionar pixeles.

---

## 7. Estructura Del Repo

Directorios clave:

- `apps/asset-review-dashboard`: consola web.
- `apps/asset-review-dashboard/src/components/PublicationsPanel.tsx`: pantalla principal de publicaciones.
- `apps/asset-review-dashboard/src/components/OperatorHomePanel.tsx`: home operativa con jobs activos.
- `apps/asset-review-dashboard/src/components/DashboardTabs.tsx`: tabs principales.
- `apps/asset-review-dashboard/src/api/publicationsApi.ts`: cliente frontend hacia n8n.
- `apps/asset-review-dashboard/src/types/publications.ts`: tipos del flujo de publicaciones.
- `automation/n8n/workflows`: workflows exportados desde n8n.
- `infra/ai-gateway`: servicio interno para DeepSeek, Comfy submit, reference preparation y QA.
- `docs/product`: documentos de producto.
- `docs/operations`: runbooks y handoffs.
- `planning/backlog`: backlog y US.
- `avatars`: definiciones de personajes, perfil, prompts, visual canon, assets y contratos.

Documentos importantes:

- `docs/product/business-intent.md`
- `docs/product/avatar-taxonomy.md`
- `docs/product/avatar-profile-contract.md`
- `docs/product/avatar-profile-readiness.md`
- `docs/product/avatar-profile.schema.json`
- `docs/product/publication-quality-review.md`
- `docs/operations/runbooks/wave-1-estefania-publication.md`
- `planning/backlog/WAVE-01-estefania-publications.md`
- `avatars/estefania-montealegre/profile-contract.md`
- `avatars/estefania-montealegre/profile.json`

---

## 8. Estado De La Consola

La consola se llama `Avatares AI — Asset Review Dashboard`, aunque ya hace mas que asset review.

Tabs principales actuales:

- `Home`
- `Asset Review`
- `Publications`
- `Ops / Admin`
- `Content Cycle` solo visible en technical mode desde US-033.

### Home

Muestra cola de publication jobs activos.

Archivo:

- `apps/asset-review-dashboard/src/components/OperatorHomePanel.tsx`

Funciona con:

- `POST /publications/jobs/summary`

Utilidad:

- Ver que necesita atencion.
- Abrir un job existente directamente en `Publications`.

### Publications

Archivo:

- `apps/asset-review-dashboard/src/components/PublicationsPanel.tsx`

Es el flujo correcto para Wave 1.

Flujo actual:

1. Continue Existing Job.
2. Create Publication Job.
3. Recommended Action.
4. Job Timeline.
5. Publication Brief.
6. Prompt Pack.
7. Image Generation.
8. Caption / Copy Pack.
9. Publishing Pack.
10. Published Record.
11. Next Steps.

Problema UX actual:

- Todo se renderiza verticalmente.
- Hay demasiado scroll.
- Brief/prompt/copy se muestran como JSON/textareas largos.
- Publish queda muy abajo.
- Image Generation mezcla intentos, status tecnico, ingest tecnico, QA, checklist y seleccion.
- El operador tiene que buscar botones.

US creada para resolver esto:

- US-035 — Compact Publication Workspace UX.

### Asset Review

Sirve para:

- Ver canonical actual.
- Ver candidatos.
- Promover canonical.
- Seleccionar.
- Rechazar.

Fue estabilizado para manejar notas con quotes/apostrofos.

Decision:

- Asset Review sigue siendo util como area editorial/admin.
- En Publications tambien existe seleccion de asset para publication job.
- Seleccion de publicacion no equivale a promover canonical global.

### Ops / Admin

Incluye:

- Auto Ingest.
- Backups.
- Catalogs.
- Access.

Technical mode:

- Muestra operaciones mutantes y tecnicas.
- El usuario Silverio tiene technical mode.
- Usuario admin normal ve menos operaciones peligrosas.

### Content Cycle

Estado:

- Es legacy/manual o flujo anterior.
- Aun existe en codigo.
- Desde US-033 solo se muestra en technical mode.

Razones:

- Habla de copiar paquetes manualmente.
- Habla de marcar Comfy manualmente.
- Ya no representa el flujo actual de Publications.

---

## 9. Estado Del Flujo End-To-End

Se probo generar un job real de Estefania.

El usuario hizo:

1. Genero un nuevo brief.
2. Lo guardo.
3. Genero un nuevo prompt pack.
4. Mando generar imagenes.

Resultado visto en pantalla:

- `Generation completed and ingested.`
- `generationJobId`: `0f9362eb-db89-4a6e-9a41-d172e3fd95d7`
- `status`: `review_required`
- `providerStatus`: `completed`
- `runMode`: `comfy-cloud-api`
- asset:
  - `assetId`: `d6ff4923-c36f-412a-b43c-aab0b451140f`
  - `objectPath`: `avatars/estefania-montealegre/raw-image/estefania-raw-image-nature-cabin-20260718T210300-1Z.png`
- `publicationStatus`: `review-ready`
- `generationStatus`: `review_required`
- QA flags:
  - `foot-risk-review`
  - `hand-risk-review`
  - `identity-review`

Interpretacion:

- La generacion ya termino.
- La imagen se descargo/importo a MinIO/Postgres.
- QA marco revision requerida, no error.
- Siguiente paso para el operador: revisar visualmente y seleccionar o rechazar.

Esto confirma que el flujo Comfy -> ingest -> QA -> UI ya funciona hasta `review-ready`.

---

## 10. Comfy Cloud Y Referencias

Se importo al repo el JSON de Comfy Cloud para Estefania:

- `avatars/estefania-montealegre/04-production/comfyui/workflows/comfy-cloud-api/estefania-montealegre-api.json`

El workflow Comfy requiere imagen de referencia cargable por Comfy.

Error previo importante:

```text
The input file 'avatars/estefania-montealegre/raw-image/...png' specified in your workflow doesn't exist.
Please upload the file first or select a different one (node 47: LoadImage)
```

Causa:

- Se estaba enviando a Comfy un path de MinIO, pero Comfy necesitaba un input name/carga propia.

Solucion implementada:

- US-030: adapter para preparar referencias desde MinIO a Comfy.
- US-032: `Generate images` auto-prepara referencias antes de enviar a Comfy.

Workflow importante:

- `automation/n8n/workflows/Avatares_AI_Publications_Prepare_References.json`
- `automation/n8n/workflows/Avatares_AI_Publications_Generate_Images.json`

Endpoint ai-gateway:

- `POST /comfy/prepare-reference`
- `POST /comfy/publication-submit`

Detalle:

- `metadata.comfyInputName` se guarda en registry cuando una referencia queda preparada.
- Si falta `comfyInputName`, generation debe preparar antes o bloquear con error claro.
- Manual `Prepare references` queda solo en technical mode.

---

## 11. QA Visual

Ya existe soporte inicial de QA:

- `infra/ai-gateway/server.mjs`
- Endpoint: `POST /publication-image-qa`

QA evalua:

- identity
- face
- hands
- feet
- composition
- publishability

Estados:

- `pass`
- `review_required`
- `blocked`

La consola muestra badges de QA en Publications.

Si QA devuelve `blocked`, la UI bloquea seleccion directa normal.

Estado actual:

- Si no hay provider visual real configurado, usa fallback heuristico explicito.
- Se quiere evolucionar a IA que marque imagenes defectuosas y regenere automaticamente.

US creadas:

- US-034A — Automatic Defective Image Classification.
- US-034B — Automatic QA Remediation Loop.

Decision importante:

- La IA puede marcar defectuoso y regenerar.
- La IA no publica.
- La IA no canoniza.
- La seleccion final para publicacion puede seguir siendo humana.
- El loop de regeneracion debe tener max attempts, default 3.
- No loops infinitos ni consumo oculto de Comfy.

---

## 12. Backlog Actual Y Orden Recomendado

Archivo:

- `planning/backlog/WAVE-01-estefania-publications.md`

Wave 1 Definition of Done tiene aun:

- Final package export pending marcado como pendiente en la parte superior, aunque US-008 fue implementada. Revisar consistencia.
- Status history y next action ya marcados como cubiertos por US-010/US-033.

Ultimas US relevantes:

- US-030 — Comfy Cloud Reference Upload Adapter.
- US-031 — Pixel-Level Visual QA Provider.
- US-032 — Auto-Prepare References Before Image Generation.
- US-033 — Operator-First Publications Flow Cleanup.
- US-034A — Automatic Defective Image Classification.
- US-034B — Automatic QA Remediation Loop.
- US-035 — Compact Publication Workspace UX.

Orden recomendado:

1. Implementar US-035.
2. Luego US-034A.
3. Luego US-034B.

Razon:

- La UX de Publications ya esta muy larga.
- Si se agrega remediacion automatica antes de compactar el workspace, la pantalla sera mas confusa.
- US-035 crea la superficie necesaria para mostrar intentos, defectos y regeneraciones sin scroll excesivo.

---

## 13. US-035 — Lo Proximo

US-035 ya esta redactada en el backlog.

Objetivo:

- Convertir `Publications` de pagina vertical larga a workspace compacto por etapas.

Etapas minimas:

- `Job`
- `Brief`
- `Prompt`
- `Images`
- `Review`
- `Copy`
- `Publish`

Acceptance criteria resumidos:

- Navegacion interna por etapas.
- Solo la etapa activa expandida.
- Recommended action sticky o siempre visible.
- Primary action visible cerca de arriba.
- Brief/prompt/copy con resumen legible por defecto.
- JSON/raw editing solo technical mode o detras de raw editor.
- Generation y review separados.
- Publish accesible sin scroll excesivo.
- Mantener job loading, timeline, retry, QA badges y diagnosticos.

Notas de implementacion:

- Empezar por `apps/asset-review-dashboard/src/components/PublicationsPanel.tsx`.
- El archivo esta grande; conviene extraer subcomponentes si se toca mucho.
- Mantener cambios pequeños y verificar build.
- No cambiar semantica de endpoints en US-035 salvo estrictamente necesario.
- No activar remediacion automatica en US-035.
- La pantalla actual ya tiene `operatorNextAction`; se puede reutilizar.
- Puede agregarse `activePublicationStage` state.
- Puede derivarse stage recomendado desde job state.
- El bloque `Recommended Action` puede volverse sticky.

---

## 14. n8n Workflows Importantes

Publication flow:

- `Avatares_AI_Publications_Create_Job.json`
- `Avatares_AI_Publications_List_Jobs.json`
- `Avatares_AI_Publications_Jobs_Summary.json`
- `Avatares_AI_Publications_Timeline.json`
- `Avatares_AI_Publications_Record_Error.json`
- `Avatares_AI_Publications_Retry_Job.json`
- `Avatares_AI_Publications_Generate_Brief.json`
- `Avatares_AI_Publications_Generate_Prompt_Pack.json`
- `Avatares_AI_Publications_Prepare_References.json`
- `Avatares_AI_Publications_Generate_Images.json`
- `Avatares_AI_Publications_Refresh_Generation.json`
- `Avatares_AI_Publications_Ingest_Comfy_Output.json`
- `Avatares_AI_Publications_Select_Asset.json`
- `Avatares_AI_Publications_Generate_Copy_Pack.json`
- `Avatares_AI_Publications_Export_Pack.json`
- `Avatares_AI_Publications_Mark_Published.json`
- `Avatares_AI_Publications_Load_Avatar_Profile.json`

Asset Review:

- `Avatares_AI_API_List_Review_Candidates.json`
- `Avatares_AI_API_Get_Canonical_Asset.json`
- `Avatares_AI_API_Promote_Canonical_Asset.json`
- `Avatares_AI_API_Reject_Asset.json`
- `Avatares_AI_API_Select_Asset.json`
- `Avatares_AI_API_Resolve_Asset.json`

Admin:

- catalog workflows.
- backup workflows.
- auto-ingest workflows.

Workflow import/deploy pattern used:

```text
scp workflow.json silverman@192.168.0.194:~/local-ai-stack/.codex-sync-incoming/...
ssh silverman@192.168.0.194 'docker exec -i local-ai-stack-n8n-1 n8n import:workflow --input=/tmp/...'
ssh silverman@192.168.0.194 'docker exec -i local-ai-stack-n8n-1 n8n update:workflow --id=... --active=true'
```

Exact workflow ids vary by workflow. Read current JSON/id before import when needed.

---

## 15. Deployment Pattern Para Consola

Local build:

```bash
cd /Users/silveriobernal/Documents/Code/Development/iacontentcreator/apps/asset-review-dashboard
npm run build
```

Deploy pattern used:

```bash
scp apps/asset-review-dashboard/src/... silverman@192.168.0.194:~/local-ai-stack/.codex-sync-incoming/<change>/
ssh silverman@192.168.0.194 'cd ~/local-ai-stack && cp ... apps/asset-review-dashboard/src/... && docker compose up -d --build asset-review-dashboard'
```

Verification:

```bash
ssh silverman@192.168.0.194 'curl -fsS -I http://127.0.0.1:8088/ | head -5'
```

Expected:

```text
HTTP/1.1 200 OK
```

Note:

- A previous `docker compose -f ~/local-ai-stack/docker-compose.yml ps` failed because file name/path was wrong. The app itself returned 200.
- Use `cd ~/local-ai-stack && docker compose ps asset-review-dashboard` if checking compose state.

---

## 16. Git / Branch / Commits

Branch:

- `codex-wave1-estefania-stabilization`

Recent commits at handoff:

```text
d329e31 docs: prioritize compact publications workspace
ba96b6d docs: add qa remediation backlog stories
30e4203 feat: simplify publications operator flow
d81e5e9 feat: auto prepare references during image generation
77c68f1 fix: persist prepared Comfy references
718392a feat: add reference preparation and visual QA adapters
9dd9e8f feat: complete publication review stabilization stories
7a1d423 feat: stabilize publication generation flow
```

Status at handoff before creating this document:

- Branch clean and tracking origin.

After creating this handoff document, there will be a new uncommitted file until committed.

Repo remote:

- `https://github.com/silverberdi/iacontentcreator.git`

---

## 17. Avatar Context

### Estefania Files

Important:

- `avatars/estefania-montealegre/profile-contract.md`
- `avatars/estefania-montealegre/profile.json`
- `avatars/estefania-montealegre/00-identity/*`
- `avatars/estefania-montealegre/02-visual/*`
- `avatars/estefania-montealegre/03-prompts/*`
- `avatars/estefania-montealegre/04-production/*`
- `avatars/estefania-montealegre/05-content/*`

Estefania profile summary in frontend:

- `apps/asset-review-dashboard/src/data/avatarProfiles.ts`

Frontend profile currently includes:

- displayName: Estefania Montealegre
- businessProfile: influencer-brand
- primaryObjective: Generate organic lifestyle content that builds audience affinity and attracts brand collaborations.
- contentPillars: lifestyle, travel, wellness, social life, personal thoughts.
- brandFit: coffee, travel, wellness, casual elegant fashion, urban lifestyle, music.
- captionTone: casual, warm, intelligent, spontaneous, lightly reflective.
- visualPriorities: identity consistency, emotional realism, recognizability, believable humanity.
- safetyReviewTriggers: sponsored content, wellness/skincare claims, identity changes, strong sensual framing, public posts.
- primaryPlatform: Instagram, `@estefaniamontealegre.ai`, manual-assisted, active.

### Didi Files

- `avatars/didi-duarte/canon/*`
- `avatars/didi-duarte/prompts/README.md`
- `avatars/didi-duarte/visuals/README.md`
- `avatars/didi-duarte/datasets/README.md`
- `avatars/didi-duarte/references/*`

Didi is not implemented in Wave 1, but her canon exists.

### Donovan / Authority Files

- `avatars/donovan-j-scott/*`

Donovan has extensive authority/persona/content docs.

### Silverio / Authority Files

- `avatars/silverio-bernal/*`

### Andres Ferrer

- `avatars/andres-ferrer/00-core/*`

---

## 18. Product Decisions Already Made

- Estefania is the first production influencer.
- Didi/GFE comes later.
- Authority avatars come later.
- Publicacion final manual.
- No automatic Instagram publishing in Wave 1.
- No automatic canonical promotion.
- Login via Google, only authorized users get access.
- Other users may register but require approval.
- Technical mode exists for Silverio/admin technical operations.
- `Content Cycle` is legacy/manual and hidden from normal operation.
- `Publications` is the correct operator flow.
- MinIO stores assets.
- Postgres stores jobs/assets/events/metadata.
- n8n is orchestration layer and workflows must live in repo.
- ai-gateway hides provider secrets and centralizes AI provider calls.
- DeepSeek is used for text/brief/copy through gateway.
- Comfy Cloud is used for image generation.
- Local models/server may be used later for independence, including voice or visual tasks.
- Visual QA should become more autonomous.
- Remediation loop should be controlled and cost bounded.

---

## 19. Known UX Issues

Main UX issue at handoff:

- `Publications` requires too much scroll.

Specific friction:

- Brief section is a long JSON textarea.
- Prompt Pack section is a long JSON textarea.
- Image Generation section contains many unrelated concerns.
- QA/review is buried below generation attempts.
- Copy Pack is another long textarea.
- Publishing Pack and Published Record require scrolling far down.
- Operator has to search for next action.

US-033 helped by:

- Hiding Content Cycle.
- Adding Recommended Action.
- Hiding Prepare references unless technical.
- Humanizing status labels.

US-035 should solve:

- Stage tabs/internal navigation.
- Sticky next action.
- Focused panels.
- Compact summaries.
- Raw JSON behind technical controls.
- Publish stage accessible without scroll.

---

## 20. Known Technical Issues / Watchouts

- `planning/backlog/WAVE-01-estefania-publications.md` may have some internal consistency gaps because many US were completed rapidly. For example top Completion Definition still has final export unchecked while US-008 exists as done. Review during backlog grooming.
- `Content Cycle` still exists and may use older n8n endpoints. It should not be used by normal operator.
- Some workflows contain large JS Code nodes with SQL string construction. Several have been hardened, but be careful with quotes/free text.
- n8n workflows are JSON exports. Manual edits should be parsed/validated before import.
- Do not run real Comfy generations casually; they consume resources/cost.
- For tests, prefer invalid payload endpoint checks unless user explicitly wants real generation.
- If testing real generation, explain that it may submit a Comfy job.
- `VISUAL_QA_*` may not be configured; if not, QA is heuristic.
- Comfy reference upload was fixed, but generation depends on `metadata.comfyInputName`.
- The latest successful generation shows `review_required`, which is expected.
- If a prompt pack references MinIO object paths as Comfy LoadImage inputs, that is wrong; prepare references first.
- Manual `Prepare references` should remain technical-only.
- `assetType` should remain default `raw-image` and hidden unless future need emerges.

---

## 21. Useful Commands

Check repo state:

```bash
cd /Users/silveriobernal/Documents/Code/Development/iacontentcreator
git status -sb
git log --oneline -8
```

Build console:

```bash
cd /Users/silveriobernal/Documents/Code/Development/iacontentcreator/apps/asset-review-dashboard
npm run build
```

Check server console:

```bash
ssh silverman@192.168.0.194 'curl -fsS -I http://127.0.0.1:8088/ | head -5'
```

Check containers:

```bash
ssh silverman@192.168.0.194 'cd ~/local-ai-stack && docker compose ps'
```

Rebuild console on server:

```bash
ssh silverman@192.168.0.194 'cd ~/local-ai-stack && docker compose up -d --build asset-review-dashboard'
```

Do not expose secrets in shell output or commits.

---

## 22. Suggested Start For Next Conversation

The next conversation should start by implementing US-035.

Important implementation posture:

- Read this handoff first.
- Read the backlog US-035.
- Read `PublicationsPanel.tsx`.
- Avoid changing n8n semantics for US-035.
- Keep deployment optional until local build passes.
- If deploying, rebuild `asset-review-dashboard` on server.
- Commit and push after successful implementation.

---

## 23. Prompt Para Copiar En La Nueva Conversacion

Copy/paste this into the new Codex conversation:

```text
Continuemos el proyecto Avatares AI desde el repo:
/Users/silveriobernal/Documents/Code/Development/iacontentcreator

Antes de hacer cambios, lee completo este archivo de contexto:
docs/operations/handoff-next-conversation-2026-07-19.md

Estamos en la branch:
codex-wave1-estefania-stabilization

Ultimo commit conocido:
d329e31 docs: prioritize compact publications workspace

Objetivo inmediato:
Implementar US-035 — Compact Publication Workspace UX, que ya esta redactada en:
planning/backlog/WAVE-01-estefania-publications.md

Contexto clave:
- Avatares AI opera avatares virtuales.
- Wave 1 es Estefania Montealegre como influencer AI.
- La consola esta desplegada en https://avatars.silverman.pro.
- Server: silverman@192.168.0.194, stack ~/local-ai-stack.
- Publications ya funciona end-to-end hasta Comfy generation, ingest, QA y review-ready.
- La publicacion final sigue siendo manual.
- Nada se publica automaticamente.
- Nada se canoniza automaticamente.
- Content Cycle es legacy/manual y debe seguir oculto salvo technical mode.
- El problema actual es UX: Publications requiere demasiado scroll.

Implementa US-035 con criterio de producto:
- convertir Publications en workspace compacto por etapas,
- agregar navegacion interna,
- dejar visible la accion recomendada,
- separar Images de Review,
- dejar Publish accesible sin scroll excesivo,
- ocultar JSON/raw editing salvo technical mode o control explicito.

No implementes todavia US-034A ni US-034B. Esas vienen despues.

Al terminar:
- corre npm run build en apps/asset-review-dashboard,
- muestra resumen de cambios,
- despliega al server si el cambio afecta la consola live,
- haz commit y push.
```
