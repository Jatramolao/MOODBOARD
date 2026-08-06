# Paquete 1 — Creación y apertura de tableros

## Objetivo

Al crear un tablero desde un proyecto existente, conservar el proyecto activo
y abrir `/?board=<nuevo-board-id>` usando el identificador real devuelto por el
backend.

## Secuencia por sesión

1. **Integración:** reproducir desde un proyecto sin otros tableros y otro con
   varios tableros. Registrar URL, respuesta y estado antes de editar.
2. **Frontend:** corregir sólo navegación/estado si el backend devuelve un ID
   válido. Añadir regresiones para ambas variantes y `board=undefined`.
3. **Backend:** participa únicamente si la respuesta real incumple el contrato.
4. **Integración:** ejecutar suites, recarga y cambio entre tableros.
5. **Usuario:** ejecutar la prueba manual M1 y aprobar o devolver.

## Casos obligatorios

- Crear el primer tablero de un proyecto.
- Crear un tablero cuando ya existen otros.
- Abrir automáticamente el tablero creado.
- Recargar y conservar proyecto/tablero.
- Cambiar a otro tablero y regresar.
- Cancelar el diálogo sin crear recursos.
- Comprobar que la URL nunca contiene `board=undefined`.

## Límites

- No rediseñar el selector de proyectos/tableros.
- No cambiar el RPC si ya entrega `board_id` correctamente.
- No mezclar correcciones de imágenes, equipo o comentarios.

## Salida

Regresión automática, validación mínima, prueba manual M1 aprobada, commit
pequeño y `PROJECT_STATUS` actualizado.
