---
meta:
  contentType: Reference
---

# Entender el estado actual del proyecto

Este documento resume la fase activa, la base publicada y las acciones necesarias para cerrar el ciclo. Última actualización: 12 de agosto de 2026.

## Estado ejecutivo

- **Fase**: validación productiva y cierre del ciclo 002
- **Rama local**: `codex/002-explicit-image-removal` en `5b741b1`
- **GitHub**: `main` y `origin/main` en `5b741b1`
- **Producción**: deployment `dpl_GcaexVu1uX8APBxJrDudhxudJWXJ`, estado `Ready`
- **Backend**: sin cambios pendientes ni migraciones nuevas para el ciclo 002
- **Bloqueos de código**: ninguno conocido
- **Puerta pendiente**: M002 con owner, editor, viewer y activos desechables

## Resultado del ciclo 002

El frontend permite elegir entre retirar una imagen del tablero o retirarla y eliminarla de Referencias. La segunda acción guarda primero `item.delete` y después llama `mark_asset_deleted`.

El flujo conserva estas reglas:

- Un error de guardado no intenta eliminar el activo
- `ASSET_IN_USE` conserva la referencia cuando existe otro uso
- Un error posterior informa que la tarjeta se retiró y la referencia permanece
- Viewer no recibe controles de eliminación
- Notas y paletas mantienen su eliminación anterior

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

1. Ejecutar M002 en producción desde `docs/plans/002/MANUAL_QA.md`
2. Registrar el resultado en `QA_REPORT.md`
3. Corregir y repetir sólo los casos devueltos
4. Ejecutar el smoke productivo del flujo afectado
5. Marcar la spec 002 como `released` si M002 y el smoke pasan
6. Definir la siguiente spec o declarar que no existen pendientes activos

No se requiere otro despliegue para validar el código actual. Cualquier corrección, push o despliegue adicional necesita una nueva autorización.

## Restricciones permanentes

- No uses escrituras directas ni `save_board_snapshot`
- Guarda el tablero mediante `apply_board_operations`
- No expongas claves de servidor en código, logs o variables `NEXT_PUBLIC_*`
- Preserva cambios sin commit de otras sesiones
- Ejecuta el trabajo por capa: planificación, backend, frontend, integración y publicación

## Fuentes vigentes

Consulta `docs/README.md` para elegir la fuente adecuada. Las referencias principales son `docs/BACKEND.md`, `docs/FRONTEND_HANDOFF.md`, `docs/OPERATIONS.md`, la spec 002 y M002.
