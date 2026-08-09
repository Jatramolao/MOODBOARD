# Informe de QA — Moodboard Editorial

Fecha: 31 de julio de 2026  
Alcance: código local, interfaz, persistencia local, producción en Vercel y
configuración activa de Supabase.

## Resumen

Actualización integración de handoffs 1A/1B — 8 de agosto de 2026:

- Backend y frontend quedaron reunidos en `codex/001-first-image-backend` hasta
  `71064d6`.
- Suite local integrada: 28/28; suite HTTP: 3/3; TypeScript, ESLint, build de
  producción y `git diff --check`: aprobados.
- La suite HTTP se ejecutó contra `localhost:3001` porque el puerto 3000 estaba
  ocupado por otro workspace local; las respuestas de esta aplicación cumplen
  los contratos de callback, share e identificadores inválidos.
- La migración `202608080001_validate_board_item_assets.sql` fue aplicada al
  proyecto Supabase y el historial remoto quedó conciliado con las cuatro
  migraciones locales.
- La prueba SQL transaccional remota aprobó primera imagen, idempotencia,
  aislamiento de assets, `ASSET_IN_USE`, eliminación posterior y RLS con el
  resultado `backend_v1 QA passed`; no persistió datos por su `ROLLBACK`.
- Se corrigió el arnés SQL para obtener la sección de preparación como
  `postgres` y volver al rol `authenticated` antes de probar el producto. El
  fallo previo `SECTION_NOT_FOUND` provenía del setup del test bajo RLS.
- La puerta manual M1B permanece pendiente de repetición en producción.

Actualización prueba manual M1B en producción — 8 de agosto de 2026:

- M1B **fallida** en el tablero
  `a3afca8e-ab7b-4232-a07f-a649e8b5115a` de Vercel.
- La primera imagen volvió a terminar en “Error al guardar”. La consulta de
  Supabase confirmó que el tablero permaneció en versión 1, con cero
  `board_items` y cero lotes en `board_operation_batches`.
- El activo `17ea30a4-0fdd-477d-8ba1-80b78d0eee89` sí alcanzó el estado
  `ready` y después fue eliminado desde Referencias. Los eventos registrados
  fueron `asset.ready` y `asset.deleted`; no hubo operación de tablero.
- La eliminación no retiró un elemento persistido: el elemento visual sólo
  había existido en memoria. Por ello `ASSET_IN_USE` no podía activarse y la
  referencia quedó con estado `deleted`.
- No se avanza al siguiente flujo de specs. El paquete 1B debe pasar primero
  por backend, frontend e integración y repetir M1B en un tablero vacío.

Actualización hallazgos manuales de producción — 7 de agosto de 2026:

- La creación de tablero vuelve a reproducir la redirección al setup. La causa
  está aislada: `create_board` devuelve un UUID escalar y `Sidebar` intenta leer
  `board_id`, produciendo `/?board=undefined`.
- La primera imagen de un tablero vacío crea correctamente el activo `ready` y
  muestra la tarjeta, pero termina en “Error al guardar”. El tablero observado
  quedó en versión 1, sin elemento persistido y sin lote de operaciones.
- El error PostgREST real se pierde en `BoardProvider`, que sólo conserva
  `error.message` cuando el objeto es una instancia nativa de `Error`.
- Esto explica parte de la inconsistencia de eliminación: el activo sin item
  persistido puede eliminarse de Referencias aunque la tarjeta continúe en
  memoria. En el flujo sano, retirar una tarjeta y conservar la referencia es
  deliberado; borrar la referencia activa debe responder `ASSET_IN_USE`.
- La cobertura SQL vigente sólo prueba `board.update`; debe agregarse una
  regresión `item.create` con `asset_id` antes de asignar la corrección a una
  capa.
- La referencia QA creada durante la reproducción fue dada de baja
  lógicamente; no se modificaron referencias anteriores.

Actualización interacciones de imágenes — 5 de agosto de 2026:

