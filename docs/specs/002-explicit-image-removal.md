---
meta:
  contentType: Reference
---

# Elegir cómo eliminar una imagen

Estado: `released`

Rama de implementación: `codex/002-explicit-image-removal`

Fecha de aprobación: 12 de agosto de 2026

Esta spec cerrada registra el flujo de eliminación desplegado y aprobado por producto. Git conserva el diseño, el plan y los handoffs completos del ciclo.

## Conservar el comportamiento publicado

Owner y editor eligen una de estas acciones:

- **Retirar sólo del tablero**: elimina la tarjeta y conserva el activo
- **Retirar y eliminar de Referencias**: guarda `item.delete` y después elimina el activo
- **Cancelar**: no modifica el tablero ni el activo

Viewer no recibe controles de eliminación.

## Mantener las garantías

- Un error de guardado no llama `mark_asset_deleted`
- `ASSET_IN_USE` conserva una referencia con usos activos
- Un error posterior no recrea la tarjeta
- La interfaz informa por separado el estado de la tarjeta y del activo
- El tablero continúa usando `apply_board_operations`
- Las escrituras directas y `save_board_snapshot` permanecen prohibidas

## Registrar la aceptación

La validación automática aprobó 34 de 34 pruebas, la suite HTTP, TypeScript, ESLint y el build. La revisión local aprobó responsive, teclado y foco.

La prueba manual productiva confirmó:

1. **Retirar sólo del tablero** conserva la imagen en Referencias
2. **Retirar y eliminar de Referencias** elimina la imagen de ambos lugares

Producto aprobó el ciclo y autorizó avanzar a la spec 003. `QA_REPORT.md` conserva la evidencia vigente.
