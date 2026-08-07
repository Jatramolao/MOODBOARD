# Protocolo de pruebas manuales — Iteración 001

## Propósito

Permitir que el usuario pruebe cada paquete sin depender sólo de la suite
automática. La prueba debe realizarse después de la integración del paquete y
antes de iniciar el siguiente.

## Preparación segura

- Usar proyecto, tableros e imágenes desechables con prefijo `QA-001`.
- Separar sesiones con perfiles de navegador distintos, no sólo pestañas.
- Identidades sugeridas: A owner, B editor, C viewer con comentarios y D viewer
  sin comentarios.
- No usar datos de clientes ni activos que deban conservarse.
- No enviar emails, crear usuarios o consumir cuotas reales sin autorización.
- Abrir consola y Network; ocultar tokens, cookies y claves en las capturas.

## Registro por ejecución

Copiar este bloque en `QA_REPORT.md` o en el handoff del paquete:

```text
Paquete / puerta:
Fecha y entorno:
Rama y commit:
Usuario/rol:
Navegador y ancho:
Datos QA utilizados:
Resultado: aprobado | devuelto | bloqueado | postergado
Esperado:
Observado:
Consola/red:
Evidencia:
Hallazgos nuevos:
Datos QA eliminados al terminar: sí | no | no aplica
```

## M1A — Tableros

1. Entrar como owner a un proyecto existente.
2. Crear un tablero y confirmar que abre inmediatamente.
3. Verificar que la URL contiene un ID real.
4. Recargar; comprobar que proyecto y tablero permanecen activos.
5. Cambiar a otro tablero y volver al creado.
6. Repetir en un proyecto que no tenga otros tableros.
7. Cancelar una tercera creación y confirmar que no aparece otro tablero.

Aprobar si no aparece el flujo de crear proyecto, no existe
`board=undefined` y la recarga conserva el destino.

## M1B — Primera imagen y Referencias

1. Abrir un tablero nuevo y vacío; confirmar versión 1 y estado Guardado.
2. Subir una sola imagen QA y esperar el estado Guardado antes de navegar.
3. Recargar y confirmar que la tarjeta y la referencia siguen presentes una
   sola vez.
4. Intentar eliminar la referencia mientras la tarjeta esté activa: debe
   bloquearse con `ASSET_IN_USE` y localizar la tarjeta.
5. Retirar la tarjeta del tablero, esperar Guardado y recargar: la referencia
   debe permanecer y la tarjeta no debe reaparecer.
6. Eliminar entonces la referencia, recargar Referencias y confirmar que ya no
   aparece.
7. Repetir una carga con red interrumpida o error controlado: debe mostrarse la
   causa útil y no quedar una tarjeta falsamente guardada ni un activo huérfano.

Aprobar si cada acción tiene un único efecto, la versión sólo avanza con
operaciones persistidas y tablero/Referencias permanecen coherentes después de
cada recarga.

## M2 — Roles e invitaciones

1. A invita a B como editor, a C como viewer con comentarios y a D como viewer
   sin comentarios, usando entrega manual salvo autorización de correo.
2. Cada persona acepta desde su propia sesión.
3. B edita el tablero y resuelve un comentario; no puede gestionar equipo.
4. C comenta, pero no edita ni resuelve.
5. D sólo consulta y no ve compositor ni mutaciones.
6. A cambia un permiso, revoca una invitación pendiente y retira un miembro QA.
7. Reabrir enlaces revocados/aceptados y verificar estados finales claros.

Aprobar si UI y backend coinciden en todos los permisos y ninguna acción
prohibida funciona por URL o petición directa.

## M3 — Compartir y comentarios

1. A crea un enlace `view` y lo abre en una sesión externa.
2. Confirmar imágenes visibles y ausencia de edición/comentarios.
3. A crea un enlace `comment`; C lo abre y publica comentario y respuesta.
4. B resuelve y reabre el hilo; C intenta resolver y no puede.
5. A revoca ambos enlaces y se recargan las sesiones externas.
6. Abrir un token inválido y verificar una pantalla final segura.

Aprobar si nunca aparece el editor, las imágenes usan URLs firmadas y la
revocación corta el acceso.

## M4 — Dos sesiones y errores

1. Abrir A y B sobre el mismo tablero.
2. A mueve una tarjeta; B confirma el cambio después de la sincronización.
3. A y B editan desde la misma versión para provocar un conflicto controlado.
4. Confirmar que la sesión atrasada informa y recarga sin sobrescribir.
5. Interrumpir la red de B, intentar una acción y restaurar la conexión.
6. Recargar ambas sesiones y comparar el estado final.

Aprobar si no hay pérdida silenciosa, el conflicto es visible y el usuario
sabe si el cambio fue guardado o no.

## M5 — Experiencia final

1. Repetir el recorrido owner en 390, 768, 1280 y 1440 px.
2. Navegar sólo con teclado por auth, topbar, paneles y diálogos.
3. Confirmar foco inicial, foco contenido y restauración al cerrar modales.
4. Provocar un error controlado y escuchar/ver el estado de sincronización.
5. Revisar consola y Network durante el recorrido.
6. Confirmar que no aparecen datos demo durante cargas o cambios de proyecto.

Aprobar si no hay desborde global, controles inaccesibles, mezcla de datos ni
errores inesperados de consola.

## Manejo de un resultado devuelto

1. No avanzar al siguiente paquete.
2. Registrar un hallazgo por comportamiento, con severidad y capa probable.
3. Planificación confirma alcance y lo asigna a una sola sesión.
4. La sesión responsable agrega regresión y corrección acotada.
5. Integración repite el caso y la validación mínima.
6. El usuario repite sólo la puerta manual afectada.
