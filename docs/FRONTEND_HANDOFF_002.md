# Handoff frontend — ciclo 002

Fecha: 12 de agosto de 2026.

Spec: `docs/specs/002-explicit-image-removal.md`.

Rama: `codex/002-explicit-image-removal`.

Commit frontend: `1300e2c`.

## Implementación entregada

- Las tarjetas de imagen abren un diálogo con tres decisiones inequívocas:
  retirar sólo, retirar y eliminar de Referencias, o cancelar.
- La alternativa no destructiva recibe el foco inicial.
- La eliminación completa espera la confirmación de `item.delete` antes de
  invocar `mark_asset_deleted`.
- `ASSET_IN_USE`, red, permisos y conflictos informan por separado el estado
  final de la tarjeta y de la referencia.
- Un fallo del guardado no intenta borrar el activo.
- Un fallo posterior no recrea la tarjeta y dirige el reintento a Referencias.
- El panel Referencias se invalida después de una eliminación exitosa.
- Viewer no recibe controles de retirada; notas y paletas conservan el flujo
  anterior.

## Regresiones agregadas

- Retirar sólo conserva la referencia.
- La eliminación completa respeta el orden guardado → borrado.
- Un fallo de guardado no llama al borrado del activo.
- `ASSET_IN_USE` conserva la referencia y no restaura la tarjeta.
- Repetir sobre una tarjeta ausente no duplica operaciones.

## Validación aprobada

- Suite local: 33/33.
- Suite HTTP: 3/3.
- TypeScript, ESLint, build y `git diff --check`: aprobados.
- Diálogo revisado en 390, 768, 1280 y 1440 px sin desborde.
- Foco inicial, contención con Tab/Shift+Tab, Escape y restauración de foco:
  aprobados.
- Consola durante el recorrido visual: sin errores ni advertencias.

## Siguiente responsabilidad

Integración debe ejecutar los casos A–E de `docs/plans/002/MANUAL_QA.md` con
owner/editor/viewer y al menos un activo con otro uso. Push, PR, merge y
despliegue conservan autorización independiente.
