---
meta:
  contentType: Reference
---

# Encontrar la documentación vigente

Este índice indica qué documento leer para entender el producto, ejecutar una iteración o trabajar en una capa técnica. Los documentos cerrados se consultan en Git y no permanecen en la ruta activa.

## Empezar una sesión

Lee estos documentos en orden:

1. `AGENTS.md`: reglas de coordinación, seguridad y validación
2. `docs/PROJECT_STATUS.md`: rama, fase, evidencia y próximos pasos
3. `docs/DEVELOPMENT_WORKFLOW.md`: ciclo obligatorio por iteración
4. La referencia de tu capa

## Consultar una capa

| Necesidad | Fuente vigente |
|---|---|
| Contrato de datos, permisos y funciones | `docs/BACKEND.md` |
| Integración del frontend con el dominio | `docs/FRONTEND_HANDOFF.md` |
| Variables, despliegue y recuperación | `docs/OPERATIONS.md` |
| Resultado de calidad actual | `QA_REPORT.md` |

## Continuar el ciclo activo

El ciclo 002 terminó su implementación y despliegue. Espera validación manual y cierre:

- `docs/specs/002-explicit-image-removal.md`: comportamiento acordado y criterios de aceptación
- `docs/plans/002/MANUAL_QA.md`: puerta manual M002

## Mantener la documentación

Mantén una sola fuente por tema:

- `PROJECT_STATUS.md` contiene sólo el estado vigente y los próximos pasos
- `QA_REPORT.md` contiene sólo la evidencia vigente y las puertas pendientes
- Cada capa mantiene un contrato estable, no un diario de commits
- La spec activa conserva decisiones de producto y criterios de aceptación
- Los handoffs se eliminan después de integrarse
- Las specs y planes cerrados se eliminan cuando su resultado ya está en las fuentes vigentes

Git conserva el detalle histórico. No copies incidentes cerrados a documentos activos salvo que definan una restricción permanente.
