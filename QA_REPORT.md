---
meta:
  contentType: Reference
---

# Comprobar la calidad vigente

Este informe registra el cierre del ciclo 002 y la validación activa del ciclo 003. Última actualización: 13 de agosto de 2026.

## Integración local del ciclo 003

| Verificación | Resultado |
|---|---|
| Preflight productivo | Aprobado: 3 usos activos, 0 grupos duplicados |
| Migración `202608120001` | Aplicada correctamente en Supabase |
| Suite SQL transaccional | Aprobada: `backend_v1 QA passed` |
| Suite backend/frontend posterior | Aprobada, 40 de 40 |
| Suite HTTP posterior | Aprobada, 3 de 3 en `localhost:3000` |
| TypeScript, ESLint y build | Aprobados |
| Dependencias de producción | 0 vulnerabilidades conocidas |
| `git diff --check` | Aprobado |
| Datos QA de la suite SQL | Ninguno persistido; terminó en rollback |

La integración corrigió un contador engañoso: una biblioteca vacía ahora
muestra `0 KB`, no `1 KB`. La primera miniatura visible también se carga de
forma prioritaria para evitar el aviso LCP de Next.js.

## Ejecución manual M003

| Puerta | Resultado local |
|---|---|
| M003-A, miniaturas privadas | Aprobada como owner: persiste tras retirar y recargar; URL firmada, no pública |
| M003-B, reinserción | Aprobada: enfoca la tarjeta y conserva una sola tarjeta después de recargar |
| M003-C, dos tableros | Aprobada: un activo y dos usos, sin copiar el objeto |
| M003-D, usos y eliminación | Aprobada: localiza ambos tableros, conserva ante `ASSET_IN_USE` y elimina después del último uso |
| Responsive | Aprobado con cuatro tarjetas en 390, 768, 1280 y 1440 px, sin desborde horizontal |
| Consola | Sin errores de aplicación en el recorrido aislado |
| Datos QA | Activos y tarjetas eliminados; permanece el proyecto vacío `QA-003 Integración` con dos tableros |

M003-E queda parcial: owner y los estados de recuperación de dominio fueron
verificados; los recorridos manuales en perfiles separados de editor/viewer y
la interrupción controlada de red siguen pendientes. Permisos y conflictos sí
están cubiertos por la suite SQL y las regresiones TypeScript. El smoke del
preview conserva su puerta independiente.

## Cierre manual del ciclo 002

Producto aprobó M002 después de probar el flujo desplegado en producción.

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
| M002-A, retirar sólo | Aprobada en producción |
| M002-B, retirar y eliminar | Aprobada en producción |
| Uso activo, permisos y fallos | Cubiertos por regresiones y QA local |
| Deployment productivo | `Ready`, `dpl_GcaexVu1uX8APBxJrDudhxudJWXJ` |
| Decisión de producto | Ciclo aprobado y cerrado |

## Comportamientos ya confirmados

- Crear proyectos y tableros funciona en el ciclo publicado
- Abrir un tablero nuevo usa un identificador válido y conserva el destino
- Subir la primera imagen persiste la tarjeta y la referencia
- Referencias bloquea la eliminación de activos en uso mediante `ASSET_IN_USE`
- El ciclo 002 ofrece retirada local y eliminación completa como decisiones separadas
- La eliminación completa guarda la retirada antes de solicitar el borrado del activo
- Un fallo posterior conserva la referencia y no recrea la tarjeta
- Viewer no recibe controles de eliminación

## Evidencia manual registrada

La ejecución productiva confirmó:

1. Subir una imagen y elegir **Retirar sólo del tablero** conserva la referencia
2. Subir otra imagen y elegir **Retirar y eliminar de Referencias** elimina ambos registros visibles

No se informó un error de guardado ni un registro residual. Producto autorizó avanzar al ciclo siguiente.

## Línea base del ciclo 003

El ciclo 003 parte con esta línea base:

- Suite backend y frontend: 34 de 34 aprobada
- Suite HTTP: 3 de 3 aprobada
- TypeScript, ESLint y build: aprobados
- Sin defectos P0 o P1 abiertos del ciclo 002
- M003-A a M003-D aprobadas localmente; M003-E manual pendiente en perfiles separados

El historial detallado del ciclo 002 permanece disponible en Git.
