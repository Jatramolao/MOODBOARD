# Paquete 4 — Concurrencia y resiliencia

## Objetivo

Comprobar que dos sesiones no sobrescriben cambios silenciosamente y que los
errores recuperables mantienen al usuario informado y sus datos protegidos.

## Secuencia por sesión

1. **Integración:** abrir owner/editor en navegadores o perfiles separados.
2. Ejecutar edición secuencial, edición simultánea y sesión atrasada.
3. Simular red interrumpida y restaurada sin cambiar código primero.
4. Probar límites o errores con fixtures controlados; no agotar cuotas reales.
5. Enviar cada defecto a backend o frontend sólo después de aislar su capa.
6. Repetir la matriz y ejecutar prueba manual M4.

## Casos obligatorios

- Cambio de A visible en B mediante recarga segura/Reatime.
- Dos cambios sobre la misma base provocan conflicto visible.
- `VERSION_CONFLICT` bloquea nuevos cambios y recarga; no reintenta a ciegas.
- `saving`, `saved` y `error` son comprensibles y accesibles.
- Pérdida de red conserva contexto y permite recuperación controlada.
- `RATE_LIMITED`, `QUOTA_EXCEEDED` y `ASSET_IN_USE` tienen mensajes y salida.
- Recargar no resucita elementos eliminados ni mezcla proyectos.

## Límites

- No implementar merge colaborativo avanzado en v1.
- No desactivar versionado, idempotencia o RLS para hacer pasar el recorrido.
- No generar consumo o datos masivos en el entorno compartido.

## Salida

Dos sesiones aprobadas, conflicto visible y recuperable, M4 aprobado y sin
pérdida silenciosa de datos.
