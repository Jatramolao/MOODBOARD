"use client";

import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeDestination } from "@/lib/safe-destination";

export function AuthForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const destination = safeDestination(next);
  const sessionInitialized = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    const supabase = createClient();
    if (!supabase) return;

    const continueWithSession = () => {
      router.replace(destination);
      router.refresh();
    };

    const initializeSession = async () => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        if (error) {
          setStatus("error");
          setMessage("No pudimos validar el acceso de un solo uso. Solicita uno nuevo.");
          return;
        }
        continueWithSession();
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) continueWithSession();
    };

    void initializeSession();
  }, [destination, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) return;

    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="email">Correo de trabajo</label>
      <div className="auth-input">
        <EnvelopeSimple size={19} aria-hidden="true" />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@estudio.cl"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Continuar por email"}
        <ArrowRight size={18} weight="bold" />
      </button>
      {status === "sent" ? (
        <p className="auth-feedback" role="status">
          Revisa tu correo. Te enviamos un enlace seguro para ingresar.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="auth-feedback auth-error" role="alert">
          {message}
        </p>
      ) : null}
    </form>
  );
}
