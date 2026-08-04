# Ciclo de desarrollo e integración

Esta guía es la referencia común para todas las sesiones del proyecto. Una
fase terminada debe dejar código verificable, documentación suficiente y un
handoff concreto para la fase siguiente.

## Principio de trabajo

Las sesiones están separadas por responsabilidad, no por repositorio. Todas
trabajan sobre el mismo workspace y una misma rama por iteración. El orden
normal es:

```text
spec → backend → pruebas backend → frontend → integración/E2E → preview → producción
```

Backend y frontend pueden tener commits independientes, pero una funcionalidad
queda terminada sólo después de validar el recorrido integrado.

## 1. Planificación y spec

Responsable: sesión de producto/planificación.

Debe definir:

- problema, objetivo e historias de usuario;
- alcance incluido y excluido;
- flujos, roles y permisos;
- reglas de negocio y estados límite;
- cambios de datos/API/UI;
- criterios de aceptación y pruebas;
- estrategia de despliegue y rollback cuando corresponda.

La spec se guarda como `docs/specs/NNN-nombre.md` y comienza con estado
`draft`. Pasa a `approved` antes de implementar.

## 2. Preparación Git

Al comenzar una iteración:

```bash
git status --short --branch
git log -5 --oneline
git switch -c codex/NNN-nombre
```

Si la rama ya existe, todas las sesiones continúan en ella. No crear una rama
por chat. Los commits sí se separan por capa:

```text
feat(backend): ...
test(backend): ...
feat(frontend): ...
fix(integration): ...
docs: ...
```

## 3. Implementación backend

Responsable: sesión backend.

Secuencia:

1. Leer spec, estado del proyecto y contrato vigente.
2. Diseñar migración, RPC/endpoints, tipos, permisos, errores y límites.
3. Mantener compatibilidad con el frontend vigente cuando sea posible.
4. Implementar RLS y seguridad junto con la funcionalidad.
5. Añadir pruebas unitarias y SQL transaccionales.
6. Ejecutar validación mínima y corregir hasta quedar en verde.
7. Actualizar `docs/BACKEND.md`, operaciones y handoff de frontend.
8. Crear un commit local acotado.

No aplicar una migración incompatible en producción antes de que exista un
cliente compatible. Para cambios incompatibles usar el patrón
expandir → migrar → contraer en iteraciones separadas.

## 4. Handoff backend → frontend

El handoff debe indicar:

- commit base;
- spec y contratos relevantes;
- métodos y endpoints disponibles;
- forma de datos y mapeadores;
- roles y permisos;
- códigos de error y comportamiento esperado;
- variables nuevas;
- pruebas aprobadas;
- asuntos deliberadamente pendientes.

La sesión de frontend verifica antes de editar:

```bash
git status --short --branch
git log -5 --oneline
npm run test:backend
```

## 5. Implementación frontend

Responsable: sesión frontend.

Secuencia:

1. Leer spec, `PROJECT_STATUS` y `FRONTEND_HANDOFF`.
2. Confirmar el contrato existente; no inventar consultas paralelas.
3. Implementar flujos, componentes y mapeadores.
4. Cubrir loading, vacío, error, permisos, offline y conflictos.
5. Validar owner/editor/viewer y accesibilidad.
6. Revisar responsive en 390, 768, 1280 y 1440 px.
7. Ejecutar pruebas y build completos.
8. Crear un commit separado del backend.

Si necesita cambiar un contrato backend, debe detener esa parte, documentar la
incompatibilidad y devolverla a la sesión backend; no modificar silenciosamente
la migración o la política RLS.

## 6. Integración y QA

Responsable: sesión de integración/QA.

Debe probar como mínimo:

- autenticación y recuperación de destino;
- proyectos y múltiples tableros;
- imágenes privadas y compartidas;
- persistencia y recarga;
- dos sesiones editando el mismo tablero;
- owner, editor, viewer y `can_comment=false`;
- invitación, aceptación, expiración y revocación;
- enlace `view`, enlace `comment` y revocación;
- comentarios, respuestas y resolución;
- errores de red, conflicto de versión y cuotas;
- consola, accesibilidad y responsive.

Cada corrección recibe un commit pequeño. Después de corregir se repite la
ronda afectada y la validación mínima completa.

## 7. Preview y pull request

Cuando la integración está verde:

1. El usuario autoriza el `push` de la rama.
2. Vercel construye un preview.
3. Se crea una PR hacia `main` con:
   - resumen y spec;
   - migraciones y variables;
   - resultados de pruebas;
   - capturas o recorrido visual;
   - riesgos y rollback.
4. Se ejecuta un smoke test en el preview.

Un push de respaldo puede hacerse antes, con autorización, pero no equivale a
aprobar producción.

## 8. Producción

Orden de salida:

1. Confirmar variables y secretos.
2. Confirmar backup/rollback de datos.
3. Aplicar migraciones compatibles.
4. Fusionar la PR a `main`.
5. Esperar el despliegue Vercel.
6. Ejecutar smoke tests productivos.
7. Revisar logs de Vercel y Supabase.
8. Marcar la spec como `released` y actualizar `PROJECT_STATUS`.

## Checklist de iteración

```text
[ ] Spec aprobada
[ ] Rama de iteración creada/verificada
[ ] Contrato backend definido
[ ] Backend implementado y probado
[ ] Handoff frontend actualizado
[ ] Frontend implementado y probado
[ ] Integración E2E aprobada
[ ] Preview validado
[ ] PR aprobada
[ ] Variables y migraciones confirmadas
[ ] Producción desplegada
[ ] Smoke test aprobado
[ ] Spec y estado del proyecto actualizados
```

## Condición de “terminado”

Una tarea no está terminada sólo porque compila o porque una capa está lista.
Está terminada cuando cumple sus criterios de aceptación, pasa pruebas de capa
e integración, está documentada y cuenta con una decisión explícita de
publicación o postergación.
