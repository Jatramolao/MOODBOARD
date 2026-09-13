# Correcciones de guardado, enlaces y reconexión

## Alcance

Trabajo local autorizado por producto: corregir funciones existentes, sin agregar
funcionalidades. Rama `codex/003-reference-library-reuse`, base `df04e51`.
Push de la rama autorizado el 13 de septiembre; publicación de Git en curso.
No se autorizó merge, despliegue productivo ni migración productiva en esta fase.
Se preservaron los cambios documentales previos de la sesión QA del 12 de septiembre.

## Causas y correcciones

- La página inicial podía abrir tableros archivados. El RPC de guardado los rechaza;
  el de resolución pública no devuelve contenido. La selección ahora exige tablero
  y proyecto activos. Un ID archivado vuelve al inicio, no a crear un proyecto.
- Crear enlaces no comprobaba el estado activo. El endpoint ahora lo verifica antes
  del RPC y valida la respuesta. El enlace utiliza el origen donde se está probando.
- La pantalla pública atribuía cualquier ausencia a revocación. Ahora informa que
  el enlace o tablero no están disponibles, incluyendo la posibilidad de archivado.
  No se restauró ni alteró el tablero real del enlace reportado.
- Las notas sólo actualizaban el tablero al perder foco. Ahora el texto controlado
  actualiza el estado al escribir y las flechas dentro del campo no mueven la tarjeta.
- Una recarga remota podía reemplazar cambios pendientes y modificar la base de
  versiones. Se impide mientras hay cambios o escrituras; también se verifica al
  terminar la lectura asíncrona, antes de aceptar su resultado.
- Un reintento generaba otra identidad aunque la respuesta se hubiera perdido después
  de guardar. Se conserva lote, versión base e identidad hasta confirmar; después se
  calcula el delta para las ediciones siguientes. Rechazos permanentes no se reutilizan.
- Los fallos de transporte se reconocen y reintentan sin retirar cargas pendientes.
  Los conflictos conservan el borrador y mantienen la pausa segura, sin sobrescrituras.
- El indicador distingue cambios pendientes de cambios confirmados y no se oculta en
  móvil/tablet. El error tiene explicación visible; el conflicto dice «Edición pausada».
- Viewer no ejecuta guardados por cambios de zoom y conserva actualizaciones remotas.

## Evidencia ejecutada

- Pruebas unitarias: **45/45**, TypeScript y ESLint aprobados.
- HTTP autenticado y anónimo: **7/7**, sin casos omitidos en la ejecución con datos QA.
- Build de producción y `git diff --check`: aprobados.
- Navegador: nota modificada sin quitar foco; lectura independiente de Supabase
  confirmó el texto. Una recarga conservó el contenido.
- Móvil 390 × 844: «Guardado» visible; ancho de documento y de scroll de 390 px.
- Chrome DevTools, «Sin conexión»: la edición quedó local y Supabase conservó el
  contenido anterior. Al volver a «No hay limitación», pasó a «Guardado» y una lectura
  independiente confirmó el borrador offline en Supabase.
- Owner en Chrome y editor en el navegador integrado, con sesiones independientes:
  ambos mostraron «Guardando…» al editar. Owner confirmó la versión; editor mostró el
  conflicto y conservó su texto distinto como párrafo visible. Supabase mantuvo la
  versión owner. El botón existente de recarga recuperó la versión remota.
- Vista compartida creada desde la UI: abrió nota e imagen privada en sólo lectura.
  La prueba HTTP adicional resolvió el enlace sin cookies y descargó su imagen firmada.
- Tablero QA archivado: crear enlace respondió 404 y abrir su ID redirigió al inicio.
- Viewer: crear acceso respondió 403. Zoom visual 82% → 92% no alteró la versión
  guardada (12) ni el zoom remoto (0.82), ni produjo error de guardado.
- Respuesta perdida después de aplicar el RPC: el reintento conservó la identidad y
  la versión aumentó sólo una vez. El zoom del tablero QA se restauró al terminar.

## Datos y límites

Se usaron únicamente las cuentas y el proyecto QA autorizados. Las pruebas de archivo
conservan tableros QA vacíos archivados; no se eliminaron datos reales. Los enlaces
temporales de esta ejecución se revocaron. El helper de autenticación es temporal,
externo al repositorio, y se detuvo al terminar; no hay rutas de acceso QA en la app.

Offline conserva cambios en la pestaña abierta y los envía al reconectar. No se añadió
persistencia offline tras cerrar la pestaña. Ante conflicto real no hay fusión automática:
el texto permanece visible para copiarlo antes de recargar.

## Repetir y publicar

`npm run test:backend`, `npm run build` y `git diff --check` ejecutan las puertas locales.
Las pruebas HTTP se ejecutan con `npm run test:integration`; los casos autenticados
requieren `TEST_QA_STATE_PATH` apuntando al archivo privado de las cuentas QA y las
variables Supabase del entorno local. Sin esos datos se omiten explícitamente.

Merge a `main` y publicación productiva pendientes de autorización independiente.
Después del despliegue debe
realizarse smoke en el dominio público y generar un enlace nuevo de un tablero activo
antes de entregarlo al fotógrafo. Otros hallazgos de navegación de la auditoría anterior
no se cierran mediante estas correcciones.