- Se ejecutó en el workspace owner un ciclo remoto completo con un PNG QA:
  carga, movimiento, reducción repetida, guardado, retirada del tablero,
  eliminación de Referencias y recarga.
- El redimensionado de imágenes conserva ahora la proporción; la previsualización
  y el estado persistido comparten límites de 150–520 px de ancho y 110–620 px
  de alto. Al llegar al mínimo, el caso QA quedó estable en 150 × 184,09 px.
- Mover o ampliar una tarjeta vuelve a ajustarla dentro de los límites de su
  sección. Un arrastre más allá del ancho total termina en la última sección.
- El control de tamaño admite flechas y Shift + flechas, lo que permite ajuste
  fino accesible y una regresión E2E determinista.
- Retirar una imagen explica que el archivo permanece en Referencias. El borrado
  definitivo de la biblioteca exige confirmación, informa éxito y aclara el
  bloqueo cuando el activo está usado en otro tablero.
- Los dos activos QA creados durante la reproducción fueron eliminados; no se
  modificaron las referencias originales del usuario.
- Suite local: 21/21; integración HTTP: 3/3; TypeScript, ESLint, build y
  `git diff --check`: aprobados.
- Se eliminó el parpadeo del tablero demostrativo al cambiar de proyecto. La
  carga remota presenta ahora “Cargando proyecto” hasta completar la
  hidratación, sin montar ni descargar referencias ajenas.

Actualización integración/QA — 4 de agosto de 2026:

- Rama de iteración: `codex/001-collaborative-v1`.
- Suite local integrada: 16/16 pruebas aprobadas.
- Suite HTTP de integración: 3/3 pruebas aprobadas contra el servidor local.
- TypeScript, ESLint, build de producción y `git diff --check`: aprobados.
- Dependencias de producción: 0 vulnerabilidades conocidas.
- Callback con destino externo, token compartido inválido e identificadores
  inválidos de invitación/share: respuestas seguras y normalizadas aprobadas.
- Autenticación, invitación y share públicos verificados sin errores de
  consola; responsive aprobado en 390, 768, 1280 y 1440 px.
- Se añadieron confirmaciones y manejo visible de errores a revocaciones,
  archivado y eliminación de integrantes; también etiquetas accesibles en los
  formularios revisados.
- La pantalla compartida ahora presenta el autor recibido por el backend y un
  mensaje comprensible cuando el enlace no existe o fue revocado.

El único bloqueo de QA previo a preview es el recorrido autenticado real con
owner, editor, viewer y dos sesiones. Requiere iniciar sesión y disponer de las
cuentas de prueba correspondientes; no se generaron usuarios ni correos reales
sin autorización.

Actualización autenticación local — 5 de agosto de 2026:

- Se validó un acceso administrativo real de Supabase sin envío de correo.
- `/auth` ahora consume de forma explícita la sesión implícita de un solo uso,
  elimina access/refresh tokens del fragmento y redirige al destino seguro.
- La sesión persiste al recargar `/`; el workspace owner, proyecto, tablero e
  imágenes privadas cargan correctamente.
- Suite local 16/16, TypeScript, ESLint, build y `git diff --check`: aprobados.

Actualización integración frontend/backend — 3 de agosto de 2026:

- Suite integrada local: 16/16 pruebas aprobadas.
- TypeScript, ESLint, build de producción y `git diff --check`: aprobados.
- Dependencias de producción: 0 vulnerabilidades conocidas.
- Autenticación sin sesión, callback inválido, invitación inválida y
  sanitización de errores: aprobados sin errores de consola.
- Responsive de autenticación verificado en 390, 768, 1280 y 1440 px sin
  desborde global.
- Workspace local: creación y edición de nota, persistencia tras recarga y
  zoom aprobados.
- Hallazgo corregido: las funciones de tokens no encontraban `pgcrypto` con el
  `search_path` vigente. La migración
  `202608030002_fix_pgcrypto_search_path.sql` fue aplicada el 4 de agosto de
  2026 y la prueba transaccional ampliada quedó aprobada.

La integración no está lista para preview o producción hasta completar los
recorridos autenticados por rol.

