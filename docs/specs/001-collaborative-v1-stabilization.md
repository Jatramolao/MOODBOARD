# Spec 001 — Estabilización colaborativa v1

Estado: `draft`

Responsable: sesión de producto/planificación.

Rama: `codex/001-collaborative-v1`.

## Problema

El backend y el frontend colaborativo v1 están implementados, pero la
iteración todavía no tiene evidencia suficiente para declararse lista para
preview. Existen defectos confirmados al abrir un tablero recién creado y al
persistir la primera imagen de un tablero vacío. El segundo puede dejar un
activo listo en Referencias sin el elemento correspondiente. También faltan
recorridos reales con varios roles, dos sesiones, invitaciones, enlaces
compartidos, comentarios, errores y estados límite.

## Objetivo

Cerrar la iteración con el menor cambio de código posible, validando primero el
comportamiento existente y corrigiendo únicamente defectos reproducibles. Cada
ajuste debe permanecer en su capa, recibir una regresión y superar una prueba
manual antes de habilitar el siguiente paquete.

## Usuarios y recorridos

- Owner: administra proyecto, tableros, miembros, invitaciones y enlaces.
- Editor: edita el tablero y resuelve comentarios sin administrar miembros.
- Viewer con comentarios: revisa y comenta sin modificar el tablero.
- Viewer sin comentarios: sólo consulta.
- Invitado externo: abre enlaces `view` o `comment` según su permiso.

## Alcance incluido

1. Crear un tablero dentro del proyecto activo y abrirlo correctamente.
2. Persistir la primera imagen y mantener coherentes tablero, activo y errores.
3. Validar permisos de owner, editor, viewer y `can_comment=false`.
4. Validar invitación, aceptación, expiración y revocación.
5. Validar enlaces `view`, `comment` y revocación.
6. Validar comentarios, respuestas, resolución y autoría.
7. Validar dos sesiones, conflicto de versión y persistencia.
8. Validar errores de red, cuotas, responsive, accesibilidad y consola.
9. Preparar preview, PR, smoke test y decisión de publicación.

## Fuera de alcance

- Nuevas funciones de producto no necesarias para cerrar los recorridos v1.
- Rediseño visual general o refactor transversal.
- Merge, push, despliegue o migraciones productivas sin autorización.
- Reactivar escrituras directas o `save_board_snapshot`.
- Merge automático de edición concurrente; v1 informa el conflicto y recarga.

## Restricciones de implementación

- Ejecutar primero la reproducción manual y registrar evidencia.
- No cambiar contratos backend para resolver un defecto exclusivamente visual.
- No modificar frontend desde la sesión backend ni migraciones desde frontend.
- Una corrección, una capa y un commit acotado por defecto.
- Si un hallazgo exige otra capa, detener el paquete y crear un handoff.
- No comenzar un paquete nuevo con cambios sin commit del paquete anterior.
- Retirar una tarjeta del tablero conserva el archivo en Referencias. Eliminar
  una referencia sólo se permite después de que ningún tablero la use.

## Criterios de aceptación globales

- Todos los paquetes del plan maestro están aprobados o postergados de forma
  explícita y sin bloqueos P0/P1 abiertos.
- Los recorridos manuales tienen evidencia y resultado registrado.
- `npm run test:backend`, `npm run build` y `git diff --check` están en verde.
- La integración agrega las pruebas E2E y recorridos por rol correspondientes.
- `PROJECT_STATUS.md` y `QA_REPORT.md` reflejan sólo el estado vigente.
- Preview y producción conservan puertas de autorización independientes.

## Estrategia de salida y rollback

La estabilización usa cambios pequeños que deben poder revertirse por commit.
Las migraciones existentes son aditivas y ya fueron aplicadas; no se prevé una
migración nueva. Si una corrección requiere datos o API incompatibles, debe
volver a planificación antes de implementarse. Ante un fallo de interfaz se
revierte o corrige el commit de cliente, sin debilitar RLS ni concurrencia.

## Aprobación pendiente

Esta spec debe pasar a `approved` antes de iniciar el primer ajuste de código.
La aprobación confirma el orden y el alcance; no autoriza push, despliegue ni
creación o envío de correos reales.
