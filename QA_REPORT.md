---
meta:
  contentType: Reference
---

# Comprobar la calidad vigente

Este informe registra la evidencia que determina si el ciclo 002 puede publicarse. Última actualización: 12 de agosto de 2026.

## Resultado actual

La implementación, la integración automática y el deployment productivo están aprobados. La puerta manual M002 y el smoke productivo siguen pendientes.

| Área | Resultado |
|---|---|
| Suite backend y frontend | Aprobada, 34 de 34 |
| Suite HTTP | Aprobada, 3 de 3 en `localhost:3001` |
| TypeScript | Aprobado |
| ESLint | Aprobado |
| Build de producción | Aprobado |
| `git diff --check` | Aprobado al cierre de integración |
| Dependencias de producción | 0 vulnerabilidades conocidas |
| Responsive | Aprobado en 390, 768, 1280 y 1440 px |
| Diálogo con teclado y foco | Aprobado localmente |
| Puerta manual M002 | Pendiente |
| Deployment productivo | `Ready`, `dpl_GcaexVu1uX8APBxJrDudhxudJWXJ` |
| Smoke productivo del ciclo 002 | Pendiente |

## Comportamientos ya confirmados

- Crear proyectos y tableros funciona en el ciclo publicado
- Abrir un tablero nuevo usa un identificador válido y conserva el destino
- Subir la primera imagen persiste la tarjeta y la referencia
- Referencias bloquea la eliminación de activos en uso mediante `ASSET_IN_USE`
- El ciclo 002 ofrece retirada local y eliminación completa como decisiones separadas
- La eliminación completa guarda la retirada antes de solicitar el borrado del activo
- Un fallo posterior conserva la referencia y no recrea la tarjeta
- Viewer no recibe controles de eliminación

## Puerta manual pendiente

Ejecuta `docs/plans/002/MANUAL_QA.md` con activos `QA-002` desechables. La puerta cubre:

1. Retirar sólo del tablero
2. Retirar y eliminar de Referencias
3. Mantener una referencia que todavía tiene otro uso
4. Cancelar y validar permisos de viewer
5. Interrumpir la red entre el guardado y la eliminación del activo

Registra ambiente, commit, rol, resultado, consola, red y limpieza de datos. M002 pasa sólo cuando los cinco casos dejan un estado coherente después de recargar.

## Criterios para cerrar el ciclo

No marques la spec como `released` hasta cumplir estas condiciones:

- M002 aprobada
- Sin defectos P0 o P1 abiertos
- Smoke productivo aprobado
- Resultado registrado en este informe

El historial de fallos y correcciones anteriores permanece disponible en Git.