Actualización backend v1 — 3 de agosto de 2026:

- Migración colaborativa aplicada correctamente en Supabase producción.
- Prueba SQL transaccional aprobada: esquema, RLS, bootstrap, versionado,
  idempotencia y aislamiento entre usuarios.
- Suite automatizada: 8 de 8 pruebas aprobadas.
- `typecheck`, ESLint y build de producción aprobados con las nuevas rutas.
- Los hallazgos backend de alta prioridad de este informe quedaron resueltos;
  las pantallas que los consumen se entregan a la sesión de frontend.

- Calidad de compilación: aprobada.
- Dependencias de producción: 0 vulnerabilidades conocidas.
- Integridad de Supabase: aprobada; no hay relaciones rotas ni archivos
  faltantes o huérfanos.
- Seguridad base: RLS habilitado en las 7 tablas públicas, bucket privado y RPC
  restringidos a usuarios autenticados.
- Interacciones principales del lienzo: carga, render, zoom, movimiento,
  creación de notas y extensión por disciplinas aprobadas.
- Preparación como producto: incompleta. Compartir, invitaciones, comentarios,
  búsqueda, equipo y gestión de múltiples tableros aún son controles
  demostrativos.

## Matriz de pruebas

| Área | Prueba | Resultado |
|---|---|---|
| Código | `npm run lint` | Aprobada |
| Código | `npm run typecheck` | Aprobada |
| Código | `npm run build` | Aprobada |
| Integración | `npm run test:integration` | Aprobada, 3/3 contra servidor local |
| Dependencias | `npm audit --omit=dev` | Aprobada, 0 vulnerabilidades |
| Producción | `/` sin sesión redirige a `/auth` | Aprobada, HTTP 307 |
| Producción | `/auth` responde correctamente | Aprobada, HTTP 200 |
| Autenticación | Campo obligatorio y validación de formato email | Aprobada |
| Autenticación | Callback inválido no permite redirección externa | Aprobada |
| Tablero | Render inicial de imágenes | Aprobada |
| Tablero | Zoom acercar, alejar y ajustar | Aprobada |
| Tablero | Crear nota | Aprobada |
| Tablero | Mover tarjeta con teclado | Aprobada |
| Tablero | Arrastrar tarjeta con puntero | Aprobada |
| Tablero | Redimensionar imagen y alcanzar el mínimo | Aprobada; 150 × 184,09 px sin alterar la proporción |
| Tablero | Redimensionar con flechas y Shift + flechas | Aprobada |
| Tablero | Confirmación antes de retirar del tablero | Aprobada; diferencia tablero/biblioteca explícita |
| Tablero | Crear tablero dentro del proyecto y abrirlo | Fallida; crea el tablero pero deriva al flujo de creación de proyecto |
| Tablero | Extender con sección “Casting” | Aprobada |
| Imágenes | Selector múltiple y carga PNG | Aprobada |
| Imágenes | Primera carga en tablero vacío | M1B fallida el 8 de agosto; activo `ready`, tarjeta no persistida y versión sin cambio |
| Imágenes | Coherencia tarjeta/Referencia tras error | Fallida; la referencia pudo eliminarse porque no existía un item persistido |
| Imágenes | Imagen cargada decodifica con dimensiones válidas | Aprobada |
| Imágenes | Eliminar de Referencias y recargar | Aprobada con activo QA sin uso |
| Persistencia | Recarga conserva secciones, tarjetas e imagen | Aprobada |
| Compartir | Abrir y cerrar diálogo | Aprobada |
| Compartir | Copiar enlace | Corregida; el fallo del portapapeles produce instrucción manual |
| Responsive | 390 px sin desborde global | Aprobada |
| Responsive | 768 px con sidebar compacta | Aprobada |
| Consola | Errores o advertencias durante recorridos | Ninguno |

## Estado de Supabase

Datos observados durante el ciclo:

