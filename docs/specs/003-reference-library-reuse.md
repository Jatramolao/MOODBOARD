---
meta:
  contentType: Reference
---

# Reutilizar referencias en cualquier tablero

Estado: `implementation`

Rama: `codex/003-reference-library-reuse`

Prerequisito cumplido: ciclo 002 aprobado por producto el 12 de agosto de 2026

Inicio de implementación autorizado: 12 de agosto de 2026

Backend implementado localmente: `8290002`. Auditoría productiva de solo
lectura: 3 usos activos, 0 grupos duplicados. La migración y la validación SQL
en Supabase permanecen pendientes de autorización independiente.

Esta spec convierte Referencias en una biblioteca reutilizable del proyecto. El ciclo agrega miniaturas privadas, reinserción en el tablero y localización de usos sin duplicar archivos.

## Resolver el problema

Referencias lista activos de todo el proyecto, pero la experiencia actual tiene tres límites:

- Una imagen retirada pierde su miniatura porque la URL firmada sólo existe mientras una tarjeta del tablero la usa
- El banco no ofrece una acción para volver a colocar la imagen
- El trigger de `board_items` rechaza un activo cuyo `board_id` no coincide con el tablero actual

La interfaz afirma que los archivos están disponibles para todos los tableros. El contrato de datos debe cumplir esa promesa sin volver públicos los objetos de Storage.

## Lograr los resultados de producto

Owner y editor pueden:

- Ver una miniatura de cada activo `ready` del proyecto
- Añadir una referencia existente al tablero actual sin volver a subir el archivo
- Reutilizar el mismo activo en distintos tableros del proyecto
- Consultar qué tableros usan una referencia
- Navegar al uso existente cuando la referencia ya está en el tablero actual

Viewer puede explorar miniaturas y usos, pero no puede añadir ni eliminar activos.

## Aplicar las decisiones de producto

### Definir el alcance del activo

Un activo pertenece al proyecto. `assets.board_id` conserva sólo el tablero donde se cargó por primera vez y puede quedar en `NULL` si ese tablero desaparece.

La ruta de Storage no cambia. El primer segmento continúa siendo `project_id`, por lo que las políticas vigentes protegen todos los objetos del proyecto.

### Evitar duplicados accidentales

Un activo puede tener como máximo un `board_item` activo por tablero. Si ya existe, la interfaz muestra **Ver en el tablero** en lugar de crear otra tarjeta.

El backend debe proteger esta regla ante dos sesiones concurrentes. La interfaz no es la única barrera.

### Colocar una referencia existente

La acción **Añadir al tablero** crea una tarjeta nueva mediante `apply_board_operations`. No registra otro activo ni copia el objeto de Storage.

El frontend coloca la tarjeta dentro de una sección visible y respeta los límites geométricos existentes. Después del guardado, abre el tablero y enfoca la tarjeta.

### Mantener la eliminación segura

`mark_asset_deleted` continúa bloqueando cualquier activo con usos activos. La interfaz debe mostrar el tablero y la tarjeta que mantienen el bloqueo.

Retirar una tarjeta no afecta otros tableros. El activo sólo puede eliminarse cuando no queda ningún uso activo en el proyecto.

## Cambiar el contrato backend

Backend debe entregar una migración compatible que:

1. Mantenga `assets.project_id` como propietario funcional del activo
2. Cambie la relación del tablero de origen a `ON DELETE SET NULL`
3. Valide que activo y tablero pertenezcan al mismo proyecto
4. Deje de exigir que ambos compartan el mismo `board_id`
5. Mantenga la validación de `status`, `deleted_at` y `storage_path`
6. Impida dos usos activos del mismo activo en un tablero
7. Exponga los usos activos con tablero, nombre del tablero, tarjeta y título

El contrato agrega un error estable `ASSET_ALREADY_ON_BOARD`. Un reintento idempotente puede devolver el uso existente en lugar de crear otro.

Antes de crear el índice único, backend debe auditar duplicados activos. La migración se detiene y documenta cualquier conflicto; no elimina tarjetas automáticamente.

## Cambiar el contrato frontend

La capa de datos debe:

- Firmar en lote las rutas privadas devueltas por `listAssets`
- Regenerar URLs vencidas al recargar Referencias
- Mapear `board_id` como `originBoardId` para evitar interpretarlo como límite de uso
- Consultar usos mediante el cliente de dominio
- Crear tarjetas existentes mediante el flujo versionado del tablero

El panel Referencias debe mostrar:

- Miniatura, nombre, tamaño y fecha
- Estado **En este tablero** o cantidad de tableros que la usan
- Acción **Añadir al tablero** para owner y editor
- Acción **Ver en el tablero** cuando ya existe un uso local
- Eliminación definitiva protegida por la lista de usos

## Mantener seguridad y permisos

- El bucket continúa privado
- Las URLs firmadas conservan una expiración limitada
- Sólo miembros del proyecto pueden leer activos y firmar rutas
- Sólo owner y editor pueden crear tarjetas o eliminar activos
- Un activo de otro proyecto debe producir `VALIDATION_ERROR` o `FORBIDDEN`
- Ninguna clave de servidor llega al cliente

## Verificar los criterios de aceptación

1. Toda referencia `ready` muestra una miniatura válida después de recargar
2. Retirar una tarjeta conserva la miniatura en Referencias
3. Añadir una referencia no crea otro activo ni otro objeto de Storage
4. La misma referencia funciona en dos tableros del mismo proyecto
5. El mismo tablero no admite dos usos activos del mismo activo
6. Un activo de otro proyecto nunca puede vincularse
7. Eliminar queda bloqueado mientras exista cualquier uso
8. La lista de usos permite abrir el tablero correspondiente
9. Owner y editor pueden añadir; viewer sólo puede consultar
10. Conflicto de versión, URL vencida y pérdida de red dejan un estado recuperable
11. M003 y el smoke de publicación quedan aprobados

## Mantener el alcance acotado

Este ciclo no incluye:

- Etiquetas, carpetas o colecciones
- Búsqueda avanzada por contenido visual
- Detección de archivos duplicados por checksum
- Edición o recorte de imágenes
- Descarga masiva
- Papelera o restauración de activos
- Uso de activos entre proyectos distintos

## Publicar y recuperar

Backend usa una migración expansiva antes del frontend. El cliente vigente continúa funcionando porque el cambio amplía los usos permitidos.

Si frontend falla, revierte su commit y conserva la migración expansiva. No restaures la restricción por tablero mientras existan usos cruzados; corrige hacia delante cualquier problema posterior.

La implementación comienza por backend. Frontend espera el contrato y el handoff backend antes de editar el flujo de Referencias.

La autorización permite trabajo local por capas. No autoriza migraciones productivas, push ni despliegue. Cada acción mantiene su puerta independiente.
