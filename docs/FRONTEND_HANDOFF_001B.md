# Handoff frontend — paquete 1B

Fecha: 8 de agosto de 2026.

## Estado recibido desde backend

Se identificó la causa del fallo de la primera imagen: `cardPayload` enviaba
`colors: null`; el RPC insertaba ese valor como JSONB `null`, incompatible con
la restricción que sólo admite `NULL` SQL o un arreglo. La operación del
tablero se revertía, pero el activo ya había quedado registrado como `ready`.

Backend deja preparado:

- omisión de `colors` cuando la tarjeta no tiene paleta;
- normalización defensiva de JSON `null` en base de datos;
- validación de estado, proyecto, tablero y ruta para todo `asset_id`;
- regresión SQL para primera imagen, reintento, activo ajeno, `ASSET_IN_USE` y
  eliminación posterior a `item.delete`.

La migración aún debe aplicarse y validarse en Supabase antes del QA manual.

## Ajustes que debe ejecutar frontend

1. Convertir errores PostgREST de `apply_board_operations` en un `Error` o
   error de dominio antes de entregarlos a `BoardProvider`; actualmente un
   objeto sin instancia de `Error` termina en el mensaje genérico.
2. Mostrar la causa accionable conservando los códigos `VALIDATION_ERROR`,
   `VERSION_CONFLICT`, `QUOTA_EXCEEDED`, `FORBIDDEN` y `RATE_LIMITED`.
3. Compensar una carga cuyo `item.create` no se persista: retirar la tarjeta
   local y solicitar la baja del activo/archivo ya registrado, o rediseñar la
   API del adapter para confirmar explícitamente el guardado antes de cerrar la
   carga. La compensación debe ser idempotente.
4. Mantener la tarjeta y el activo si el guardado fue confirmado aunque llegue
   una notificación Realtime concurrente.

## Pruebas frontend requeridas

- Primera imagen en tablero vacío produce exactamente una tarjeta persistida.
- Un error del RPC conserva el mensaje/código útil y no muestra sólo el
  fallback genérico.
- Un fallo después de `register_asset` no deja tarjeta local ni referencia
  huérfana.
- Un reintento no duplica tarjeta, activo ni operación.
- Un conflicto de versión mantiene el flujo específico de recarga.

## Gate de integración

Después de aplicar la migración y fusionar el ajuste frontend:

1. ejecutar `npm run test:backend`, `npm run build` y
   `npm run test:integration` con la aplicación local activa;
2. ejecutar `supabase/tests/backend_v1.sql` y comprobar `rollback` exitoso;
3. desplegar un preview de Vercel;
4. repetir M1B con owner en un tablero nuevo y vacío;
5. verificar versión 2, un `board_item`, un lote de operaciones y un activo
   `ready` asociado; recargar y confirmar que la imagen persiste.
