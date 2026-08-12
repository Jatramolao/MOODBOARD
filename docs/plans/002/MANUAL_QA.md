---
meta:
  contentType: How-to
---

# Validar manualmente la eliminación de imágenes

Esta puerta comprueba ambos alcances de eliminación, los permisos y la recuperación ante un fallo entre etapas.

## Preparación

- Usar owner o editor y datos desechables con prefijo `QA-002`.
- Crear dos tableros dentro del mismo proyecto.
- Usar imágenes sin valor que puedan eliminarse definitivamente.
- Esperar siempre el estado “Guardado” antes de recargar o cambiar de vista.
- Mantener consola y Network abiertas sin registrar tokens ni secretos.

## Registro

```text
Puerta: M002
Fecha y entorno:
Rama, commit y deployment:
Usuario/rol:
Navegador y ancho:
Resultado: aprobado | devuelto | bloqueado | postergado
Caso A, retirar sólo:
Caso B, retirar y eliminar:
Caso C, activo todavía en uso:
Caso D, cancelación y permisos:
Caso E, fallo controlado:
Consola/red:
Evidencia:
Datos QA eliminados: sí | no | parcial
```

## Caso A: retirar sólo del tablero

1. Subir una imagen QA y esperar “Guardado”.
2. Recargar y confirmar tarjeta y referencia.
3. Abrir la acción de la tarjeta.
4. Elegir “Retirar sólo del tablero”.
5. Esperar “Guardado” y recargar.
6. Abrir Referencias.

Esperado: la tarjeta no reaparece y la referencia permanece una sola vez.

## Caso B: retirar y eliminar de Referencias

1. Subir una segunda imagen QA con un único uso.
2. Abrir la acción de la tarjeta.
3. Elegir “Retirar y eliminar de Referencias”.
4. Verificar los estados de retirada y eliminación.
5. Recargar tablero y Referencias.

Esperado: no existe la tarjeta ni la referencia; no aparece error de guardado
ni una confirmación prematura.

## Caso C: imagen todavía utilizada

1. Preparar una imagen con dos elementos activos o con un uso adicional en
   otro tablero, según las capacidades vigentes.
2. Desde una de las tarjetas, elegir la eliminación completa.
3. Esperar el resultado y recargar ambos tableros y Referencias.

Esperado: la tarjeta elegida queda retirada, el otro uso permanece y la
referencia se conserva. El mensaje debe explicar el resultado parcial y
`ASSET_IN_USE`, sin afirmar que el archivo fue eliminado.

## Caso D: cancelación y permisos

1. Abrir el diálogo y cancelar con botón.
2. Repetir y cancelar con Escape.
3. Confirmar foco devuelto al control original.
4. Abrir el tablero como viewer.

Esperado: cancelar no produce guardado ni borrado; viewer no dispone de la
acción. Backend continúa rechazando cualquier intento no autorizado.

## Caso E: fallo entre etapas

1. Iniciar “Retirar y eliminar de Referencias”.
2. Interrumpir la red sólo después de que la tarjeta figure guardada y antes de
   completar el borrado del activo, usando un mecanismo de QA controlado.
3. Restaurar la red y revisar Referencias.

Esperado: la interfaz informa “tarjeta retirada, referencia conservada” y
ofrece una salida clara para reintentar desde Referencias. No reaparece la
tarjeta ni se declara eliminado el activo.

## Responsive y accesibilidad

Repetir al menos la apertura/lectura/cancelación del diálogo en 390, 768, 1280
y 1440 px. Probar Tab, Shift+Tab, Enter y Escape.

Aprobar si no hay desborde, el foco queda contenido, cada opción tiene nombre
inequívoco y los estados se anuncian sin depender sólo de color.

## Criterio de puerta

M002 se aprueba sólo si A–D pasan, E produce un resultado recuperable y no hay
errores inesperados de consola. Cualquier pérdida silenciosa, borrado de un
activo usado o mensaje falso devuelve el paquete a integración.
