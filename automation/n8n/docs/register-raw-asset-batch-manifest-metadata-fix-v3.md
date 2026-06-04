# Avatares AI — Register Raw Asset Batch manifest metadata fix v3

## Problema corregido

El workflow `Avatares AI - Register Raw Asset Batch - Callable` estaba leyendo las imágenes desde `Read PNG files from inbox`.

Ese nodo pierde los campos del manifest/orquestador por cada archivo leído. Después, el nodo `Set asset variables` usaba fallbacks hardcodeados, incluyendo:

```text
scene = coffee-rain
```

Por eso un `batch.json` correcto con `scene = airport` terminaba registrado en `canonical_asset_registry` como `coffee-rain`.

## Cambio aplicado

Se modificó solo el workflow:

```text
Avatares AI - Register Raw Asset Batch - Callable
```

Nodo corregido:

```text
Set asset variables
```

Ahora toma la metadata desde:

```text
$('Set batch variables').first().json
```

y no desde el `$json` que sale de `Read PNG files from inbox`.

También se agregó `metadataSource = manifest-via-set-batch-variables`.

## Instalación

1. En n8n, abre el workflow viejo:
   `Avatares AI - Register Raw Asset Batch - Callable`

2. Importa/reemplaza con:
   `Avatares_AI_Register_Raw_Asset_Batch_Callable_manifest_metadata_fix_v3.json`

3. Publica/guarda el workflow.

4. No es necesario reemplazar el orquestador ni el pipeline admin para este fix.

## Validación esperada

Con un `batch.json` que diga:

```json
{
  "scene": "airport"
}
```

los registros deben quedar así:

```text
scene = airport
canonical_group = estefania-montealegre:airport:raw-image
object_path contiene airport
tags contiene airport
```

## Limpieza recomendada antes de reprocesar

Borrar los registros mal clasificados por SHA si ya fueron insertados como coffee-rain.
