# Plan maestro — Cierre colaborativo v1

Estado: `proposed`

Spec: `docs/specs/001-collaborative-v1-stabilization.md`.

## Estrategia de ejecución

El cierre se divide en paquetes verticales pequeños. Cada paquete sigue el
mismo orden:

```text
reproducir → clasificar por capa → corregir → probar capa → integrar
→ prueba manual del usuario → cerrar paquete
```

La prueba manual funciona como puerta real: el siguiente paquete no comienza
hasta que el resultado sea `aprobado`, `devuelto` o `postergado` por decisión
de producto.

## Orden obligatorio

| Orden | Paquete | Sesión primaria | Puerta de salida |
|---|---|---|---|
| 0 | Preparación y datos de prueba | Planificación + integración | Entorno y cuentas definidos |
| 1A | Creación y apertura de tableros | Frontend → integración | Manual M1A aprobado |
| 1B | Primera imagen y consistencia de activos | Backend/Frontend → integración | Manual M1B aprobado |
| 2 | Roles, equipo e invitaciones | Integración; backend/frontend sólo por hallazgo | Manual M2 aprobado |
| 3 | Compartir y comentarios | Integración; backend/frontend sólo por hallazgo | Manual M3 aprobado |
| 4 | Concurrencia y resiliencia | Integración | Manual M4 aprobado |
| 5 | UX final, preview y salida | Integración → despliegue | Manual M5 y smoke aprobados |

No se paralelizan paquetes que toquen `BoardProvider`, navegación, permisos o
estado compartido. La concurrencia entre sesiones sólo se permite para trabajo
de lectura o evidencias sin archivos superpuestos.

## Paquete 0 — Preparación

Antes de código:

1. Aprobar la spec y este plan.
2. Confirmar rama limpia y commits base.
3. Definir cuentas QA A/B/C/D y canales de sesión.
4. Definir un proyecto y tablero desechables, prefijados `QA-001`.
5. Confirmar si se permite generar magic links, invitaciones o correos.
6. Crear el registro de ejecución desde la plantilla del protocolo manual.

La falta de cuentas no autoriza crear usuarios o enviar correos reales.

## Reglas para minimizar cambios

- Validar antes de programar: un recorrido aprobado no genera trabajo de código.
- Corregir la causa más estrecha; no aprovechar un defecto para refactorizar.
- Congelar el contrato backend salvo evidencia de que el contrato está roto.
- Preferir regresiones sobre funciones de dominio antes que snapshots visuales.
- Agrupar por propiedad de archivo, no por persona ni por chat.
- Completar y commitear una capa antes del handoff a la siguiente.
- Repetir sólo la matriz afectada y luego la validación mínima completa.

## Clasificación y enrutamiento de hallazgos

| Hallazgo | Destino | Regla |
|---|---|---|
| Datos, RLS, RPC, cuota o código de error | Backend | Actualiza contrato y handoff antes de frontend |
| Navegación, estado, copy, permisos visibles o accesibilidad | Frontend | No altera migraciones ni consultas paralelas |
| Sólo aparece al unir capas o sesiones | Integración | Corrección acotada y regresión E2E |
| Requisito ambiguo o cambio de alcance | Planificación | Paquete detenido hasta decisión |
| Variables, callback, preview o secretos | Despliegue | Sin exponer claves ni cambiar producto |

## Evidencia requerida por paquete

- Commit base y commit final.
- Caso reproducido y resultado esperado/observado.
- Pruebas automáticas ejecutadas.
- Pasos manuales ejecutados y capturas cuando aporten valor.
- Consola y red sin errores inesperados.
- Decisión: `aprobado`, `devuelto`, `bloqueado` o `postergado`.
- Actualización de `docs/PROJECT_STATUS.md` al transferir la fase.

## Archivos de ejecución

- `01-board-creation.md`
- `01b-first-image-asset-consistency.md`
- `02-roles-and-invitations.md`
- `03-sharing-and-comments.md`
- `04-concurrency-and-resilience.md`
- `05-release-readiness.md`
- `MANUAL_QA.md`
