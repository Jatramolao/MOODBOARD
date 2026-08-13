---
meta:
  contentType: Reference
---

# Consultar el contrato backend

El backend colaborativo v1 y sus correcciones están aplicados en Supabase. La
migración de consistencia de activos fue aplicada y validada el 8 de agosto de
2026.

El contrato expansivo de biblioteca reutilizable está implementado en el
commit `8290002`, aplicado y validado en Supabase el 13 de agosto de 2026. El
preflight inmediato encontró 3 usos activos y 0 grupos duplicados.

## Alcance

El backend soporta el ciclo completo de una primera versión de producto:

- proyectos con archivado, cliente y roles `owner`, `editor`, `viewer`;
- múltiples tableros por proyecto, orden, duplicación y archivado;
- lienzo continuo extensible por secciones;
- guardado colaborativo atómico con versión, conflicto optimista e idempotencia;
- imágenes privadas registradas como activos y asociadas a elementos;
- invitaciones con token hasheado, expiración, rol y capacidad de comentar;
- enlaces compartidos revocables con permisos `view` o `comment`;
- comentarios generales, anclados, respuestas, resolución y borrado lógico;
- eventos de actividad, notificaciones y presencia/realtime;
- límites de frecuencia, cuotas iniciales y mantenimiento programado.

## Modelo y autorización

| Recurso | Lectura | Mutación |
|---|---|---|
| Proyecto/tableros | cualquier miembro | owner/editor; archivar proyecto sólo owner |
| Miembros/invitaciones | miembros ven miembros; invitaciones sólo owner | sólo owner |
| Secciones/elementos | cualquier miembro | owner/editor mediante operaciones |
| Comentarios | cualquier miembro | miembros con `can_comment`; resolver owner/editor |
| Activos | cualquier miembro | owner/editor |
| Actividad | cualquier miembro | sólo funciones internas |
| Notificaciones | sólo destinatario | sólo RPC del destinatario |
| Enlace compartido | cualquiera con token vigente | comentarios sólo con permiso `comment` y sesión |

RLS está habilitado en todas las tablas públicas. Las tablas de flujo no
aceptan escrituras directas desde `authenticated`: las mutaciones pasan por
funciones `SECURITY DEFINER` con comprobaciones de membresía.

## Consistencia del tablero

`boards.version` comienza en 1. Cada guardado llama:

```text
apply_board_operations(board_id, base_version, operation_id, operations[])
```

- La fila del tablero se bloquea durante la transacción.
- `base_version` debe coincidir con la versión actual.
- `operation_id` hace el lote idempotente.
- Un lote válido incrementa la versión una sola vez.
- Un cliente atrasado recibe `VERSION_CONFLICT:<version>` y debe recargar.
- Realtime emite `board_changed`; el cliente vuelve a cargar el estado firmado.
- Máximo 100 operaciones por lote y 500 lotes por consulta incremental.

Operaciones admitidas:

```text
board.update
section.create | section.update | section.delete
item.create    | item.update    | item.delete
```

Eliminar un elemento es lógico (`deleted_at`); mantiene historia y evita que
un cliente atrasado lo resucite accidentalmente.

### Consistencia entre elementos y activos

La migración `202608080001_validate_board_item_assets.sql` agrega una defensa
en el límite de base de datos para `board_items`:

- normaliza `colors` desde JSON `null` a `NULL` SQL;
- exige que todo `asset_id` esté en estado `ready` y no eliminado;
- exige que activo y elemento pertenezcan al mismo proyecto y tablero;
- exige que `image_path` coincida con `assets.storage_path`.

Esta validación evita el fallo de la primera imagen y la asociación de un
elemento con un activo ajeno. La migración 003 reemplazó la exigencia de
compartir tablero por pertenencia al mismo proyecto.

### Biblioteca reutilizable del proyecto

La migración `202608120001_enable_project_asset_reuse.sql` amplía el contrato:

- `assets.project_id` continúa siendo el propietario funcional;
- `assets.board_id` pasa a ser el tablero de origen informativo y usa
  `ON DELETE SET NULL`;
- un activo `ready` puede vincularse a cualquier tablero del mismo proyecto;
- `image_path` debe coincidir siempre con `assets.storage_path`;
- sólo puede existir un `board_item` activo por combinación de tablero y
  activo;
- el trigger serializa colocaciones concurrentes y devuelve
  `ASSET_ALREADY_ON_BOARD:<item_id>`;
