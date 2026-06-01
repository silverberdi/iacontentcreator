# Avatares AI — Local Production Backups

## Fase

10 — Backups para producción local inicial.

## Decisión

El servidor local es el entorno productivo inicial.

Los backups NO se guardan en `snapshots`.

Ruta productiva:

```text
/home/silverman/compartido_mac/backups/avatares-ai
```

Desde el contenedor `backup-runner`:

```text
/backups/avatares-ai
```

## Arquitectura

```text
Dashboard
→ n8n webhook admin/backups/*
→ backup-runner
→ PostgreSQL dump + MinIO mirror + shared files tar + n8n data tar
→ /home/silverman/compartido_mac/backups/avatares-ai/YYYYMMDD-HHMMSS/
```

## Componentes respaldados

Cada backup contiene:

```text
manifest.json
status.json
postgres/postgres.dump
postgres/postgres.sql
minio/iacontentcreator-assets/**
files/shared-files.tar.gz
n8n/n8n-data.tar.gz
```

## Qué cubre

```text
PostgreSQL:
- n8n database
- workflow metadata stored in DB
- canonical_asset_registry
- asset catalogs

MinIO:
- bucket iacontentcreator-assets

Shared files:
- inbox
- processed
- duplicates
- failed

n8n data:
- /home/node/.n8n volume mounted read-only
```

## Qué NO hace

```text
No restaura backups.
No borra backups.
No implementa retención automática todavía.
No agrega seguridad por API key todavía.
```

## Instalación

### 1. Copiar backup-runner al repo

```text
infra/backup-runner/
```

### 2. Agregar servicio al docker-compose.yml

Usar el fragmento:

```text
infra/backup-runner/docker-compose.service.snippet.yml
```

### 3. Crear carpeta de backups

```bash
mkdir -p /home/silverman/compartido_mac/backups/avatares-ai
```

### 4. Levantar el servicio

Desde la carpeta donde está el `docker-compose.yml`:

```bash
docker compose up -d --build backup-runner
```

### 5. Probar health desde n8n

```bash
docker exec local-ai-stack-n8n-1 wget -qO- http://backup-runner:8080/health
```

## Workflows n8n

Importar y publicar:

```text
Avatares AI - Admin - Backup Health
Avatares AI - Admin - Create Backup
Avatares AI - Admin - List Backups
```

Endpoints:

```text
POST /webhook/admin/backups/health
POST /webhook/admin/backups/create
POST /webhook/admin/backups/list
```

## Pruebas

### Health

```bash
curl -X POST http://192.168.0.194:5678/webhook/admin/backups/health \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Crear backup

```bash
curl -X POST http://192.168.0.194:5678/webhook/admin/backups/create \
  -H "Content-Type: application/json" \
  -d '{"requestedBy":"manual-curl"}'
```

### Listar backups

```bash
curl -X POST http://192.168.0.194:5678/webhook/admin/backups/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Cierre de fase

La fase 10.1 queda cerrada cuando:

```text
backup-runner responde health
create backup genera carpeta con manifest/status
list backups muestra el backup creado
la carpeta es visible desde Finder en Compartido_Mac/backups/avatares-ai
```
