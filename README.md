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
2. Ejecuta
   [`supabase/migrations/202607310001_initial_workspace.sql`](supabase/migrations/202607310001_initial_workspace.sql)
   desde SQL Editor (o con `supabase db push`).
3. Copia `.env.example` como `.env.local` y agrega la URL y la publishable key.
4. En Authentication → URL Configuration agrega:
   - `http://localhost:3000/auth/callback`
   - `https://TU-DOMINIO.vercel.app/auth/callback`
5. Reinicia `npm run dev`. El primer usuario podrá crear su proyecto inicial
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
```

Después de desplegar, agrega también la URL real de callback en Supabase. El
comando de compilación es `npm run build`.

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```
