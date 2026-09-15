---
meta:
  contentType: How-to
---

# Validar manualmente la biblioteca de referencias

Esta puerta comprueba miniaturas privadas, reutilización entre tableros, prevención de duplicados y eliminación protegida.

## Preparar datos seguros

- Usa un proyecto desechable con prefijo `QA-003`
- Crea dos tableros: `QA-003-A` y `QA-003-B`
- Usa una imagen sin valor que pueda eliminarse
- Separa owner, editor y viewer en perfiles de navegador distintos
- Abre consola y red sin registrar tokens ni claves
- Espera **Guardado** antes de cambiar de tablero

## Registrar la ejecución

```text
Puerta: M003
Fecha y entorno:
Rama, commit y deployment:
Roles utilizados:
Navegadores y anchos:
M003-A, miniaturas:
M003-B, reinserción:
M003-C, uso entre tableros:
M003-D, usos y eliminación:
M003-E, permisos y recuperación:
Consola y red:
Resultado: aprobado | devuelto | bloqueado | postergado
Datos QA eliminados: sí | no | parcial
```

## M003-A: conservar miniaturas

1. Sube una imagen en `QA-003-A`
2. Espera **Guardado** y abre Referencias
3. Confirma miniatura, nombre, tamaño y fecha
4. Retira la tarjeta del tablero
5. Recarga Referencias
6. Repite la consulta como viewer

Esperado: la miniatura permanece, la URL no es pública y viewer no recibe acciones de mutación.

## M003-B: reinsertar sin duplicar

1. Como editor, pulsa **Añadir al tablero** desde Referencias
2. Espera **Guardado** y abre el tablero
3. Confirma que la tarjeta está visible y enfocada
4. Recarga tablero y Referencias
5. Intenta añadir otra vez

Esperado: existe un activo, un objeto de Storage y una tarjeta activa. El segundo intento muestra **Ver en el tablero** o reutiliza el uso existente.

## M003-C: reutilizar entre tableros

1. Abre `QA-003-B`
2. Añade la misma referencia
3. Espera **Guardado** y recarga
4. Vuelve a `QA-003-A`
5. Confirma que su tarjeta permanece
6. Revisa la cantidad de tableros en Referencias

Esperado: ambos tableros muestran la misma imagen sin duplicar el activo ni el archivo.

## M003-D: localizar usos y eliminar

1. Intenta eliminar la referencia con dos usos activos
2. Confirma el bloqueo y la lista de ambos tableros
3. Abre cada tablero desde la lista de usos
4. Retira la tarjeta de `QA-003-A`
5. Confirma que `QA-003-B` mantiene el bloqueo
6. Retira la última tarjeta
7. Elimina la referencia y recarga

Esperado: la referencia sólo desaparece después de retirar ambos usos.

## M003-E: validar permisos y recuperación

1. Confirma que owner y editor pueden añadir
2. Confirma que viewer sólo puede consultar
3. Interrumpe la red antes de firmar miniaturas
4. Restaura la red y recarga Referencias
5. Interrumpe la red durante **Añadir al tablero**
6. Restaura la red y recarga el tablero

Esperado: la interfaz distingue error de miniatura y error de guardado. La recarga no crea duplicados ni tarjetas falsamente guardadas.

## Revisar responsive y accesibilidad

Repite navegación, miniatura, acción y estado de uso en 390, 768, 1280 y 1440 px. Prueba Tab, Shift+Tab, Enter y Escape.

Esperado: no existe desborde horizontal, el foco permanece visible y cada acción tiene un nombre inequívoco.

## Aprobar la puerta

M003 pasa cuando A a E dejan el mismo estado en interfaz, base de datos y Storage después de recargar. Devuelve el ciclo ante duplicados, acceso entre proyectos, URLs públicas, pérdida silenciosa o mensajes falsos.
