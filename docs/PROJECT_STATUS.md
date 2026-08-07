# Estado actual del proyecto

Última actualización: 7 de agosto de 2026.

## Fase activa

Integración y QA conjunto del backend y frontend colaborativo v1.

La sesión de producto/planificación controla desde esta fecha las specs, el
orden de paquetes, los criterios de aceptación y los ajustes. La implementación
continúa separada por backend, frontend, integración/QA y despliegue.

Backend y frontend cerraron sus handoffs. La sesión de integración trabaja en
la rama común `codex/001-collaborative-v1` y completó la validación automática,
el QA público, una ronda de endurecimiento de accesibilidad y acciones
destructivas, y el ciclo autenticado de imágenes del owner. El recorrido con
editor/viewer y dos sesiones sigue pendiente.

## Base confirmada

- Rama actual: `main`; la rama local `codex/001-collaborative-v1` se conserva
  como referencia de la iteración y apunta a su commit documental de cierre.
- Backend v1: commit local `f6af218`.
- Corrección backend de tokens `pgcrypto`: commit local `746acbf`.
- Frontend colaborativo v1: commit local `fec5fc6`.
- GitHub: `origin/main` fue actualizado el 6 de agosto incluyendo `e3138c6`,
  incorporando los cambios colaborativos y el disparador de despliegue.
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
- Autenticación local administrativa sin envío de correo: aprobada el 5 de
  agosto de 2026. La pantalla `/auth` importa sesiones implícitas de un solo
  uso, limpia los tokens de la URL y conserva la sesión tras recargar `/`.
- Recorrido autenticado owner iniciado: workspace, proyecto, tablero, activos
  privados y sesión persistente cargan correctamente.
- Ciclo autenticado de imágenes aprobado: subir PNG, mover, reducir hasta el
  mínimo sin deformar, persistir, retirar del tablero, borrar de Referencias y
  comprobar la eliminación tras recargar.
- Geometría de tarjetas cubierta por cinco regresiones nuevas; suite local
  21/21, suite HTTP 3/3 y build de producción aprobados el 5 de agosto.
- Cambio de proyecto sin contenido cruzado aparente: mientras Supabase hidrata
  el tablero se muestra el estado neutro “Cargando proyecto” y el lienzo de
  demostración no se monta ni descarga imágenes.
- Workspace conciliado el 7 de agosto: copias redundantes con sufijo `2`
  retiradas, paquete 1B incorporado a la planificación canónica y todos los
  documentos activos listos para seguimiento Git.

## Hallazgo backend resuelto

Las funciones de invitaciones y enlaces compartidos usaban `pgcrypto` con un
`search_path` vacío. En Supabase, `digest` y `gen_random_bytes` viven en el
esquema `extensions`; la ruta compartida fallaba con un error SQL interno.

- Corrección aplicada:
  `supabase/migrations/202608030002_fix_pgcrypto_search_path.sql`.
- Prueba transaccional ampliada y aprobada para generar y resolver tokens y
  crear un comentario compartido.
- Los errores desconocidos ahora se normalizan sin filtrar detalles SQL.

La corrección de tokens no deja bloqueos. El nuevo paquete 1B debe determinar
si `item.create + asset_id` introduce un bloqueo backend distinto.

## Defectos activos de los paquetes 1A y 1B

- **Creación de tablero dentro de un proyecto:** el tablero se crea, pero la
  navegación posterior entra incorrectamente al flujo de creación de proyecto
  en vez de abrir el nuevo tablero dentro del proyecto actual.
- Criterio de aceptación: al confirmar “Nuevo tablero”, usar el `board_id`
  devuelto por el backend, conservar el proyecto activo y navegar directamente
  a `/?board=<nuevo-board-id>` sin invocar ni mostrar el flujo de proyecto.
- Regresión requerida: comprobar creación desde un proyecto con y sin otros
  tableros, persistencia después de recargar y ausencia de `board=undefined`.

- **Primera imagen en un tablero vacío:** reproducida en Vercel el 7 de agosto.
  `register_asset` deja el activo `ready` y la tarjeta aparece en memoria, pero
  el tablero permanece en versión 1, sin `board_items` ni lote de operaciones.
  El cliente muestra únicamente “No se pudo guardar” y deja una referencia sin
  elemento persistido.
- Relación con eliminación: retirar una tarjeta y conservar Referencias es el
  contrato esperado. La inconsistencia aparece cuando el elemento nunca se
  guardó; entonces backend permite eliminar el activo por no detectar uso,
  mientras la tarjeta todavía existe en el estado local.
- Siguiente diagnóstico: cubrir primero `item.create + asset_id` en la prueba
  SQL transaccional. Sólo después se decide si corrige backend o frontend.

## Responsable actual y siguiente handoff

1. Aprobar la spec y plan maestro de estabilización.
2. Ejecutar el paquete 1A y su puerta manual M1A.
3. Ejecutar el paquete 1B y su puerta manual M1B.
4. Ejecutar secuencialmente roles/invitaciones, share/comentarios,
   concurrencia/resiliencia y UX final, cada uno con aprobación manual.
5. El push a `main` y el despliegue Vercel fueron autorizados de forma
   excepcional antes del cierre E2E; no equivalen a aprobar el producto.
6. Completar los smoke tests autenticados antes de considerar producción
   aprobada.

## Estado y pendientes de nube

- GitHub `main` contiene el trabajo desarrollado, incluido `e3138c6`.
- La integración Git de Vercel está activa mediante `.vercel/repo.json` para
  `Jatramolao/MOODBOARD` y la rama `main` despliega a producción.
- El deployment Production generado desde `e3138c6` está `Ready` con alias
  `moodboard-fotografo.vercel.app`.
- Smoke público aprobado: `/` responde `307` hacia `/auth`.
- Configurar en Vercel `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`.
- Opcional: configurar `RESEND_API_KEY` y `EMAIL_FROM`; sin ellos se usa enlace
  manual de invitación.
- Completar smoke tests autenticados del despliegue conjunto backend +
  frontend.

## Referencias

- Ciclo común: `docs/DEVELOPMENT_WORKFLOW.md`
- Contrato backend: `docs/BACKEND.md`
- Handoff frontend: `docs/FRONTEND_HANDOFF.md`
- Operación: `docs/OPERATIONS.md`
- QA previo: `QA_REPORT.md`
- Spec de estabilización: `docs/specs/001-collaborative-v1-stabilization.md`
- Plan maestro: `docs/plans/001/README.md`
- Protocolo manual: `docs/plans/001/MANUAL_QA.md`