- el reintento con el mismo `operation_id` conserva la idempotencia existente.

La migración ejecuta una auditoría bloqueante antes de crear el índice único.
Si detecta duplicados, devuelve `ASSET_REUSE_DUPLICATES` con los IDs afectados
y revierte todo el cambio; nunca elimina ni combina tarjetas automáticamente.

`list_asset_usages(project_id, asset_ids[])` entrega `asset_id`, `board_id`,
`board_name`, `item_id`, `item_title` e `item_created_at`. Cualquier miembro del
proyecto puede consultar usos. Owner y editor pueden crear tarjetas mediante
`apply_board_operations`; viewer no puede mutarlas.

## Funciones RPC públicas

### Proyectos y tableros

- `create_project_with_board`
- `update_project`
- `set_project_archived`
- `create_board`
- `update_board`
- `duplicate_board`
- `reorder_boards`
- `set_board_archived`
- `get_project_usage`

### Colaboración

- `apply_board_operations`
- `get_board_operations_since`
- `change_project_member`
- `remove_project_member`
- `create_project_invitation`
- `accept_project_invitation`
- `revoke_project_invitation`

### Compartir y comentarios

- `create_board_share_link`
- `revoke_board_share_link`
- `resolve_board_share_link`
- `create_board_comment`
- `create_shared_comment`
- `update_board_comment`
- `set_comment_resolved`
- `delete_board_comment`

### Activos y notificaciones

- `register_asset`
- `mark_asset_deleted`
- `list_asset_usages`
- `mark_notification_read`
- `mark_all_notifications_read`

## Endpoints Next.js

| Método | Ruta | Uso |
|---|---|---|
| POST/DELETE | `/api/invitations` | crea, envía o revoca invitaciones |
| POST/DELETE | `/api/share-links` | crea o revoca enlaces compartidos |
| GET | `/api/shared/:token` | resuelve tablero público y firma imágenes |
| GET | `/api/cron/maintenance` | expira invitaciones y limpia activos/eventos antiguos |

Todas las respuestas de error incluyen `x-request-id` y cuerpo normalizado.

## Códigos de dominio

```text
UNAUTHORIZED              401
FORBIDDEN                 403
INVITATION_EMAIL_MISMATCH 403
NOT_FOUND                 404
INVITATION_EXPIRED        410
VALIDATION_ERROR          400
VERSION_CONFLICT          409, reintentable tras recarga
CONFLICT                  409
QUOTA_EXCEEDED            409
ASSET_IN_USE              409
ASSET_ALREADY_ON_BOARD    409
RATE_LIMITED              429, reintentable
```

## Límites v1

- 50 proyectos activos por propietario.
- 100 tableros activos por proyecto.
- 100 miembros por proyecto.
- 50 MB por imagen.
- 20 GB de activos listos por proyecto.
- 20 proyectos creados por usuario/hora.
- 30 invitaciones por usuario/hora.

## Migraciones y pruebas

- Esquema inicial: `supabase/migrations/202607310001_initial_workspace.sql`
- Backend v1: `supabase/migrations/202608030001_backend_v1.sql`
- Corrección de `pgcrypto` para funciones con `SECURITY DEFINER`:
  `supabase/migrations/202608030002_fix_pgcrypto_search_path.sql`
- Consistencia entre elemento y activo, aplicada en Supabase:
  `supabase/migrations/202608080001_validate_board_item_assets.sql`
- Biblioteca reutilizable por proyecto, aplicada en Supabase:
  `supabase/migrations/202608120001_enable_project_asset_reuse.sql`
- Auditoría manual de duplicados:
  `supabase/tests/reference_library_preflight.sql`
- Integración SQL: `supabase/tests/backend_v1.sql`
- Pruebas TypeScript: `tests/backend/*.test.ts`

La prueba SQL corre dentro de una transacción y termina en `rollback`; valida
RLS, bootstrap de proyecto, primera imagen con activo, normalización de paleta,
rechazo de activos de otro tablero, idempotencia, protección `ASSET_IN_USE`,
borrado lógico, generación y resolución de tokens, y comentarios compartidos
sin dejar datos.

La ampliación 003 agrega reutilización en dos tableros, duplicado en el mismo
tablero, ruta incorrecta, activo de otro proyecto, bloqueo con uno y dos usos,
eliminación después del último uso y permisos de owner, editor, viewer y no
miembro.
