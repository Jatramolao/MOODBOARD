"use client";

import Image from "next/image";
import { DotsThree, Trash } from "@phosphor-icons/react";
import { useRef, useState } from "react";
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
}: {
  card: BoardCardType;
  globalX: number;
}) {
  const {
    actions,
    state: { zoom },
  } = useBoard();
  const elementRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const [active, setActive] = useState(false);

  const onDragStart = (event: React.PointerEvent<HTMLElement>) => {
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
    const width =
      session.startWidth + (event.clientX - session.startClientX) / zoom;
    const height =
      session.startHeight + (event.clientY - session.startClientY) / zoom;
    element.style.width = `${Math.max(150, width)}px`;
    element.style.height = `${Math.max(110, height)}px`;
  };

  const onResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = resizeRef.current;
    const element = elementRef.current;
    if (!session || !element || event.pointerId !== session.pointerId) return;
    const width =
      session.startWidth + (event.clientX - session.startClientX) / zoom;
    const height =
      session.startHeight + (event.clientY - session.startClientY) / zoom;
    actions.resizeCard(card.id, width, height);
    element.style.width = "";
    element.style.height = "";
    resizeRef.current = null;
    setActive(false);
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
          aria-label={`Más opciones para ${card.title ?? "elemento"}`}
          title="Más opciones"
        >
          <DotsThree size={20} weight="bold" />
        </button>
        <button
          type="button"
          aria-label={`Eliminar ${card.title ?? "elemento"}`}
          title="Eliminar"
          onClick={(event) => {
            event.stopPropagation();
            const confirmed = window.confirm(
              `¿Eliminar “${card.title ?? "este elemento"}” del tablero?`,
            );
            if (confirmed) actions.removeCard(card.id);
          }}
        >
          <Trash size={16} />
        </button>
      </div>

      {card.type === "image" && card.imageUrl ? (
        <>
          <Image
            className="card-image"
            src={card.imageUrl}
            alt={card.title ?? ""}
            fill
            sizes="(max-width: 900px) 45vw, 320px"
            loading={
              card.sectionId === "general" && card.y < 460 ? "eager" : "lazy"
            }
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
          <strong>{card.title}</strong>
          <p>{card.content}</p>
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

      <button
        className="resize-handle"
        type="button"
        aria-label={`Redimensionar ${card.title ?? "elemento"}`}
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
      />
    </article>
  );
}
