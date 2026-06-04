# Avatares AI — Auto Ingest v1.1

## Fix

Corrige el fallo `socket hang up` durante:

```text
POST /webhook/admin/auto-ingest/run
```

Causa probable:

```text
fs.rename() entre mounts Docker diferentes:
  /comfy-output
  /n8n-files/inbox
```

Eso puede producir:

```text
EXDEV: cross-device link not permitted
```

## Cambio

El runner ahora intenta:

```text
rename
```

y si falla con `EXDEV`, usa:

```text
copyFile + unlink
```

También envuelve endpoints async con `try/catch` para devolver JSON de error en vez de cortar la conexión.

## Instalación

Reemplaza:

```text
~/local-ai-stack/infra/auto-ingest-runner
```

Reconstruye:

```bash
cd ~/local-ai-stack
docker compose up -d --build auto-ingest-runner
```

No necesitas reimportar workflows n8n.
