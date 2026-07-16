# Infra Snapshot Scripts

## Ejecutar

```bash
cd infra/scripts

chmod +x snapshot-infra.sh
./snapshot-infra.sh
```

## Resultado

Los snapshots se generan localmente en una carpeta ignorada por git:

```text
infra/snapshots/YYYYMMDD-HHMMSS/
```

Estos snapshots son evidencia operativa temporal. Los workflows n8n canónicos del proyecto viven en:

```text
automation/n8n/workflows/
```
