---
meta:
  contentType: Reference
---

# Comprobar la calidad vigente

## Correcciones verificadas del 13 de septiembre de 2026

**Guardado, reconexión y enlaces compartidos publicados en producción.**
[Informe completo](docs/qa/2026-09-13-corrections/REPORT.md).

- Notas guardadas mientras se escribe, sin depender de blur.
- Offline real conserva el borrador y lo confirma al reconectar.
- Reintento idempotente ante confirmación perdida; conflictos no sobrescriben borradores.
- Enlaces anónimos con imágenes privadas aprobados; tableros archivados no crean enlaces engañosos.
- Owner/editor/viewer, concurrencia y zoom de sólo lectura comprobados.
- 45/45 unitarias, 7/7 HTTP autenticadas/anónimas, build y `git diff --check` aprobados.

## Testing autenticado del 12 de septiembre de 2026

**Resultado mixto: automatización aprobada; publicación no aprobada por este ciclo.** [Informe y evidencia](docs/qa/2026-09-12/REPORT.md).

- 40/40 unitarias, TypeScript, ESLint, build y 3/3 HTTP aprobados; auditoría de producción: 0 vulnerabilidades informadas.
- Tres cuentas QA creadas con autorización. 17/17 comprobaciones remotas de roles, operaciones versionadas, activos y permisos.
- 6/6 pruebas de fallo/recuperación de transporte en SDK. No sustituyen offline visual del navegador.
- Owner/editor/viewer comprobados en sesiones secuenciales; viewer sin edición ni comentarios, editor retira/reinserta sin duplicados.
- UX-01 confirmado en Supabase real: `Guardado` visible mientras un borrador sin blur se pierde al recargar.
- UX-02/03/04/05 siguen presentes en móvil/tablet. M003-E mantiene pendientes offline visual y concurrencia entre perfiles.
- Se conservan cuentas y proyecto QA aislado; detalle en el informe. Ningún cambio de producto ni despliegue.
- Ampliación al plan del usuario: proyecto y tablero creados desde UI, cambio entre proyectos en ambos sentidos, arrastre y redimensionado de imagen con persistencia exacta aprobados. Se conservan dos proyectos QA y cinco tableros.
- Correo de acceso solicitado con confirmación de envío en la interfaz; pendiente recibir/abrir el enlace. Borrado comprobado con alcance sólo del tablero, sin purgar el archivo.

Este informe registra el cierre del ciclo 002 y la validación activa del ciclo 003. Última actualización: 12 de septiembre de 2026.

## Prepublicación del 12 de septiembre

- Suite backend/frontend: 40/40 aprobada.
- Suite HTTP: 3/3 aprobada en `localhost:3000`.
- TypeScript, ESLint y build de producción: aprobados con Next.js 16.3.5.
- Dependencias de producción: 0 vulnerabilidades conocidas después de actualizar Next.js a 16.3.5 y Sharp a 0.35.4.
- `git diff --check`: aprobado.
- Los hallazgos de interacción descritos abajo continúan abiertos; este control habilita un preview de validación, no el cierre de UX ni el despliegue a producción.

## Auditoría de interacción del 10 de septiembre

Informe reproducible y capturas: [Testing de interacción](docs/qa/2026-09-10/REPORT.md).

- Regresiones actuales: 40/40; TypeScript, ESLint y build aprobados.
- HTTP: 3/3 en `localhost:3000`; variante `127.0.0.1` arroja 2/3 por diferencia del origen del callback.
- Navegador integrado: acceso público, demo local, notas, búsqueda, cancelación de retirada y tamaños 390/768/1280/1440 px.
- P1: pérdida del borrador de notas al recargar sin salir del campo; estado de guardado oculto por debajo de 900 px.
- P2: navegación sin nombres accesibles en tablet, ajuste fijo a 82%, navegación móvil incompleta y búsqueda con tarjeta parcialmente fuera de vista.
- P3: objetivos táctiles pequeños y creación de nota sin transferir foco.
- No se corrigió código de producto. Los hallazgos remotos requieren confirmación autenticada; M003-E sigue pendiente.

La evidencia histórica siguiente conserva su fecha y no sustituye esta ejecución.

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
