import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeDestination } from "@/lib/safe-destination";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (!hasSupabaseEnv()) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const params = await searchParams;
  const next = safeDestination(params.next);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-wordmark" translate="no">
          MOODBOARD
        </div>
        <span className="auth-kicker">ESPACIO EDITORIAL COMPARTIDO</span>
        <h1>Toda la visión del proyecto, en un solo lienzo.</h1>
        <p>
          Fotografía, styling, maquillaje y dirección creativa trabajan sobre
          una misma referencia, sin perder sus propios espacios.
        </p>
        {params.error === "callback" ? <p className="auth-feedback auth-error" role="alert">El enlace de acceso no es válido o ya expiró. Solicita uno nuevo.</p> : null}
        <AuthForm next={next} />
        <small>
          Al continuar aceptas las condiciones del espacio de trabajo de tu
          equipo.
        </small>
      </section>
      <aside className="auth-art" aria-label="Vista editorial del producto">
        <div className="auth-art-number">01 — 04</div>
        <div className="auth-art-card auth-art-card-one" />
        <div className="auth-art-card auth-art-card-two" />
        <blockquote>
          “Una referencia común permite decisiones más rápidas y una ejecución
          más consistente.”
        </blockquote>
      </aside>
    </main>
  );
}
