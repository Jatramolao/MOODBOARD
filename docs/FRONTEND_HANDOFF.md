# Traspaso a la sesión de frontend

Este es el punto de partida obligatorio para implementar la interfaz. El
backend v1 ya está aplicado; frontend no debe crear tablas, inventar permisos
ni volver al guardado de snapshots.

Antes de comenzar, leer también `docs/PROJECT_STATUS.md` y
`docs/DEVELOPMENT_WORKFLOW.md`; allí se documentan el estado compartido, la
propiedad de cambios locales y el procedimiento de handoff/Git.

## Fuente de verdad en código

- Cliente de dominio: `lib/backend/client.ts`
- Tipos: `lib/backend/types.ts`
- Errores: `lib/backend/errors.ts`
- Validación: `lib/backend/validation.ts`
- Diferencias del tablero: `lib/backend/board-operations.ts`
- Adaptador activo del lienzo: `lib/supabase/board-adapter.ts`
- Contrato completo: `docs/BACKEND.md`

Usar `backend` desde `lib/backend/client.ts` para pantallas y acciones. Evitar
consultas Supabase dispersas en componentes.

## Prioridad recomendada de implementación

### 1. Navegación de proyectos y tableros

Reemplazar controles demostrativos por:

- listado, creación, edición y archivado de proyectos;
- listado de tableros activos/archivados;
- crear, renombrar, duplicar, ordenar, archivar y restaurar tablero;
- selector real de proyecto y tablero;
- estados vacíos, loading, error y permisos de sólo lectura.

Al abrir un tablero, entregar `projectId` y `boardId` al adaptador existente.

### 2. Sincronización colaborativa

El adaptador actual ya genera operaciones y mantiene `boardVersion`.

- Mostrar `saving`, `saved` y `error` en una región `aria-live`.
- En `VERSION_CONFLICT`, bloquear nuevos cambios, informar al usuario y recargar.
- No hacer “last write wins” desde UI.
- No llamar `save_board_snapshot`; su permiso fue retirado.
- Para edición simultánea avanzada, consumir `operationsSince` antes de decidir
  una futura estrategia de merge; v1 recarga el tablero completo.

### 3. Equipo e invitaciones

- Miembros: `backend.listMembers(projectId)`.
- Perfiles: recolectar `user_id` y llamar `backend.listProfiles(ids)`; no existe
  un join PostgREST implícito entre `auth.users` y `profiles`.
- Cambiar rol/capacidad: `changeMember`.
- Quitar miembro: `removeMember`.
- Crear invitación: `POST /api/invitations`.
- Revocar: `DELETE /api/invitations?id=...`.
- Aceptar: `backend.acceptInvitation(token)`.

Crear `/invite?token=...` con estos estados: sesión requerida, token inválido,
email distinto, expirado, ya miembro, éxito y redirección al proyecto.

Si el endpoint devuelve `delivery: "manual"`, mostrar `inviteUrl` y botón de
copiar. Si devuelve `delivery: "email"`, el token no se expone al cliente.

### 4. Compartir y revisión externa

- Crear: `POST /api/share-links`.
- Listar: `backend.listShareLinks(boardId)`.
- Revocar: `DELETE /api/share-links?id=...`.
- Vista pública: `GET /api/shared/:token`.

Construir `/share/[token]` como una vista separada del editor, sin herramientas
de edición. Respetar `permission`:

- `view`: sólo lectura.
- `comment`: usuario autenticado puede comentar mediante `createSharedComment`.

Si `assetsConfigured` es `false`, mostrar un error operativo; significa que la
variable server-only de Supabase aún no está disponible en Vercel.

### 5. Comentarios editoriales

- Hilo general y comentario anclado a tarjeta o coordenadas.
- Respuestas usando `parentId`.
- Editar/borrar sólo autor; resolver/reabrir sólo editor/owner.
- Filtrar visualmente `deleted_at`; conservar el hilo.
- Resolver nombres con `backend.listProfiles`.
- Suscribirse al cambio del tablero y refrescar comentarios.

### 6. Activos, actividad y notificaciones

- Galería del proyecto con `listAssets` y uso con `getProjectUsage`.
- `markAssetDeleted` sólo para activos sin elementos activos; manejar
  `ASSET_IN_USE`.
- Timeline con `listActivity`; resolver `actor_id` en una consulta de perfiles.
- Bandeja con `listNotifications`, `markNotificationRead` y
  `markAllNotificationsRead`.

## Contratos de UI imprescindibles

| Condición backend | Comportamiento frontend |
|---|---|
| viewer | ocultar/deshabilitar mutaciones del tablero |
| `can_comment=false` | ocultar compositor, conservar lectura |
| `VERSION_CONFLICT` | avisar y recargar; no reintentar a ciegas |
| `RATE_LIMITED` | conservar formulario y permitir reintento posterior |
| `QUOTA_EXCEEDED` | explicar límite específico y ofrecer archivar/borrar |
| `ASSET_IN_USE` | localizar tarjetas que usan el activo |
| 401 | redirigir a `/auth` preservando destino seguro |
| 403 | página/aviso de permiso, no “recurso inexistente” |
| 404/410 en share/invite | pantalla final clara, sin editor parcial |

## Convenciones de datos

Las respuestas directas de Supabase usan `snake_case`. Los tipos de dominio en
`lib/backend/types.ts` documentan la forma esperada para UI; crear mapeadores en
la capa de datos, no dentro de componentes visuales.

Los `image_path` son privados y nunca deben convertirse manualmente en una URL
pública. Usar `imageUrl` entregada por el adaptador o `image_url` del endpoint
compartido. Las URLs firmadas expiran y deben regenerarse al recargar.

## Criterio de cierre de frontend

- Ningún control principal es demostrativo.
- Owner, editor y viewer tienen recorridos E2E separados.
- Dos sesiones muestran cambios sin sobrescribir silenciosamente.
- Invitación, share view/comment y revocación están probados.
- Imágenes funcionan en sesión privada y enlace público.
- Estados vacíos, carga, error, offline y conflicto son visibles/accesibles.
- Responsive revisado en 390, 768, 1280 y 1440 px.
- Sin errores de consola; `typecheck`, `lint`, `test` y `build` en verde.
