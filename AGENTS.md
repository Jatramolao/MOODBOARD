# Contexto operativo para agentes

Este repositorio se trabaja mediante varias sesiones de chat especializadas,
pero todas comparten el mismo workspace y el mismo historial Git. Antes de
actuar, cada sesión debe leer:

1. `docs/PROJECT_STATUS.md` — estado y responsable actual.
2. `docs/DEVELOPMENT_WORKFLOW.md` — ciclo obligatorio por iteración.
3. La referencia propia de su área:
   - backend: `docs/BACKEND.md`;
   - frontend: `docs/FRONTEND_HANDOFF.md`;
   - despliegue: `docs/OPERATIONS.md`.

## Reglas de coordinación

- Ejecutar `git status --short --branch` y `git log -5 --oneline` antes de
  editar.
- Los cambios sin commit pueden pertenecer a otra sesión: preservarlos y no
  sobrescribirlos, restaurarlos ni incluirlos en un commit propio.
- Trabajar secuencialmente por capa cuando exista superposición de archivos:
  planificación → backend → frontend → integración/QA → publicación.
- Una iteración utiliza una sola rama `codex/<numero>-<tema>` y commits
  separados por responsabilidad.
- No hacer `push`, merge a `main`, aplicar migraciones productivas ni desplegar
  producción sin autorización explícita del usuario.
- No reactivar escrituras directas ni `save_board_snapshot`; el tablero usa
  operaciones versionadas mediante `apply_board_operations`.
- No exponer claves server-only en código, logs, documentación o variables
  `NEXT_PUBLIC_*`.
- Actualizar `docs/PROJECT_STATUS.md` al terminar o transferir una fase.

## Validación mínima antes de un handoff

```bash
npm run test:backend
npm run build
git diff --check
```

La sesión de integración agrega pruebas E2E y recorridos por rol antes de que
una iteración pueda considerarse lista para producción.
