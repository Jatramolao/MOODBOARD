# Estado actual del proyecto

Última actualización: 4 de agosto de 2026.

## Fase activa

Integración y QA conjunto del backend y frontend colaborativo v1.

Backend y frontend cerraron sus handoffs. La sesión de integración trabaja en
la rama común `codex/001-collaborative-v1` y completó la validación automática,
el QA público y una ronda de endurecimiento de accesibilidad y acciones
destructivas. El recorrido autenticado por roles sigue pendiente.

## Base confirmada

- Rama actual: `codex/001-collaborative-v1`.
- Backend v1: commit local `f6af218`.
- Corrección backend de tokens `pgcrypto`: commit local `746acbf`.
- Frontend colaborativo v1: commit local `fec5fc6`.
- Estado remoto: la rama local está siete commits por delante de
  `origin/main`; todavía no se autorizó el push.
- Migración `202608030001_backend_v1.sql`: aplicada en Supabase.
- Prueba SQL transaccional: aprobada.
- Suite backend: 8/8 pruebas aprobadas.
- TypeScript, ESLint, build y auditoría npm: aprobados al cierre de backend.
- Suite local integrada: 16/16 pruebas aprobadas; suite específica frontend:
  7/7 pruebas aprobadas.
- TypeScript, ESLint, build de producción y `git diff --check`: aprobados el 4
  de agosto de 2026.
- Suite HTTP de integración: 3/3 pruebas aprobadas para callback seguro,
  errores compartidos normalizados y validación previa de identificadores.
- Auditoría de dependencias de producción: 0 vulnerabilidades conocidas.
- Migración `202608030002_fix_pgcrypto_search_path.sql`: aplicada en Supabase
  el 4 de agosto de 2026.
- Prueba SQL ampliada: aprobada con generación de invitaciones, creación y
  resolución de enlaces compartidos y comentarios compartidos.
- QA público/local: autenticación inválida, callback expirado, invitación
  inválida, sanitización de errores, edición de notas, persistencia, zoom y
  responsive base aprobados sin errores de consola.
- QA responsive público repetido en 390, 768, 1280 y 1440 px, sin desborde
  global ni advertencias de consola.
- Endurecimiento integrado: confirmación y manejo de error al revocar enlaces
  e invitaciones, confirmación al archivar o quitar integrantes, etiquetado
  accesible de formularios y autor real en comentarios compartidos.

## Hallazgo backend resuelto

Las funciones de invitaciones y enlaces compartidos usaban `pgcrypto` con un
`search_path` vacío. En Supabase, `digest` y `gen_random_bytes` viven en el
esquema `extensions`; la ruta compartida fallaba con un error SQL interno.

- Corrección aplicada:
  `supabase/migrations/202608030002_fix_pgcrypto_search_path.sql`.
- Prueba transaccional ampliada y aprobada para generar y resolver tokens y
  crear un comentario compartido.
- Los errores desconocidos ahora se normalizan sin filtrar detalles SQL.

No quedan bloqueos backend conocidos para continuar la integración.

## Responsable actual y siguiente handoff

1. Integración automática y QA público completados en la rama de iteración.
2. Completar E2E autenticado con owner, editor, viewer, dos sesiones,
   invitaciones, share y comentarios.
3. Crear preview y ejecutar smoke tests sólo después de aprobar el E2E
   autenticado y recibir autorización de push.
4. GitHub/Vercel producción quedan pendientes hasta aprobar integración.

## Pendientes de entorno productivo

- Autorizar `git push`.
- Configurar en Vercel `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`.
- Opcional: configurar `RESEND_API_KEY` y `EMAIL_FROM`; sin ellos se usa enlace
  manual de invitación.
- Ejecutar smoke tests después del despliegue conjunto backend + frontend.

## Referencias

- Ciclo común: `docs/DEVELOPMENT_WORKFLOW.md`
- Contrato backend: `docs/BACKEND.md`
- Handoff frontend: `docs/FRONTEND_HANDOFF.md`
- Operación: `docs/OPERATIONS.md`
- QA previo: `QA_REPORT.md`
