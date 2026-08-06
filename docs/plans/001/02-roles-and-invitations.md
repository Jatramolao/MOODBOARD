# Paquete 2 — Roles, equipo e invitaciones

## Objetivo

Demostrar que owner, editor, viewer y viewer sin comentarios ven y ejecutan
únicamente las acciones autorizadas, incluido el ciclo de invitaciones.

## Secuencia por sesión

1. **Integración:** preparar cuatro identidades o sesiones de prueba sin tocar
   código de producto.
2. **Integración:** recorrer primero la matriz completa y registrar fallos.
3. **Planificación:** agrupar hallazgos por capa y prioridad.
4. **Backend:** corregir sólo RLS/RPC/datos si el contrato o permiso falla.
5. **Frontend:** corregir sólo estados, controles y mensajes visibles.
6. **Integración:** repetir el rol afectado y luego toda la matriz.
7. **Usuario:** ejecutar M2 antes de pasar a enlaces compartidos.

## Matriz mínima

| Acción | Owner | Editor | Viewer + comentario | Viewer sin comentario |
|---|---:|---:|---:|---:|
| Ver proyecto/tablero | Sí | Sí | Sí | Sí |
| Editar tablero | Sí | Sí | No | No |
| Comentar | Sí | Según `can_comment` | Sí | No |
| Gestionar miembros | Sí | No | No | No |
| Crear/revocar invitación | Sí | No | No | No |
| Resolver comentario | Sí | Sí | No | No |

## Invitaciones

- Creación con rol y `can_comment`.
- Entrega manual sin Resend y copia segura del enlace.
- Sesión requerida y recuperación del destino.
- Aceptación correcta, email distinto, expiración y revocación.
- Reintento o estado comprensible si la persona ya es miembro.
- Confirmación antes de revocar y error visible si falla.

## Límites

- No enviar correos reales sin autorización.
- No crear bypasses de RLS para facilitar QA.
- No ampliar el modelo de roles durante este paquete.

## Salida

Matriz por rol aprobada, invitaciones validadas, M2 aprobado y cero
mutaciones visibles para usuarios sin permiso.
