# Paquete 1B — Primera imagen y consistencia de activos

## Objetivo

La primera imagen de un tablero vacío debe quedar persistida una sola vez y el
tablero, el registro de activo y Referencias deben mantener el mismo estado.
Un error no puede quedar reducido al mensaje genérico “No se pudo guardar”.

## Evidencia confirmada — 7 de agosto de 2026

- Producción, owner, tablero vacío “Otra prueba”.
- La carga creó un activo `ready` y mostró la tarjeta en memoria.
- El guardado terminó en “Error al guardar”.
- Supabase conservó el tablero en versión 1, sin `board_items` y sin lote en
  `board_operation_batches`.
- El activo permaneció en Referencias sin vínculo persistido al tablero.
- El cliente descartó el detalle del error porque el objeto PostgREST no era
  una instancia nativa de `Error`.
- El activo QA creado para la reproducción fue dado de baja lógicamente; las
  referencias anteriores no fueron modificadas.

## Hipótesis de trabajo

El registro del archivo y la creación del elemento son pasos separados. La
primera operación `item.create` falla o no completa, pero `register_asset` ya
dejó el activo listo. Como la prueba SQL vigente sólo cubre `board.update`, no
existe una regresión transaccional que pruebe `item.create` con `asset_id`.

## Orden de diagnóstico e implementación

1. **Backend:** ampliar `supabase/tests/backend_v1.sql` para registrar un activo
   QA y ejecutar `item.create` con `asset_id`, verificando versión, elemento y
   lote dentro de la transacción con rollback.
2. Si la prueba SQL falla, corregir hacia delante la función/migración y repetir
   la prueba antes de tocar frontend.
3. Si la prueba SQL pasa, **frontend** reproduce el ciclo de `BoardProvider` y
   `board-adapter` para aislar cola de guardado, versión y transición inicial.
4. **Frontend**, en cualquier caso, debe conservar código, mensaje, detalle y
   request-id útiles de errores PostgREST sin exponer SQL ni secretos.
5. Definir compensación segura: si el elemento no se guarda, no declarar la
   tarjeta como guardada y no dejar un activo huérfano sin explicación.
6. **Integración:** repetir primera carga, recarga, retiro de tarjeta y borrado
   definitivo de referencia mediante M1B.

## Contrato de eliminación

- “Retirar del tablero” elimina lógicamente el elemento después de guardarlo y
  conserva el archivo en Referencias.
- “Eliminar de Referencias” no modifica silenciosamente tableros. Si existe un
  elemento activo, debe responder `ASSET_IN_USE` y mostrar dónde se usa.
- Sólo después de retirar y persistir todos los elementos puede eliminarse la
  referencia.
- Una tarjeta que existe sólo en memoria por un error de guardado no puede
  aparentar consistencia ni permitir una eliminación contradictoria.

## Casos automáticos obligatorios

- `item.create` como primera operación de un tablero versión 1.
- `item.create` con `asset_id` válido del mismo proyecto/tablero.
- Rechazo o normalización de un activo ajeno.
- Error conserva causa de dominio y no incrementa versión.
- Éxito crea exactamente un item, un lote y versión 2.
- Reintento no duplica activo ni elemento.
- `ASSET_IN_USE` mientras el elemento esté activo.
- Borrado permitido después de `item.delete` persistido.

## Salida

Causa raíz demostrada, corrección en una sola capa cuando sea posible,
regresiones SQL/TypeScript, M1B aprobada y ausencia de activos huérfanos tras
errores controlados.
