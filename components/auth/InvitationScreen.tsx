"use client";
/* Async invitation validation intentionally drives the screen state. */
/* eslint-disable react-hooks/set-state-in-effect */

import { ArrowRight, CheckCircle, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { backend } from "@/lib/backend/client";
import { createClient } from "@/lib/supabase/client";
import { frontendErrorMessage, readBackendError } from "@/lib/frontend-errors";

type State = "checking" | "signin" | "accepting" | "success" | "invalid" | "expired" | "mismatch" | "member" | "error";

export function InvitationScreen({ token }: { token: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (!/^[0-9a-f]{64}$/i.test(token)) { setState("invalid"); return; }
    void (async () => {
      const client = createClient();
      const { data } = await client?.auth.getUser() ?? { data: { user: null } };
      setState(data.user ? "accepting" : "signin");
      if (!data.user) return;
      try {
        const result = await backend.acceptInvitation(token);
        const value = Array.isArray(result) ? result[0] : result;
        const acceptedProjectId = typeof value === "string" ? value : String((value as Record<string, unknown> | null)?.project_id ?? "");
        setProjectId(acceptedProjectId); setState("success");
      } catch (cause) {
        const mapped = readBackendError(cause);
        const text = `${mapped.code}:${mapped.message}`;
        setMessage(text);
        if (text.includes("INVITATION_EXPIRED")) setState("expired");
        else if (text.includes("INVITATION_EMAIL_MISMATCH")) setState("mismatch");
        else if (text.includes("CONFLICT") || text.toLowerCase().includes("member")) setState("member");
        else if (text.includes("NOT_FOUND")) setState("invalid");
        else { setMessage(frontendErrorMessage(cause, "No pudimos aceptar la invitación.")); setState("error"); }
      }
    })();
  }, [token]);

  const title = state === "signin" ? "Ingresa para aceptar" : state === "success" ? "Ya eres parte del proyecto" : state === "expired" ? "Esta invitación expiró" : state === "mismatch" ? "El correo no coincide" : state === "member" ? "Ya perteneces al proyecto" : state === "invalid" ? "Invitación no disponible" : state === "error" ? "No pudimos aceptar la invitación" : "Validando invitación";
  return <main className="terminal-page"><section className="terminal-card"><div className="auth-wordmark">MOODBOARD</div><span className="terminal-icon">{state === "success" ? <CheckCircle size={28} weight="duotone" /> : state === "signin" ? <EnvelopeSimple size={28} /> : <WarningCircle size={28} />}</span><h1>{title}</h1>
    {state === "checking" || state === "accepting" ? <p>Estamos verificando el enlace y tus permisos.</p> : null}
    {state === "signin" ? <><p>La invitación está vinculada a un correo. Ingresa con esa cuenta para continuar.</p><Link className="terminal-action" href={`/auth?next=${encodeURIComponent(`/invite?token=${token}`)}`}>Ingresar por email <ArrowRight size={17} /></Link></> : null}
    {state === "success" || state === "member" ? <><p>{state === "success" ? "Tu acceso quedó activado. Ya puedes abrir el espacio de trabajo." : "Este acceso ya fue aceptado anteriormente."}</p><Link className="terminal-action" href={projectId ? `/?project=${projectId}` : "/"}>Abrir proyecto <ArrowRight size={17} /></Link></> : null}
    {state === "expired" ? <p>Pide a la persona propietaria del proyecto que genere un enlace nuevo.</p> : null}
    {state === "mismatch" ? <p>Abre este enlace con la cuenta de correo que recibió la invitación.</p> : null}
    {state === "invalid" ? <p>El enlace es inválido, fue revocado o ya no existe.</p> : null}
    {state === "error" ? <p>{message || "Intenta nuevamente en unos minutos."}</p> : null}
    {!["checking", "accepting", "signin", "success", "member"].includes(state) ? <Link className="text-action" href="/">Volver al inicio</Link> : null}
  </section></main>;
}
