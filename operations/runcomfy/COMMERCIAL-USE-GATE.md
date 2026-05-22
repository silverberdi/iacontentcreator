# Gate de uso comercial y publicación

## Regla de aprobación

Ninguna generación puede marcarse como `approved` o `published` sin:

- modelo base registrado;
- LoRA(s) o recursos auxiliares registrados, cuando existan;
- workflow registrado;
- evidencia de licencia almacenada o referenciada;
- revisión del uso comercial;
- trazabilidad de avatar, fecha y archivo.

## Checklist por modelo o LoRA

- [ ] Nombre y versión exactos registrados.
- [ ] Fuente oficial o página de distribución registrada.
- [ ] Autor/publicador identificado.
- [ ] Texto o evidencia de licencia preservado.
- [ ] Uso comercial explícitamente revisado.
- [ ] Restricciones de redistribución, personas reales, marcas o usos prohibidos documentadas.
- [ ] Estado asignado en `model-registry.csv`.

## Checklist por generación publicable

- [ ] El modelo base está en `APPROVED_COMMERCIAL`.
- [ ] Todos los LoRA/recursos adicionales están en `APPROVED_COMMERCIAL`, si aplican.
- [ ] El workflow está en `APPROVED`.
- [ ] La imagen fue revisada visualmente.
- [ ] No contiene marcas, personas reales o elementos problemáticos no autorizados.
- [ ] La generación fue registrada antes de pasar a `approved` o `published`.

## Regla ante duda

Si una licencia no es clara, el recurso se mantiene en `LAB_ONLY` o `REQUIRES_LEGAL_REVIEW`. Una salida de laboratorio no debe publicarse ni utilizarse comercialmente.