- 1 perfil, 1 proyecto, 1 membresía, 1 tablero y 1 sección.
- 3 elementos de tablero y 3 archivos privados.
- 0 membresías de propietario faltantes.
- 0 elementos vinculados a una sección de otro tablero.
- 0 referencias a archivos inexistentes.
- 0 archivos huérfanos.
- 7 de 7 tablas públicas con RLS.
- Bucket `board-assets` privado, límite de 50 MB.
- 4 políticas de Storage y 2 políticas de Realtime para `authenticated`.
- Los roles `anon` no pueden ejecutar los RPC de creación o guardado.
- Los roles `authenticated` sí pueden ejecutarlos.
- `create_project_with_board` usa `SECURITY DEFINER`; `save_board_snapshot`
  conserva `SECURITY INVOKER`.

## Hallazgos

### Pendiente del próximo ciclo

1. Al crear un tablero desde un proyecto existente, el backend completa la
   creación pero la navegación posterior no consume correctamente el
   identificador del nuevo tablero y deriva al flujo de creación de proyecto.
   Debe conservar el proyecto actual, abrir el tablero creado y cubrir el caso
   para evitar `board=undefined`.

### Alta prioridad (resuelta en backend v1)

1. Resuelto: guardado por operaciones atómicas, versión optimista e
   idempotencia; Realtime provoca una recarga segura.
2. Resuelto en backend: invitaciones, permisos, comentarios y enlaces
   compartidos tienen RPC/endpoints. Falta su interfaz.
3. Resuelto en backend: CRUD, duplicación, orden y archivado de múltiples
   tableros. Falta su interfaz.

### Prioridad media histórica

1. Resuelto en frontend colaborativo: los enlaces son generados por backend y
   el fallo del portapapeles ya no informa una copia exitosa.
2. Los botones Buscar, Referencias, Equipo, perfil, Más opciones y Puede
   comentar no tienen comportamiento.
3. Resuelto en frontend colaborativo: las notas pueden editarse y persistirse.
4. Si Realtime no devuelve presencia, producción puede mostrar los 3
   colaboradores ficticios del modo demo.
5. El callback añade `?error=callback`, pero la pantalla de autenticación no
   explica ese error al usuario.
6. El estado de sincronización y sus errores no usan una región `aria-live`;
   el detalle del error solo está en `title`.
7. El diálogo mueve el foco al abrir y lo restaura al cerrar, pero no contiene
   el foco dentro del modal.
8. Resuelto en la interfaz: retirar una tarjeta y eliminar su archivo son dos
   acciones explícitas. La biblioteca confirma el borrado definitivo y explica
   `ASSET_IN_USE`. Una carga múltiple parcialmente fallida aún puede dejar un
   archivo sin referencia y debe tratarse en una mejora backend posterior.

### Endurecimiento recomendado

- Añadir Content Security Policy, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` y protección contra framing.
- Ocultar `X-Powered-By`.
- Crear una suite automatizada versionada; actualmente el repositorio no tiene
  tests unitarios, de integración ni E2E.

## Cobertura pendiente

No se envió un magic link durante este ciclo para evitar generar correos reales
de prueba. Por ello requieren una última sesión manual autenticada:

- recepción y consumo del magic link;
- redimensionamiento fino con mouse/touch físico; teclado, persistencia y límites
  ya fueron aprobados;
- edición simultánea real con 2 usuarios;
- carga reanudable de un archivo mayor a 6 MB;
- comportamiento de una cuenta `viewer`.
- owner, editor, viewer y `can_comment=false` sobre el frontend nuevo;
- invitación completa, revocación y expiración con usuarios reales de prueba;
- enlace `view`, enlace `comment`, revocación y comentarios compartidos;
- edición simultánea con dos sesiones y conflicto de versión visible;
- errores de red y cuotas sobre recorridos autenticados;
- responsive y accesibilidad del workspace autenticado en los cuatro anchos.

## Criterio de salida

La implementación actual es utilizable como herramienta interna de un solo
equipo y un tablero. Antes de presentarla como producto colaborativo, deben
resolverse los 3 hallazgos de alta prioridad y añadirse pruebas E2E
repetibles.
