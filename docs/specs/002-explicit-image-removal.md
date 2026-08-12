---
meta:
  contentType: Reference
---

# Elegir cómo eliminar una imagen

Estado: `validation`

Rama: `codex/002-explicit-image-removal`

Esta spec define dos alcances de eliminación para una tarjeta de imagen. La implementación está en producción y espera la puerta manual M002 para cerrar el ciclo.

## Resolver el problema

La acción anterior retiraba la tarjeta y conservaba el archivo en Referencias. Ese comportamiento protegía el banco, pero obligaba a cambiar de vista para completar una eliminación definitiva.

Owner y editor ahora eligen una de estas acciones:

- **Retirar sólo del tablero**: elimina la tarjeta y conserva el activo
- **Retirar y eliminar de Referencias**: elimina la tarjeta y solicita el borrado del activo
- **Cancelar**: no modifica el tablero ni el activo

Viewer no recibe controles de eliminación.

## Mantener las reglas de negocio

1. Guarda `item.delete` antes de llamar `mark_asset_deleted`
2. No llames `mark_asset_deleted` si falla el guardado
3. Conserva el activo cuando otro elemento lo usa
4. Trata `ASSET_IN_USE` como la autoridad final
5. Si falla la segunda etapa, conserva la referencia y no recrees la tarjeta
6. Informa el estado de la tarjeta y la referencia por separado
7. Impide acciones duplicadas mientras el flujo está pendiente
8. Mantén `apply_board_operations` como única escritura del tablero

## Cubrir estados de interfaz

El diálogo y la notificación deben cubrir:

- Confirmación con foco contenido y restaurado
- Retirada del tablero
- Eliminación de Referencias
- Éxito de una o ambas etapas
- Resultado parcial por `ASSET_IN_USE`
- Error de red después del guardado
- Error de guardado o conflicto de versión
- Pérdida de permiso durante la operación

La opción no destructiva recibe el foco inicial. La eliminación completa explica su alcance antes de confirmar.

## Conservar el contrato técnico

El ciclo no requiere una migración ni una función nueva. Reutiliza:

- `apply_board_operations` con `item.delete`
- `mark_asset_deleted`
- `ASSET_IN_USE`
- La versión optimista e idempotencia existentes

No reactives escrituras directas ni `save_board_snapshot`.

## Verificar los criterios de aceptación

1. Retirar sólo persiste la ausencia de la tarjeta y conserva una referencia
2. Retirar y eliminar borra ambos registros cuando no existe otro uso
3. Otro uso conserva el activo y recibe un mensaje específico
4. Un fallo de guardado no intenta borrar el activo
5. Un fallo posterior informa un resultado parcial recuperable
6. Viewer no puede iniciar ninguna mutación
7. Teclado, foco y responsive funcionan en los cuatro anchos definidos
8. La consola no presenta errores inesperados
9. M002 y el smoke de publicación quedan aprobados

## Resultado de implementación

- `1300e2c`: implementa el flujo frontend
- `d2b10f9`: registra el handoff frontend
- `5b741b1`: endurece errores e integración
- Suite backend y frontend: 34 de 34 aprobada
- Suite HTTP: 3 de 3 aprobada
- TypeScript, ESLint, build, responsive y foco: aprobados

## Completar la validación

Ejecuta `docs/plans/002/MANUAL_QA.md` en producción. Si M002 pasa, ejecuta el smoke afectado y cambia el estado a `released`.

Cualquier corrección, push o despliegue adicional requiere una nueva autorización.
