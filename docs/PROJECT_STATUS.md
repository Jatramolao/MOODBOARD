---
meta:
  contentType: Reference
---

# Entender el estado actual del proyecto

Este documento resume la fase activa, la base publicada y las acciones necesarias para cerrar el ciclo. Última actualización: 12 de agosto de 2026.

## Estado ejecutivo

- **Fase**: gate SQL y handoff a integración del ciclo 003
- **Rama local**: `codex/003-reference-library-reuse`
- **GitHub**: `main` y `origin/main` en `5b741b1`
- **Producción**: deployment `dpl_GcaexVu1uX8APBxJrDudhxudJWXJ`, estado `Ready`
- **Ciclo 002**: aprobado manualmente y cerrado por producto
- **Spec 003**: `implementation`
- **Plan 003**: `in_progress`
- **Bloqueos de código**: ninguno conocido
- **Bloqueo de entorno**: migración `202608120001` aún no aplicada
- **Responsable actual**: operaciones habilita el gate SQL; integración ejecuta M003
- **Frontend**: paquetes 2 a 4 implementados localmente en `2b131b3`

## Cierre del ciclo 002

El frontend permite elegir entre retirar una imagen del tablero o retirarla y eliminarla de Referencias. La segunda acción guarda primero `item.delete` y después llama `mark_asset_deleted`.

El flujo conserva estas reglas:

- Un error de guardado no intenta eliminar el activo
- `ASSET_IN_USE` conserva la referencia cuando existe otro uso
- Un error posterior informa que la tarjeta se retiró y la referencia permanece
- Viewer no recibe controles de eliminación
- Notas y paletas mantienen su eliminación anterior

La prueba manual productiva confirmó estos resultados:

- **Retirar sólo del tablero** conserva la imagen en Referencias
- **Retirar y eliminar de Referencias** elimina la imagen de ambos lugares

Producto aprobó avanzar. Las regresiones automáticas y el QA local cubren uso activo, permisos, cancelación y fallos entre etapas.

## Evidencia disponible

- Implementación frontend: `1300e2c`
- Handoff documental frontend: `d2b10f9`
- Endurecimiento de integración: `5b741b1`
- Suite backend y frontend: 34 de 34 aprobada
- Suite HTTP: 3 de 3 aprobada en `localhost:3001`
- TypeScript, ESLint y build de producción: aprobados
- Auditoría de dependencias de producción: 0 vulnerabilidades conocidas
- Revisión visual: aprobada en 390, 768, 1280 y 1440 px
- Teclado y foco del diálogo: aprobados localmente

`QA_REPORT.md` contiene la matriz vigente. El historial detallado permanece en Git.

## Estado de plataforma

- Supabase contiene las migraciones `202607310001` a `202608080001`
- La migración de consistencia de activos está aplicada y validada
- Vercel despliega `main` automáticamente
- Producción sirve `moodboard-fotografo.vercel.app` y `moodboard.libraphotos.com`
- `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` deben permanecer configurados como variables de servidor
- `RESEND_API_KEY` y `EMAIL_FROM` siguen siendo opcionales

## Próximos pasos

1. Autorizar y aplicar `202608120001_enable_project_asset_reuse.sql`
2. Ejecutar `supabase/tests/backend_v1.sql` y confirmar rollback exitoso
3. Integración ejecuta M003-A a M003-E sobre `2b131b3`
4. Corregir hacia delante cualquier hallazgo y completar pruebas HTTP/E2E
5. Solicitar autorizaciones independientes para push, preview y publicación

La aprobación habilita trabajo local. Las migraciones productivas, push, merge y despliegue necesitan autorizaciones independientes.

Backend y frontend no trabajan este contrato en paralelo. Frontend puede leer la spec y preparar casos de prueba, pero espera el handoff antes de editar código.

## Entrega frontend del ciclo 003

- Commit: `2b131b3 feat(frontend): add reusable reference library`
- Firmado privado en lote desde la capa de datos, sin URLs públicas
- Renovación de miniaturas al recargar y una vez automáticamente al vencer
- Estados separados para carga, vacío, error general y fallo de miniatura
- `Añadir al tablero` guarda mediante `apply_board_operations` y espera confirmación
- `ASSET_ALREADY_ON_BOARD` recarga usos y abre la tarjeta existente
- Lista de usos permite abrir otro tablero y enfocar su tarjeta
- `ASSET_IN_USE` conserva el activo y actualiza los tableros que bloquean su eliminación
- Owner y editor mutan; viewer conserva miniaturas y usos en sólo lectura
- Pruebas locales: 39/39; TypeScript, ESLint, build y `git diff --check` aprobados
- Revisión autenticada sin errores de consola y sin desborde en 390, 768, 1280 y 1440 px
- M003 no ejecutada: el entorno todavía no expone `list_asset_usages`

## Entrega backend del ciclo 003

- Commit: `8290002 feat(backend): enable project asset reuse`
- Auditoría productiva de solo lectura: 3 usos activos y 0 grupos duplicados
- Migración expansiva preparada; no aplicada
- `assets.board_id` pasa a `originBoardId` informativo y `ON DELETE SET NULL`
- Reutilización permitida entre tableros del mismo proyecto
- Duplicados activos protegidos por trigger serializado e índice parcial único
- RPC `list_asset_usages` disponible para owner, editor y viewer
- Error estable `ASSET_ALREADY_ON_BOARD:<item_id>`
- Pruebas locales: 35/35; HTTP 3/3; build aprobado
- Prueba SQL ampliada, pendiente de ejecución después de la migración

## Alcance aprobado del ciclo 003

Referencias conserva activos, pero no muestra miniaturas persistentes ni permite reinsertarlos. El trigger actual también limita cada activo a su tablero de origen.

La spec 003 convierte el banco en una biblioteca del proyecto. Incluye miniaturas privadas, reinserción, reutilización entre tableros y localización de usos.

## Restricciones permanentes

- No uses escrituras directas ni `save_board_snapshot`
- Guarda el tablero mediante `apply_board_operations`
- No expongas claves de servidor en código, logs o variables `NEXT_PUBLIC_*`
- Preserva cambios sin commit de otras sesiones
- Ejecuta el trabajo por capa: planificación, backend, frontend, integración y publicación

## Fuentes vigentes

Consulta `docs/README.md` para elegir la fuente adecuada. Las referencias principales son `docs/BACKEND.md`, `docs/FRONTEND_HANDOFF.md`, `docs/OPERATIONS.md`, la spec 003 y M003.
