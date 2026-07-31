"use client";

import {
  Check,
  Copy,
  LinkSimple,
  LockSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useBoard } from "./BoardProvider";

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

export function ShareDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
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
      <div className="dialog-input-row">
        <div className="link-field">
          <LinkSimple size={17} />
          <span>moodboard.app/campana-otono</span>
        </div>
        <button
          className="primary-dialog-button"
          type="button"
          onClick={() => void copyLink()}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div className="share-footer">
        <span>Vista compartida</span>
        <button type="button">Puede comentar</button>
      </div>
    </DialogFrame>
  );
}
