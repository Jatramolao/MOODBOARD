---
meta:
  contentType: Reference
---

# Entender el estado actual del proyecto

Este documento resume la fase activa, la base publicada y las acciones necesarias para cerrar el ciclo. Última actualización: 12 de agosto de 2026.

## Estado ejecutivo

- **Fase**: backend del ciclo 003, biblioteca reutilizable de Referencias
- **Rama local**: `codex/003-reference-library-reuse`
- **GitHub**: `main` y `origin/main` en `5b741b1`
- **Producción**: deployment `dpl_GcaexVu1uX8APBxJrDudhxudJWXJ`, estado `Ready`
- **Ciclo 002**: aprobado manualmente y cerrado por producto
- **Spec 003**: `implementation`
- **Plan 003**: `in_progress`
- **Bloqueos de código**: ninguno conocido
- **Responsable actual**: sesión backend
- **Frontend**: pendiente del handoff backend

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

1. Backend audita duplicados activos por tablero y activo
2. Backend prepara la migración expansiva y las pruebas SQL
3. Backend documenta el contrato y entrega el handoff frontend
4. Frontend implementa miniaturas privadas y consulta de usos
5. Integración ejecuta M003-A antes de habilitar la reinserción
6. Continuar los paquetes 3 a 5 según `docs/plans/003/README.md`

La aprobación habilita trabajo local. Las migraciones productivas, push, merge y despliegue necesitan autorizaciones independientes.

Backend y frontend no trabajan este contrato en paralelo. Frontend puede leer la spec y preparar casos de prueba, pero espera el handoff antes de editar código.

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
