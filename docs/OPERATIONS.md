# Operación y despliegue

## Variables

Cliente, obligatorias:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
```

Servidor:

```text
SUPABASE_SERVICE_ROLE_KEY  firma imágenes compartidas y mantenimiento
CRON_SECRET                autentica /api/cron/maintenance
RESEND_API_KEY             opcional, entrega emails de invitación
EMAIL_FROM                 opcional, remitente verificado en Resend
```

Ninguna variable server-only puede usar el prefijo `NEXT_PUBLIC_`.

## Orden de despliegue

1. Aplicar migraciones Supabase en orden.
2. Ejecutar `supabase/tests/backend_v1.sql` y confirmar
   `backend_v1 QA passed`.
3. Configurar variables Vercel en Production y Preview.
4. Desplegar Next.js.
5. Verificar callbacks de Auth y `NEXT_PUBLIC_SITE_URL`.
6. Ejecutar smoke tests autenticados.

## Mantenimiento

Vercel invoca diariamente `/api/cron/maintenance` a las 04:17 UTC. La ruta:

- marca invitaciones vencidas;
- elimina eventos de rate limit mayores a 24 horas;
- elimina objetos de cargas fallidas, incompletas o marcadas como borradas.

El cron procesa hasta 500 activos por ejecución. Repetir es seguro.

## Observabilidad

- Toda API Next.js entrega `x-request-id`.
- `activity_events` conserva acciones relevantes por proyecto.
- Errores de dominio son estables y no deben parsearse por texto salvo
  `VERSION_CONFLICT:<version>`.
- Para incidentes, correlacionar hora, usuario, proyecto, `x-request-id` y logs
  de Vercel/Supabase sin copiar tokens o claves.

## Verificación local

```bash
npm run test:backend
npm run build
npm audit --omit=dev
```

## Recuperación

La migración v1 es aditiva salvo el endurecimiento de permisos. Ante un fallo
de interfaz, corregir el cliente; no reactivar escrituras directas ni
`save_board_snapshot`, porque eso elimina el control de concurrencia.
