---
meta:
  contentType: Reference
---

# Integrar el frontend con el dominio

Esta referencia define los límites estables del frontend. Consulta `docs/PROJECT_STATUS.md` para conocer el ciclo activo y `docs/BACKEND.md` para revisar el contrato completo.

## Consumir el handoff del ciclo 003

Backend preparó la biblioteca reutilizable en `8290002`. La migración
`202608120001_enable_project_asset_reuse.sql` todavía no está aplicada en
Supabase; no ejecutes la puerta manual ni publiques el cliente antes de ese
gate. La implementación frontend sí puede comenzar sobre este contrato.

`AssetRecord` expone `originBoardId`. Sólo identifica el tablero donde se
subió el archivo por primera vez; no limita dónde puede usarse. Consulta usos
mediante `backend.listAssetUsages(projectId, assetIds?)`. Cada resultado
contiene `assetId`, `boardId`, `boardName`, `itemId`, `itemTitle` e
`itemCreatedAt`; agrupa por `assetId` y no consultes `board_items` directamente
desde componentes.

`listAssets` entrega rutas privadas, no URLs públicas. Firma en lote las rutas
visibles desde la capa de datos, renueva las URLs al recargar Referencias y
representa por separado los errores de firma. No uses `getPublicUrl` ni
incluyas claves server-only en el cliente.

Owner y editor crean una tarjeta con `apply_board_operations` usando el
`assetId` existente y exactamente su `storagePath`. No llames `register_asset`
ni copies el objeto de Storage. Si ya existe un uso local, muestra **Ver en el
tablero**. Ante `ASSET_ALREADY_ON_BOARD:<item_id>`, recarga los usos y navega a
la tarjeta existente. Viewer sólo consulta activos, miniaturas y usos.

`ASSET_IN_USE` puede representar usos en varios tableros. Al recibirlo, recarga
`listAssetUsages`, conserva la referencia y muestra los tableros que bloquean
la eliminación. Retirar un uso nunca afecta los demás.

## Usar las fuentes de verdad

| Responsabilidad | Archivo |
|---|---|
| Cliente de dominio | `lib/backend/client.ts` |
| Tipos | `lib/backend/types.ts` |
| Errores | `lib/backend/errors.ts` |
| Validación | `lib/backend/validation.ts` |
| Diferencias del tablero | `lib/backend/board-operations.ts` |
| Adaptador del lienzo | `lib/supabase/board-adapter.ts` |
| Estado de interfaz | `components/board/BoardProvider.tsx` |

Los componentes deben usar el cliente de dominio. No distribuyas consultas Supabase ni mapeos `snake_case` dentro de componentes visuales.

## Guardar el tablero

El adaptador genera operaciones y mantiene `boardVersion`:

- Guarda con `apply_board_operations`
- No llames `save_board_snapshot`
- Muestra `saving`, `saved` y `error` mediante una región `aria-live`
- Ante `VERSION_CONFLICT`, bloquea nuevas mutaciones y recarga
- No reintentes a ciegas ni apliques last write wins

## Aplicar permisos

| Condición | Comportamiento de interfaz |
|---|---|
| `owner` | Edita tablero, miembros, invitaciones y enlaces |
| `editor` | Edita tablero y resuelve comentarios |
| `viewer` | Consulta sin mutaciones |
| `can_comment=false` | Oculta el compositor y conserva lectura |
| 401 | Redirige a `/auth` y conserva un destino seguro |
| 403 | Explica la falta de permiso |

Backend sigue siendo la autoridad. Ocultar un control no reemplaza RLS ni la validación de una función.

## Manejar activos

Los activos son privados. Usa la URL firmada entregada por el adaptador y no construyas una URL pública desde `image_path`.

La eliminación de una imagen admite dos alcances:

- **Retirar sólo del tablero**: persiste `item.delete` y conserva Referencias
- **Retirar y eliminar de Referencias**: confirma `item.delete` antes de llamar `mark_asset_deleted`

Mantén estas garantías:

- No elimines el activo si falla el guardado
- Conserva la referencia ante `ASSET_IN_USE`
- Informa por separado el estado de la tarjeta y la referencia
- No recrees una tarjeta cuando falla la segunda etapa
- Invalida Referencias después de eliminar el activo

## Mapear errores de dominio

| Código | Acción de interfaz |
|---|---|
| `VERSION_CONFLICT` | Informa y recarga |
| `RATE_LIMITED` | Conserva el formulario y permite reintento posterior |
| `QUOTA_EXCEEDED` | Explica el límite aplicable |
| `ASSET_IN_USE` | Conserva el activo e informa el uso restante |
| `ASSET_ALREADY_ON_BOARD` | Recarga usos y abre la tarjeta existente |
| `FORBIDDEN` | Detiene la mutación y actualiza permisos |
| 404 o 410 en share/invite | Muestra un estado final sin editor parcial |

No expongas SQL, tokens, claves ni detalles internos en los mensajes.

## Validar cambios de frontend

Antes del handoff:

1. Prueba owner, editor y viewer
2. Prueba carga, vacío, error, red y conflicto
3. Revisa 390, 768, 1280 y 1440 px
4. Revisa teclado, foco, etiquetas y `aria-live`
5. Ejecuta la suite y el build completos
6. Registra sólo los asuntos pendientes para integración
