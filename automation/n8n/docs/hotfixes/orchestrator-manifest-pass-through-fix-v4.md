# Avatares AI — Orchestrator Manifest Pass-through Fix v4

## Qué corrige

El workflow activo `Avatares AI - Register Raw Asset Batch - Callable` ya tiene el fix para no caer a `coffee-rain`.

El problema restante está en el orquestador:

`Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation`

El nodo:

`Execute Register Raw Asset Batch`

estaba llamando el subworkflow con:

```json
"workflowInputs": {
  "mappingMode": "defineBelow",
  "value": {}
}
```

Eso permite que el subworkflow pierda el manifest validado y reconstruya metadata de forma incompleta.

## Cambio aplicado

Ahora el nodo `Execute Register Raw Asset Batch` pasa explícitamente:

- inputDir
- processedDir
- duplicatesDir
- failedDir
- baseUrl
- manifestFileName
- manifestSourceFile
- avatar
- avatarShort
- scene
- assetType
- workflow
- model
- seed
- version
- parentAssetId
- autoPromoteLatest
- catalogValidation

La fuente de verdad pasa a ser:

`batch.json -> Parse Batch Manifest -> Validate Batch Manifest -> Execute Register Raw Asset Batch`

## Instalación

Importar/reemplazar:

`Avatares_AI_Asset_Pipeline_Orchestrator_Manifest_PassThrough_Fix_v4.json`

Debe reemplazar el workflow:

`Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation`

Luego publicar.

## Prueba esperada

Con `batch.json` que tenga:

```json
"scene": "airport"
```

el resultado registrado debe quedar:

- scene = airport
- canonical_group = estefania-montealegre:airport:raw-image
- object_path contiene airport
- metadata.metadataSource = manifest-via-set-batch-variables
