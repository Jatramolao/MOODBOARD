# Paquete 5 — UX final, preview y salida

## Objetivo

Cerrar accesibilidad, responsive, documentación y evidencia antes de solicitar
autorización para publicar la rama y construir un preview.

## Secuencia por sesión

1. **Integración:** recorrer workspace autenticado en 390, 768, 1280 y 1440 px.
2. Revisar teclado, foco, etiquetas, `aria-live`, consola y solicitudes fallidas.
3. **Frontend:** corregir sólo defectos P0/P1 reproducibles; los cosméticos P2
   se registran para otra iteración salvo decisión de producto.
4. **Integración:** ejecutar E2E completo y validación mínima.
5. **Planificación:** depurar `QA_REPORT`, cerrar/postergar hallazgos y aprobar M5.
6. **Usuario:** autorizar de forma separada el push.
7. **Despliegue:** configurar Preview, construirlo y ejecutar smoke tests.
8. **Usuario:** decidir PR/producción; ninguna aprobación anterior la implica.

## Lista previa al push

- Spec en `approved` y paquetes 1–5 cerrados.
- Sin cambios sin commit ni archivos de otra sesión incluidos.
- E2E multirol y manuales M1–M5 aprobados.
- `npm run test:backend`, `npm run build` y `git diff --check` aprobados.
- Variables Preview confirmadas sin exponer secretos.
- Migraciones aplicadas y rollback documentado.
- `PROJECT_STATUS` y `QA_REPORT` vigentes y coherentes.

## Smoke de preview

- Auth y callback con destino seguro.
- Crear proyecto/tablero y recargar.
- Cargar/ver una imagen desechable.
- Invitación o entrega manual según configuración.
- Share `view` y `comment`.
- Consola, logs y `x-request-id` ante un error controlado.

## Salida

Preview aprobado o devuelto con evidencia. La PR y producción requieren nuevas
decisiones explícitas y no forman parte automática de este paquete.
