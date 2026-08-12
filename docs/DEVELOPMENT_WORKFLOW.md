---
meta:
  contentType: How-to
---

# Ejecutar una iteración del proyecto

Este flujo coordina las sesiones de planificación, backend, frontend, integración y despliegue dentro del mismo repositorio. Cada iteración usa una rama y separa los commits por responsabilidad.

## Preparar la iteración

1. Lee `AGENTS.md`, `docs/PROJECT_STATUS.md` y la referencia de tu capa
2. Ejecuta `git status --short --branch` y `git log -5 --oneline`
3. Preserva cualquier cambio sin commit que no te pertenezca
4. Crea o continúa `codex/NNN-tema`
5. Confirma que la spec está `approved`

Una spec sigue este ciclo:

```text
draft → approved → implementation → validation → released
```

Usa `cancelled` cuando producto descarte el trabajo. Actualiza el estado de la spec al transferir cada fase.

## Implementar por capa

Ejecuta las capas en este orden cuando compartan archivos o contratos:

```text
planificación → backend → frontend → integración → publicación
```

### Planificación

Define el problema, alcance, reglas, permisos, estados límite, criterios de aceptación, prueba manual y rollback. Guarda la spec en `docs/specs/NNN-tema.md`.

### Backend

Define datos, funciones, errores, Row Level Security (RLS), límites y compatibilidad. Añade pruebas TypeScript y SQL transaccionales, actualiza `docs/BACKEND.md` y crea un commit acotado.

No apliques un cambio incompatible antes de disponer de un cliente compatible. Usa expandir, migrar y contraer cuando debas cambiar un contrato.

### Frontend

Consume `lib/backend/client.ts` y los mapeadores existentes. Cubre carga, vacío, error, permisos, red, conflicto, accesibilidad y responsive.

No inventes consultas paralelas ni modifiques una migración para resolver un problema visual. Devuelve a backend cualquier incompatibilidad demostrada.

### Integración

Prueba autenticación, proyectos, tableros, activos, roles, invitaciones, enlaces compartidos, comentarios, concurrencia, red, responsive y accesibilidad. Añade una regresión por defecto corregido.

Actualiza `QA_REPORT.md` y `docs/PROJECT_STATUS.md`. Elimina los handoffs transitorios cuando la información vigente ya esté consolidada.

## Validar una entrega

Ejecuta como mínimo:

```bash
npm run test:backend
npm run build
git diff --check
```

Integración añade las pruebas HTTP, end-to-end (E2E), recorridos por rol y la puerta manual definida en la spec.

## Publicar una iteración

1. Obtén autorización para publicar la rama
2. Construye y valida el preview
3. Crea una pull request con spec, resultados, riesgos y rollback
4. Obtén autorización para merge y despliegue
5. Confirma variables y migraciones
6. Despliega y ejecuta el smoke productivo
7. Marca la spec como `released`
8. Reduce `PROJECT_STATUS.md` al nuevo estado vigente

Una autorización no implica la siguiente. Push, pull request, merge, migraciones productivas y despliegue conservan puertas separadas.

## Cerrar la documentación

Al cerrar una iteración:

- Conserva la spec liberada hasta iniciar el siguiente ciclo
- Conserva sólo la puerta manual activa
- Integra decisiones permanentes en los contratos de capa
- Elimina planes ejecutados y handoffs integrados
- Elimina incidentes cerrados de `PROJECT_STATUS.md` y `QA_REPORT.md`
- Usa Git para consultar el historial

Una iteración termina cuando cumple sus criterios, pasa integración, documenta su resultado y recibe una decisión de publicación o postergación.
