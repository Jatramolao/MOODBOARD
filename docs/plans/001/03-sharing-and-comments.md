# Paquete 3 — Compartir y comentarios

## Objetivo

Validar revisión externa sin exponer el editor, activos privados ni acciones
superiores al permiso del enlace.

## Secuencia por sesión

1. **Integración:** crear enlaces `view` y `comment`; recorrerlos antes de
   solicitar cambios.
2. **Planificación:** separar problemas de contrato, UI y configuración.
3. **Backend:** intervenir sólo ante resolución, firma, permiso o autoría
   incorrectos.
4. **Frontend:** intervenir sólo en presentación, estados y controles.
5. **Integración:** repetir enlace vigente, revocado e inválido.
6. **Usuario:** ejecutar M3 en una sesión sin acceso al editor.

## Casos obligatorios

- `view`: ver tablero e imágenes, sin compositor ni edición.
- `comment`: sesión requerida, crear comentario y respuesta.
- Autor real visible; editar/borrar sólo comentario propio.
- Owner/editor resuelve y reabre; viewer no puede hacerlo.
- Revocación invalida el enlace ya abierto después de recargar.
- Token inválido o expirado muestra pantalla final, no editor parcial.
- `assetsConfigured=false` muestra error operativo comprensible.
- Fallo de portapapeles ofrece copia manual sin falso éxito.

## Límites

- No convertir rutas privadas de Storage en URLs públicas.
- No reutilizar la vista del editor para la pantalla compartida.
- No probar datos personales ni activos reales del usuario.

## Salida

Enlaces y comentarios aprobados, activos privados protegidos, M3 aprobado y
regresiones de los defectos encontrados.
