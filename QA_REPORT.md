# Informe de QA — Moodboard Editorial

Fecha: 31 de julio de 2026  
Alcance: código local, interfaz, persistencia local, producción en Vercel y
configuración activa de Supabase.

## Resumen

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
| Tablero | Redimensionar tarjeta | Revisión manual pendiente; automatización no produjo un desplazamiento fiable |
| Tablero | Confirmación antes de eliminar | El diálogo se abre; aceptación final pendiente de revisión manual |
| Tablero | Extender con sección “Casting” | Aprobada |
| Imágenes | Selector múltiple y carga PNG | Aprobada |
| Imágenes | Imagen cargada decodifica con dimensiones válidas | Aprobada |
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
8. Al eliminar una tarjeta con imagen no se elimina su objeto de Storage. Una
   carga múltiple parcialmente fallida también puede dejar archivos sin
   referencia.

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
- redimensionamiento fino con mouse/touch;
- aceptación final del borrado y persistencia remota;
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
