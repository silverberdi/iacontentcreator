# Avatares AI — Local Production Security

## Fase

11 — Seguridad mínima para producción local.

## Decisión

No modificamos todos los workflows n8n uno por uno.

Agregamos un gateway delante de n8n:

```text
Browser / Dashboard / curl
→ n8n-gateway
→ n8n
```

El gateway protege:

```text
/webhook/*
/webhook-test/*
```

con header:

```text
X-Avatares-Api-Key
```

El editor de n8n sigue disponible en:

```text
http://192.168.0.194:5678
```

## Variable requerida

En `/home/silverman/local-ai-stack/.env` agregar:

```env
AVATARES_API_KEY=replace-with-a-long-random-token
```

Generar token recomendado:

```bash
openssl rand -hex 32
```

## Docker compose

### Servicio n8n

Cambiar:

```yaml
ports:
  - "${N8N_BIND_IP}:5678:5678"
```

por:

```yaml
expose:
  - "5678"
```

### Servicio n8n-gateway

Agregar el snippet:

```text
infra/n8n-gateway/docker-compose.service.snippet.yml
```

## Levantar

```bash
cd ~/local-ai-stack
docker compose up -d n8n n8n-gateway
```

## Pruebas

### UI n8n

```text
http://192.168.0.194:5678
```

Debe cargar normal.

### Webhook sin token

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/health \
  -H "Content-Type: application/json" \
  -d '{}'
```

Debe devolver:

```text
401 Unauthorized
```

### Webhook con token

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/health \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

Debe devolver:

```text
200 OK
```

## Dashboard

Agregar al `.env` del dashboard:

```env
VITE_AVATARES_API_KEY=same-token-as-server
```

Todas las llamadas a n8n deben incluir:

```text
X-Avatares-Api-Key
```

No enviar este header a MinIO.
