"use client";
/* Dialog data is loaded on open and reflected in local UI state. */
/* eslint-disable react-hooks/set-state-in-effect */

import {
  Check,
  Copy,
  LinkSimple,
  LockSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useBoard } from "./BoardProvider";
import { backend } from "@/lib/backend/client";
import { mapShareLink } from "@/lib/backend/mappers";
import type { BoardShareLink, SharePermission } from "@/lib/backend/types";
import type { WorkspaceRuntime } from "./BoardWorkspace";
import { frontendErrorMessage, redirectOnUnauthorized } from "@/lib/frontend-errors";

const disciplineSuggestions = [
  "Styling",
  "Dirección de arte",
  "Locación",
  "Casting",
  "Postproducción",
];

function DialogFrame({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]',
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
        <div className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <p id="dialog-description">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ExtendDialog({ onClose }: { onClose: () => void }) {
  const { actions } = useBoard();
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    actions.addSection(name);
    onClose();
  };

  return (
    <DialogFrame
      title="Extender el tablero"
      description="Agrega una nueva disciplina al mismo lienzo. Mantendrá la continuidad del proyecto."
      onClose={onClose}
    >
      <label className="field-label" htmlFor="section-name">
        Nombre de la sección
      </label>
      <div className="dialog-input-row">
        <input
          id="section-name"
          name="section-name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Ej. Styling…"
        />
        <button
          className="primary-dialog-button"
          type="button"
          disabled={!name.trim()}
          onClick={submit}
        >
          Agregar
        </button>
      </div>
      <div className="suggestions">
        <span>Sugerencias</span>
        <div>
          {disciplineSuggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => setName(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </DialogFrame>
  );
}

export function ShareDialog({ runtime, onClose }: { runtime: WorkspaceRuntime; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState<SharePermission>("comment");
  const [links, setLinks] = useState<BoardShareLink[]>([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadLinks = async () => {
    if (runtime.kind !== "supabase") return;
    try {
      const rows = await backend.listShareLinks(runtime.boardId) as Record<string, unknown>[];
      setLinks(rows.map(mapShareLink));
    } catch (cause) {
      if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos cargar los enlaces."));
    }
  };

  useEffect(() => { void loadLinks(); }, [runtime.kind === "supabase" ? runtime.boardId : "local"]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdUrl || window.location.href);
      setCopied(true);
      setFeedback("Enlace copiado.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFeedback("No pudimos copiar el enlace. Selecciónalo manualmente.");
    }
  };

  const createLink = async () => {
    if (runtime.kind !== "supabase") { setCreatedUrl(window.location.href); return; }
    setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/share-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ boardId: runtime.boardId, permission }) });
      const data = await response.json();
      if (!response.ok) {
        if (data.error?.code === "UNAUTHORIZED") { window.location.assign(`/auth?next=${encodeURIComponent(window.location.pathname)}`); return; }
        setFeedback(frontendErrorMessage(data.error, "No pudimos crear el enlace.")); return;
      }
      setCreatedUrl(data.shareUrl); setFeedback("Vista compartida creada."); await loadLinks();
    } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos crear el enlace.")); }
    finally { setBusy(false); }
  };
  const revokeLink = async (link: BoardShareLink) => {
    if (!window.confirm("¿Revocar este enlace compartido? Dejará de funcionar inmediatamente.")) return;
    try {
      const response = await fetch(`/api/share-links?id=${encodeURIComponent(link.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw data.error ?? new Error("No pudimos revocar el enlace.");
      setFeedback("Enlace revocado.");
      await loadLinks();
    } catch (cause) {
      if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos revocar el enlace."));
    }
  };

  return (
    <DialogFrame
      title="Compartir tablero"
      description="Invita al equipo o entrega una vista limpia para revisión."
      onClose={onClose}
    >
      <div className="share-permission">
        <span className="permission-icon">
          <LockSimple size={18} weight="duotone" />
        </span>
        <span>
          <strong>Proyecto privado</strong>
          <small>Solo las personas invitadas pueden acceder.</small>
        </span>
      </div>
      <div className="share-controls">
        <label>Permiso<select value={permission} onChange={(event) => setPermission(event.target.value as SharePermission)}><option value="view">Solo lectura</option><option value="comment">Puede comentar</option></select></label>
        {runtime.kind !== "supabase" || runtime.access.role !== "viewer" ? <button className="primary-dialog-button" type="button" disabled={busy} onClick={() => void createLink()}>{busy ? "Creando…" : "Crear enlace"}</button> : null}
      </div>
      {createdUrl ? <div className="dialog-input-row">
        <div className="link-field">
          <LinkSimple size={17} />
          <span>{createdUrl}</span>
        </div>
        <button
          className="primary-dialog-button"
          type="button"
          onClick={() => void copyLink()}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div> : null}
      {feedback ? <p className="inline-feedback" role="status">{feedback}</p> : null}
      {links.filter((link) => !link.revokedAt).length ? <div className="share-link-list"><span>Enlaces activos</span>{links.filter((link) => !link.revokedAt).map((link) => <div key={link.id}><span><strong>{link.permission === "comment" ? "Puede comentar" : "Solo lectura"}</strong><small>{link.lastAccessedAt ? `Visto ${new Date(link.lastAccessedAt).toLocaleDateString("es-CL")}` : "Aún no abierto"}</small></span>{runtime.kind === "supabase" && runtime.access.role !== "viewer" ? <button type="button" onClick={() => void revokeLink(link)}>Revocar</button> : null}</div>)}</div> : null}
    </DialogFrame>
  );
}
