"use client";

import { Archive, Trash, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardCard, ImageRemovalScope } from "@/lib/board-types";
import { useBoard } from "./BoardProvider";

type DialogState =
  | "idle"
  | "removing"
  | "deleting"
  | "success"
  | "partial"
  | "error";

export function ImageRemovalDialog({
  card,
  onClose,
}: {
  card: BoardCard;
  onClose: () => void;
}) {
  const { actions } = useBoard();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const [state, setState] = useState<DialogState>("idle");
  const [message, setMessage] = useState("");
  const busy = state === "removing" || state === "deleting";

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const close = useCallback(() => {
    if (!busyRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), [href], input:not(:disabled)",
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [close]);

  const remove = async (scope: ImageRemovalScope) => {
    if (busy) return;
    setMessage("");
    try {
      const result = await actions.removeImage(card.id, scope, (stage) => {
        setState(stage);
      });
      setState(result.status === "reference-retained" ? "partial" : "success");
      setMessage(result.message);
    } catch (cause) {
      setState("error");
      setMessage(
        cause instanceof Error
          ? cause.message
          : "No se retiró la tarjeta y la referencia no fue modificada.",
      );
    }
  };

  const finished = state === "success" || state === "partial" || state === "error";

  return (
    <div className="image-removal-backdrop" onMouseDown={close}>
      <div
        ref={dialogRef}
        className="image-removal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-removal-title"
        aria-describedby="image-removal-description"
        aria-busy={busy}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          className="dialog-close"
          type="button"
          disabled={busy}
          onClick={close}
          aria-label="Cancelar y cerrar"
        >
          <X size={18} />
        </button>
        <header>
          <span>Alcance de eliminación</span>
          <h2 id="image-removal-title">¿Qué quieres hacer con esta imagen?</h2>
          <p id="image-removal-description">
            “{card.title || "Imagen sin título"}” puede retirarse sólo de este tablero o eliminarse también del banco compartido.
          </p>
        </header>

        {!finished ? (
          <div className="image-removal-options">
            <button
              ref={primaryRef}
              type="button"
              disabled={busy}
              onClick={() => void remove("board")}
            >
              <Archive size={22} weight="duotone" />
              <span>
                <strong>Retirar sólo del tablero</strong>
                <small>La imagen seguirá disponible en Referencias para volver a utilizarla.</small>
              </span>
            </button>
            <button
              className="destructive-removal-option"
              type="button"
              disabled={busy || !card.assetId}
              onClick={() => void remove("board-and-references")}
            >
              <Trash size={22} />
              <span>
                <strong>Retirar y eliminar de Referencias</strong>
                <small>El archivo se eliminará definitivamente después de guardar la retirada. Si tiene otros usos, se conservará.</small>
              </span>
            </button>
          </div>
        ) : null}

        <p
          className="image-removal-feedback"
          data-tone={state}
          role={state === "error" || state === "partial" ? "alert" : "status"}
          aria-live="polite"
        >
          {state === "removing" ? "Retirando la tarjeta y esperando confirmación del tablero…" : null}
          {state === "deleting" ? "Tarjeta retirada. Eliminando el archivo de Referencias…" : null}
          {message}
        </p>

        <footer>
          <button type="button" disabled={busy} onClick={close}>
            {finished ? "Cerrar" : "Cancelar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
