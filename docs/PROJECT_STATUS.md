# Estado actual del proyecto

Última actualización: 11 de agosto de 2026.

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

La puerta manual M1B fue ejecutada nuevamente en producción el 8 de agosto y
quedó **fallida**. No se autoriza avanzar al siguiente flujo de specs hasta
corregir y volver a aprobar la primera imagen de un tablero vacío.

## Base confirmada

- Rama actual: `main`, sincronizada con `origin/main`. La integración de
  `codex/001-first-image-backend` entró por fast-forward hasta `a681b6c`, sin
  divergencias ni conflictos.
- Backend v1: commit local `f6af218`.
- Corrección backend de tokens `pgcrypto`: commit local `746acbf`.
- Frontend colaborativo v1: commit local `fec5fc6`.
- Corrección frontend M1A: commit local `5f2b2f9`.
- Compensación frontend 1B: commit local `4a4fdac`.
- GitHub: `origin/main` contiene los ajustes backend/frontend 1A/1B, sus
  regresiones y la documentación de integración hasta `a681b6c`.
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
- Historial remoto de migraciones conciliado el 8 de agosto: las cuatro
  versiones locales `202607310001`–`202608080001` están registradas y
  `supabase db push --dry-run` informa la base al día.
- Migración `202608080001_validate_board_item_assets.sql`: aplicada en el
  proyecto Supabase `mwcqastezpqsqsaokyzp`.
- Prueba SQL 1B ejecutada contra la base remota y aprobada con
  `backend_v1 QA passed`; el escenario completo termina en `ROLLBACK`.
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
- Producción observada para M1B: tablero
  `a3afca8e-ab7b-4232-a07f-a649e8b5115a` en versión 1, sin `board_items` y sin
  lotes de operaciones. El activo creado llegó a `ready` y luego a `deleted`,
  con eventos `asset.ready` y `asset.deleted`.

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
- Revalidación manual M1B del 8 de agosto: fallida por la misma secuencia. La
  eliminación de Referencias no borró un `board_item` en Supabase porque nunca
  fue creado; eliminó el activo que había quedado desacoplado del estado local.
- Siguiente diagnóstico: cubrir primero `item.create + asset_id` en la prueba
  SQL transaccional. Sólo después se decide si corrige backend o frontend.

### Ajuste backend 1B preparado localmente

- Causa demostrada por inspección del contrato: `colors: null` llegaba como
  JSONB `null`, valor incompatible con la restricción de `board_items`.
- Rama activa: `codex/001-first-image-backend`.
- Migración preparada: `202608080001_validate_board_item_assets.sql`; normaliza
  la paleta y valida estado, proyecto, tablero y ruta del activo.
- Cliente corregido para omitir una paleta ausente.
- Regresión SQL ampliada para primera imagen, idempotencia, activo ajeno,
  `ASSET_IN_USE` y borrado posterior a `item.delete`.
- Validación local aprobada: backend/frontend 22/22, integración HTTP 3/3 y
  build de producción.
- Migración aplicada y regresión SQL remota aprobada el 8 de agosto. El arnés
  resuelve la sección inicial como `postgres` y vuelve al rol `authenticated`
  antes de ejecutar todas las operaciones de producto, evitando un falso
  `SECTION_NOT_FOUND` causado por la preparación del test bajo RLS.

### Ajustes frontend 1A y 1B completados localmente

- `create_board` consume ahora su UUID escalar y nunca navega con
  `board=undefined`.
- Los errores de `apply_board_operations` conservan su código de dominio y una
  causa útil sin exponer contexto SQL interno.
- Una creación de item fallida retira la tarjeta local y da de baja el activo;
  las cargas múltiples parciales también se compensan.
- Si la baja responde `ASSET_IN_USE`, el frontend conserva el activo y recarga
  el tablero remoto para no borrar una operación ya confirmada.
- Validación frontend aprobada: suite local 28/28, integración HTTP 3/3,
  TypeScript, ESLint, build y `git diff --check`.

### Revalidación de integración

- Handoffs backend/frontend reunidos hasta `71064d6`.
- Integración independiente aprobada el 8 de agosto: suite local 28/28, HTTP
  3/3 contra `localhost:3001`, TypeScript, ESLint, build y
  `git diff --check`.
- El puerto 3000 pertenece a otro workspace local; no se detuvo ni modificó
  ese proceso durante la validación.
- La migración y el contrato SQL de M1B están aprobados; queda repetir el
  recorrido manual de primera imagen en un tablero vacío.

## Responsable actual y siguiente handoff

1. Migración 1B aplicada y prueba SQL transaccional remota aprobada.
2. Frontend completó M1A y la compensación 1B en `5f2b2f9` y `4a4fdac`.
3. Integración debe repetir la puerta manual M1B en producción.
4. Confirmar y cerrar M1A de creación/navegación de tablero.
5. Ejecutar secuencialmente roles/invitaciones, share/comentarios,
   concurrencia/resiliencia y UX final, cada uno con aprobación manual.
6. El push a `main` y el despliegue Vercel fueron autorizados de forma
   excepcional antes del cierre E2E; no equivalen a aprobar el producto.
7. Completar los smoke tests autenticados antes de considerar producción
   aprobada.

## Estado y pendientes de nube

- GitHub `main` contiene la integración completa 1A/1B hasta `a681b6c`.
- La integración Git de Vercel está activa mediante `.vercel/repo.json` para
  `Jatramolao/MOODBOARD` y la rama `main` despliega a producción.
- El deployment Production `dpl_CEKGrdWpPnnxhEse1Gk2trowtqPz`, generado desde
  `a681b6c`, está `Ready` y sirve los alias `moodboard-fotografo.vercel.app` y
  `moodboard.libraphotos.com`.
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
