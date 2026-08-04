# Moodboard Editorial

Prototipo funcional de un espacio visual colaborativo para proyectos de
fotografía, video y editorial. Cada tablero comienza como un lienzo continuo y
puede extenderse con secciones para disciplinas como Fotografía, Makeup,
Styling o Dirección de arte.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Funcionalidad incluida

- Lienzo horizontal continuo con zoom y desplazamiento.
- Tarjetas arrastrables entre secciones.
- Redimensionamiento de imágenes, notas y paletas.
- Carga de imágenes por selector o drag-and-drop.
- Creación dinámica de extensiones disciplinares.
- Persistencia local versionada cuando no hay backend configurado.
- Acceso passwordless por email con sesión SSR.
- Proyectos y tableros persistidos en PostgreSQL.
- Roles `owner`, `editor` y `viewer` protegidos con Row Level Security.
- Imágenes privadas con URL firmada y carga reanudable para archivos grandes.
- Presencia de colaboradores y actualización del tablero mediante canales
  privados de Realtime.
- Guardado colaborativo versionado, atómico e idempotente.
- Múltiples tableros con duplicación, orden y archivado.
- Invitaciones, permisos de comentario y enlaces compartidos revocables.
- Comentarios anclados, actividad, notificaciones y mantenimiento programado.
- Vista de compartir y controles accesibles.
- Diseño responsive para revisión desde pantallas pequeñas.

## Arquitectura de despliegue

El proyecto usa Next.js App Router y está preparado para despliegue directo en
Vercel. No necesita configuración especial: Vercel detectará el framework y
ejecutará `npm run build`.

La capa de estado está separada de la interfaz en `BoardProvider`. Si las
variables de Supabase no existen, la app arranca automáticamente en modo demo;
si existen, exige una sesión y utiliza el adaptador remoto.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta en orden las migraciones de `supabase/migrations` desde SQL Editor
   o con `supabase db push`.
3. Ejecuta `supabase/tests/backend_v1.sql`; debe devolver
   `backend_v1 QA passed`.
4. Copia `.env.example` como `.env.local` y agrega las variables.
5. En Authentication → URL Configuration agrega:
   - `http://localhost:3000/auth/callback`
   - `https://TU-DOMINIO.vercel.app/auth/callback`
6. Reinicia `npm run dev`. El primer usuario podrá crear su proyecto inicial
   desde la propia interfaz.

La migración crea tablas, índices, funciones transaccionales, políticas RLS,
bucket privado y autorización de canales Realtime. No utiliza una
`service_role` en el cliente.

## Desplegar en Vercel

Importa el repositorio en Vercel y configura en Production y Preview:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

`RESEND_API_KEY` y `EMAIL_FROM` son opcionales. Sin ellos, las invitaciones
devuelven un enlace manual para copiar.

Después de desplegar, agrega también la URL real de callback en Supabase. El
comando de compilación es `npm run build`.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Consulta [docs/BACKEND.md](docs/BACKEND.md),
[docs/OPERATIONS.md](docs/OPERATIONS.md) y el traspaso específico en
[docs/FRONTEND_HANDOFF.md](docs/FRONTEND_HANDOFF.md).

Todas las sesiones de trabajo deben comenzar por [AGENTS.md](AGENTS.md),
[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) y el
[ciclo de desarrollo e integración](docs/DEVELOPMENT_WORKFLOW.md).
