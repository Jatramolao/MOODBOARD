---
meta:
  contentType: How-to
---

# Implementar la biblioteca reutilizable de referencias

Estado: `in_progress`

Spec: `docs/specs/003-reference-library-reuse.md`

Prerequisito cumplido: M002 aprobada y ciclo 002 cerrado

Este plan ordena backend, frontend e integración para habilitar miniaturas y reutilización entre tableros con el menor cambio transversal. Cada paquete funcional termina con una prueba manual antes de habilitar el siguiente.

## Consultar el estado de ejecución

| Paquete | Estado | Responsable |
|---|---|---|
| 0, cierre y aprobación | Completado | Planificación e integración |
| 1, contrato backend | Completado y validado en Supabase | Backend/operaciones |
| 2, biblioteca y miniaturas | Implementado localmente; M003-A pendiente | Integración |
| 3, reinserción entre tableros | Implementado localmente; M003-B/C pendiente | Integración |
| 4, usos y eliminación | Implementado localmente; M003-D/E pendiente | Integración |
| 5, publicación | Pendiente | Integración y despliegue |

## Mantener el orden de trabajo

Usa una sola rama cuando producto apruebe la spec:

```text
codex/003-reference-library-reuse
```

Ejecuta las capas en este orden:

```text
auditoría → backend → frontend → integración → pruebas manuales → publicación
```

El ciclo 002 está cerrado. No mezcles correcciones históricas con este trabajo.

## Paquete 0: cerrar el ciclo anterior

Responsable: planificación e integración.

1. M002 ejecutada en producción
2. Resultado productivo registrado
3. Ciclo 002 cerrado por aprobación de producto
4. Spec 003 y plan aprobados
5. Rama `codex/003-reference-library-reuse` creada

Puerta: aprobada el 12 de agosto de 2026.

## Paquete 1: ampliar el contrato backend

Responsable: backend.

1. Auditar si existen duplicados activos por `board_id` y `asset_id`
2. Preparar una migración hacia delante
3. Cambiar el tablero del activo a origen informativo con `ON DELETE SET NULL`
4. Validar pertenencia por proyecto en el trigger de `board_items`
5. Añadir protección contra duplicados activos por tablero
6. Exponer una consulta de usos activos
7. Añadir `ASSET_ALREADY_ON_BOARD` a errores y tipos
8. Ampliar pruebas SQL y TypeScript
9. Actualizar `docs/BACKEND.md` y el handoff frontend

Pruebas backend obligatorias:

- Reutilización en dos tableros del mismo proyecto
- Rechazo de un activo de otro proyecto
- Rechazo de ruta distinta al activo
- Reintento o duplicado en el mismo tablero
- `ASSET_IN_USE` con usos en uno y dos tableros
- Eliminación permitida después de retirar todos los usos
- RLS para owner, editor y viewer

Puerta técnica: pruebas backend y SQL aprobadas. No requiere una prueba manual de interfaz.

Estado del 13 de agosto de 2026: implementación `8290002`, preflight con 3 usos
activos y 0 duplicados, migración aplicada y prueba transaccional aprobada con
`backend_v1 QA passed`. La puerta técnica está completa.

### Entregar el handoff frontend

El handoff backend debe registrar:

- Migración y commit backend
- Auditoría de duplicados y decisión aplicada
- Forma de la consulta de usos
- Forma de activos con URL firmada o método para obtenerla
- Semántica de `originBoardId`
- Código `ASSET_ALREADY_ON_BOARD`
- Permisos de owner, editor y viewer
- Pruebas aprobadas
- Migración productiva pendiente de autorización

Frontend no modifica migraciones, triggers ni políticas durante esta fase.

## Paquete 2: mostrar la biblioteca real

Responsable: frontend e integración.

1. Firmar rutas en lote dentro de la capa de datos
2. Mostrar miniaturas para activos sin tarjeta en el tablero actual
3. Regenerar URLs al recargar o vencer
4. Cubrir carga, vacío, error y URL no disponible
5. Mantener viewer en sólo lectura
6. Añadir pruebas del mapeador y firmado

Puerta manual M003-A:

- Retirar una tarjeta
- Abrir Referencias
- Confirmar miniatura, metadatos y persistencia después de recargar
- Repetir como viewer

No avances al paquete 3 si una referencia lista pierde su miniatura o expone una URL pública.

Estado local: implementado en `2b131b3`. La migración expansiva está validada;
M003-A queda habilitada para integración.

## Paquete 3: reutilizar en tableros

Responsable: frontend e integración.

1. Añadir **Añadir al tablero** para owner y editor
2. Crear la tarjeta mediante `apply_board_operations`
3. Colocarla dentro de una sección visible
4. Cambiar a **Ver en el tablero** cuando ya existe un uso local
5. Tratar conflicto de versión y `ASSET_ALREADY_ON_BOARD`
6. Invalidar tablero, Referencias y usos después de guardar

Puerta manual M003-B:

- Retirar y reinsertar una referencia en el mismo tablero
- Confirmar un activo, un objeto y una tarjeta activa
- Reintentar y comprobar que no aparece un duplicado

Puerta manual M003-C:

- Abrir otro tablero del mismo proyecto
- Añadir la misma referencia
- Recargar ambos tableros
- Confirmar un uso en cada tablero

Estado local: implementación completada en `2b131b3`; puertas M003-B/C pendientes.

## Paquete 4: localizar usos y proteger eliminación

Responsable: frontend e integración.

1. Mostrar cantidad y lista de tableros que usan cada activo
2. Permitir abrir el tablero y enfocar la tarjeta cuando corresponda
3. Mantener `ASSET_IN_USE` como autoridad final
4. Refrescar usos después de retirar o añadir
5. Cubrir red interrumpida, permisos y respuestas tardías

Puerta manual M003-D:

- Intentar eliminar una referencia con dos usos
- Confirmar bloqueo y localización de ambos tableros
- Retirar un uso y confirmar que el otro conserva el bloqueo
- Retirar el último uso y eliminar la referencia

Puerta manual M003-E:

- Validar owner, editor y viewer
- Interrumpir la red durante firmado y guardado
- Recargar y confirmar un estado coherente

Estado local: implementación completada en `2b131b3`; puertas M003-D/E pendientes.

## Paquete 5: integrar y publicar

Responsable: integración y despliegue.

1. Ejecutar la matriz completa M003
2. Revisar consola, red, teclado y responsive
3. Ejecutar pruebas backend, frontend, HTTP y build
4. Actualizar QA, estado y contratos
5. Solicitar autorización para push y preview
6. Ejecutar smoke de preview
7. Solicitar autorización para migración productiva, merge y despliegue
8. Ejecutar smoke productivo
9. Marcar la spec 003 como `released`

Validación mínima:

```bash
npm run test:backend
npm run build
git diff --check
```

Integración añade pruebas HTTP y end-to-end (E2E) para los recorridos nuevos.

## Separar commits y handoffs

Usa commits separados:

```text
feat(backend): enable project asset reuse
feat(frontend): add reusable reference library
fix(integration): harden asset reuse flows
docs: close reference library cycle
```

Elimina los handoffs después de consolidar su información en los contratos estables. No publiques archivos de otra sesión ni datos QA.
