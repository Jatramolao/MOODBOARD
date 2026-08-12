# Handoff de integración — ciclo 002

Fecha: 12 de agosto de 2026.

Rama: `codex/002-explicit-image-removal`.

Base frontend: `1300e2c`.

## Resultado

La entrega frontend quedó integrada con el adaptador Supabase y el contrato
versionado vigente. La eliminación completa persiste primero `item.delete` y
sólo después invoca `mark_asset_deleted`; un fallo de guardado nunca intenta
eliminar el activo y un fallo posterior conserva la referencia sin recrear la
tarjeta.

Durante integración se corrigió el texto global de `UNAUTHORIZED`: ya no
presupone que una tarjeta fue retirada. El mensaje específico de limpieza se
mantiene únicamente en el resultado parcial posterior a un guardado confirmado.

## Validación automática

- Suite backend/frontend: 34/34 aprobada.
- Suite HTTP: 3/3 aprobada contra `localhost:3001`.
- TypeScript y ESLint: aprobados.
- Build Next.js de producción: aprobado.
- `git diff --check`: aprobado.
- `npm audit --omit=dev`: 0 vulnerabilidades después de fijar la dependencia
  transitiva `nanoid` en `3.3.18`.

## QA visual local

- Diálogo abre desde una tarjeta de imagen y presenta los dos alcances y
  cancelación con nombres inequívocos.
- La alternativa no destructiva recibe el foco inicial.
- Escape cierra y devuelve el foco al disparador.
- Tab desde el último control vuelve al botón de cierre.
- Cancelar conserva las dos tarjetas observadas y no genera errores de consola.
- Sin desborde horizontal en 390, 768, 1280 y 1440 px; el diálogo mide 350 px
  en el viewport de 390 px y 560 px en los demás tamaños.

## Puerta restante

M002 no se declara aprobada todavía. Quedan los casos remotos A–E con datos
`QA-002`, incluidos owner/editor/viewer, activo con otro uso y fallo controlado
entre guardado y borrado. Esas pruebas pueden modificar o eliminar datos y se
ejecutan sólo con activos desechables preparados para la puerta manual.

Push, PR, merge y despliegue requieren autorización independiente.
