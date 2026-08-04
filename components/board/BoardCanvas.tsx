"use client";

import {
  ArrowsOutCardinal,
  ImageSquare,
  Minus,
  NotePencil,
  Plus,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_SECTION_GAP,
  BOARD_WORLD_HEIGHT,
  useBoard,
} from "./BoardProvider";
import { BoardCard } from "./BoardCard";

export function BoardCanvas({
  onExtend,
}: {
  onExtend: () => void;
}) {
  const { state, actions, meta } = useBoard();
  const [dragOver, setDragOver] = useState(false);
  const [placingComment, setPlacingComment] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const zoomPercent = Math.round(state.zoom * 100);

  useEffect(() => {
    const startPlacing = () => setPlacingComment(true);
    window.addEventListener("moodboard:place-comment", startPlacing);
    return () => window.removeEventListener("moodboard:place-comment", startPlacing);
  }, []);

  return (
    <main
      id="board-main"
      className="canvas-shell"
      onDragOver={(event) => {
        if (!meta.canEdit) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (meta.canEdit) void actions.addImages(event.dataTransfer.files);
      }}
    >
      <h1 className="visually-hidden">
        Moodboard de Campaña Otoño 2026
      </h1>
      <div className="canvas-toolbar" aria-label="Herramientas del tablero">
        <button type="button" disabled={!meta.canEdit} onClick={() => inputRef.current?.click()}>
          <ImageSquare size={18} />
          Imagen
        </button>
        <button type="button" disabled={!meta.canEdit} onClick={actions.addNote}>
          <NotePencil size={18} />
          Nota
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button
          className="toolbar-icon"
          type="button"
          onClick={() => actions.setZoom(state.zoom - 0.1)}
          aria-label="Alejar"
          title="Alejar"
        >
          <Minus size={16} weight="bold" />
        </button>
        <output className="zoom-output" aria-label={`Zoom ${zoomPercent}%`}>
          {zoomPercent}%
        </output>
        <button
          className="toolbar-icon"
          type="button"
          onClick={() => actions.setZoom(state.zoom + 0.1)}
          aria-label="Acercar"
          title="Acercar"
        >
          <Plus size={16} weight="bold" />
        </button>
        <button
          className="toolbar-icon"
          type="button"
          onClick={() => actions.setZoom(0.82)}
          aria-label="Ajustar tablero"
          title="Ajustar tablero"
        >
          <ArrowsOutCardinal size={16} />
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => {
            if (event.target.files) void actions.addImages(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div
        className="canvas-scroll"
        data-placing-comment={placingComment || undefined}
        aria-label="Lienzo desplazable del moodboard"
        onClick={(event) => {
          if (!placingComment) return;
          const world = event.currentTarget.querySelector<HTMLElement>(".board-world");
          if (!world) return;
          const rect = world.getBoundingClientRect();
          const x = Math.max(0, (event.clientX - rect.left) / state.zoom);
          const y = Math.max(0, (event.clientY - rect.top) / state.zoom);
          setPlacingComment(false);
          window.dispatchEvent(new CustomEvent("moodboard:comment", { detail: { title: `Punto ${Math.round(x)}, ${Math.round(y)}`, x, y } }));
        }}
      >
        <div
          className="world-size"
          style={{
            width: meta.worldWidth * state.zoom,
            height: BOARD_WORLD_HEIGHT * state.zoom,
          }}
        >
          <div
            className="board-world"
            style={{
              width: meta.worldWidth,
              height: BOARD_WORLD_HEIGHT,
              transform: `scale(${state.zoom})`,
            }}
          >
            {state.sections.map((section, index) => {
              const offset = meta.sectionOffsets.get(section.id) ?? 0;
              return (
                <section
                  className="board-section"
                  key={section.id}
                  style={{ left: offset, width: section.width }}
                  aria-labelledby={`section-${section.id}`}
                >
                  <header className="section-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h2 id={`section-${section.id}`}>
                      {section.name.toLocaleUpperCase("es")}
                    </h2>
                  </header>

                  {index < state.sections.length - 1 ? (
                    <div
                      className="section-threshold"
                      style={{ right: -BOARD_SECTION_GAP }}
                      aria-hidden="true"
                    >
                      <span />
                    </div>
                  ) : null}
                </section>
              );
            })}

            {state.cards.map((card) => {
              const offset = meta.sectionOffsets.get(card.sectionId) ?? 0;
              return (
                <BoardCard
                  card={card}
                  globalX={offset + card.x}
                  key={card.id}
                />
              );
            })}

            <button
              className="extend-rail"
              type="button"
              onClick={onExtend}
              disabled={!meta.canEdit}
              style={{
                left:
                  state.sections.reduce(
                    (total, section) =>
                      total + section.width + BOARD_SECTION_GAP,
                    0,
                  ) - 2,
              }}
            >
              <span className="extend-line" aria-hidden="true" />
              <span className="extend-button">
                <Plus size={16} weight="bold" />
                Extender tablero
              </span>
            </button>
          </div>
        </div>
      </div>

      {placingComment ? <div className="comment-placement-hint" role="status">Selecciona un punto del lienzo para anclar el comentario · <button type="button" onClick={() => setPlacingComment(false)}>Cancelar</button></div> : null}

      {dragOver ? (
        <div className="drop-overlay">
          <ImageSquare size={34} weight="light" />
          <strong>Suelta las imágenes en el tablero</strong>
          <span>Se incorporarán al tablero principal</span>
        </div>
      ) : null}
    </main>
  );
}
