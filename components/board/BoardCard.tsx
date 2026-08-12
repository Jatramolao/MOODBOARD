"use client";

import Image from "next/image";
import { ChatCircleDots, Trash } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { resizeCardFromPointer } from "@/lib/board-geometry";
import type { BoardCard as BoardCardType } from "@/lib/board-types";
import { useBoard } from "./BoardProvider";

type DragSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startGlobalX: number;
  startY: number;
};

type ResizeSession = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
};

export function BoardCard({
  card,
  globalX,
  eager = false,
  onRequestImageRemoval,
}: {
  card: BoardCardType;
  globalX: number;
  eager?: boolean;
  onRequestImageRemoval: (card: BoardCardType) => void;
}) {
  const {
    actions,
    state: { zoom },
    meta,
  } = useBoard();
  const elementRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const [active, setActive] = useState(false);
  const [draftTitle, setDraftTitle] = useState(card.title ?? "");
  const [draftContent, setDraftContent] = useState(card.content ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onDragStart = (event: React.PointerEvent<HTMLElement>) => {
    if (!meta.canEdit) return;
    if (event.button !== 0 || resizeRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startGlobalX: globalX,
      startY: card.y,
    };
    setActive(true);
  };

  const onDragMove = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current;
    const element = elementRef.current;
    if (!session || !element || event.pointerId !== session.pointerId) return;
    const dx = (event.clientX - session.startClientX) / zoom;
    const dy = (event.clientY - session.startClientY) / zoom;
    element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };

  const onDragEnd = (event: React.PointerEvent<HTMLElement>) => {
    const session = dragRef.current;
    const element = elementRef.current;
    if (!session || !element || event.pointerId !== session.pointerId) return;
    const dx = (event.clientX - session.startClientX) / zoom;
    const dy = (event.clientY - session.startClientY) / zoom;
    element.style.transform = "";
    actions.moveCard(
      card.id,
      session.startGlobalX + dx,
      session.startY + dy,
    );
    dragRef.current = null;
    setActive(false);
  };

  const onResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: card.width,
      startHeight: card.height,
    };
    setActive(true);
  };

  const onResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = resizeRef.current;
    const element = elementRef.current;
    if (!session || !element || event.pointerId !== session.pointerId) return;
    const size = resizeCardFromPointer({
      startWidth: session.startWidth,
      startHeight: session.startHeight,
      deltaX: (event.clientX - session.startClientX) / zoom,
      deltaY: (event.clientY - session.startClientY) / zoom,
      lockAspectRatio: card.type === "image",
    });
    element.style.width = `${size.width}px`;
    element.style.height = `${size.height}px`;
  };

  const onResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = resizeRef.current;
    const element = elementRef.current;
    if (!session || !element || event.pointerId !== session.pointerId) return;
    const size = resizeCardFromPointer({
      startWidth: session.startWidth,
      startHeight: session.startHeight,
      deltaX: (event.clientX - session.startClientX) / zoom,
      deltaY: (event.clientY - session.startClientY) / zoom,
      lockAspectRatio: card.type === "image",
    });
    actions.resizeCard(card.id, size.width, size.height);
    element.style.width = "";
    element.style.height = "";
    resizeRef.current = null;
    setActive(false);
  };

  const onResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!meta.canEdit) return;
    const distance = event.shiftKey ? 40 : 12;
    const deltas: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
    };
    const delta = deltas[event.key];
    if (!delta) return;

    event.preventDefault();
    event.stopPropagation();
    const size = resizeCardFromPointer({
      startWidth: card.width,
      startHeight: card.height,
      deltaX: delta[0],
      deltaY: delta[1],
      lockAspectRatio: card.type === "image",
    });
    actions.resizeCard(card.id, size.width, size.height);
  };

  const style = {
    left: globalX,
    top: card.y,
    width: card.width,
    height: card.height,
  };

  return (
    <article
      ref={elementRef}
      className={`board-card board-card-${card.type}`}
      data-card-id={card.id}
      data-active={active || undefined}
      style={style}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
      onKeyDown={(event) => {
        const distance = event.shiftKey ? 40 : 12;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          actions.moveCard(card.id, globalX - distance, card.y);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          actions.moveCard(card.id, globalX + distance, card.y);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          actions.moveCard(card.id, globalX, card.y - distance);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          actions.moveCard(card.id, globalX, card.y + distance);
        }
      }}
      tabIndex={0}
      aria-label={`${card.title ?? "Elemento"}; arrastrable`}
    >
      <div className="card-actions">
        <button
          type="button"
          aria-label={`Comentar ${card.title ?? "elemento"}`}
          title="Comentar"
          onClick={(event) => {
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent("moodboard:comment", { detail: { id: card.id, title: card.title || "Elemento sin título" } }));
          }}
        >
          <ChatCircleDots size={17} />
        </button>
        {meta.canEdit ? <button
          type="button"
          aria-label={card.type === "image" ? `Elegir cómo retirar ${card.title ?? "imagen"}` : `Eliminar ${card.title ?? "elemento"}`}
          title={card.type === "image" ? "Retirar imagen" : "Eliminar"}
          onClick={(event) => {
            event.stopPropagation();
            if (card.type === "image") onRequestImageRemoval(card);
            else setConfirmDelete(true);
          }}
        >
          <Trash size={16} />
        </button> : null}
      </div>

      {card.type === "image" && card.imageUrl ? (
        <>
          <Image
            className="card-image"
            src={card.imageUrl}
            alt={card.title ?? ""}
            fill
            sizes="(max-width: 900px) 45vw, 320px"
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            unoptimized={
              Boolean(card.imagePath) || card.imageUrl.startsWith("data:")
            }
          />
          <div className="image-caption">{card.title}</div>
        </>
      ) : null}

      {card.type === "note" ? (
        <div className="note-content">
          {meta.canEdit ? <>
            <input aria-label="Título de la nota" value={draftTitle} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setDraftTitle(event.target.value)} onBlur={() => actions.updateCardText(card.id, draftTitle, draftContent)} />
            <textarea aria-label="Contenido de la nota" value={draftContent} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => setDraftContent(event.target.value)} onBlur={() => actions.updateCardText(card.id, draftTitle, draftContent)} />
          </> : <><strong>{card.title}</strong><p>{card.content}</p></>}
          <small>— M.S.</small>
        </div>
      ) : null}

      {card.type === "palette" ? (
        <div className="palette-content">
          <strong>{card.title}</strong>
          <div className="swatches" aria-label="Muestras de color">
            {card.colors?.map((color) => (
              <span key={color} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      ) : null}

      {meta.canEdit ? <button
        className="resize-handle"
        type="button"
        aria-label={`Redimensionar ${card.title ?? "elemento"}`}
        title="Arrastra o usa las flechas para ajustar el tamaño"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        onKeyDown={onResizeKeyDown}
      /> : null}
      {confirmDelete ? <div className="card-delete-confirm" role="dialog" aria-label={`Eliminar ${card.title ?? "elemento"}`} onPointerDown={(event) => event.stopPropagation()}>
        <p>¿Eliminar “{card.title ?? "este elemento"}” del tablero?</p>
        <div><button type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" onClick={() => actions.removeCard(card.id)}>Eliminar</button></div>
      </div> : null}
    </article>
  );
}
