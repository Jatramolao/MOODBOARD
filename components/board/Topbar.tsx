"use client";

import {
  CaretRight,
  CloudCheck,
  MagnifyingGlass,
  ShareNetwork,
} from "@phosphor-icons/react";
import { useBoard } from "./BoardProvider";
import type { BoardPerson } from "./useBoardPresence";

const demoCollaborators: BoardPerson[] = [
  { id: "ms", name: "Marina Soler", initials: "MS", tone: "clay" },
  { id: "av", name: "Ana Vidal", initials: "AV", tone: "sand" },
  { id: "lc", name: "Luis Cruz", initials: "LC", tone: "ink" },
];

const syncLabels = {
  loading: "Abriendo…",
  saving: "Guardando…",
  saved: "Guardado",
  local: "Solo en este equipo",
  error: "Error al guardar",
} as const;

export function Topbar({
  boardName,
  collaborators,
  onShare,
  projectName,
}: {
  boardName: string;
  collaborators: BoardPerson[];
  onShare: () => void;
  projectName: string;
}) {
  const { meta } = useBoard();
  const visiblePeople = collaborators.length
    ? collaborators
    : demoCollaborators;

  return (
    <header className="topbar">
      <div className="breadcrumbs" aria-label="Ruta actual">
        <strong>{projectName}</strong>
        <CaretRight size={14} aria-hidden="true" />
        <span>{boardName}</span>
      </div>

      <div className="topbar-actions">
        <span
          className="save-state"
          data-status={meta.syncStatus}
          title={meta.syncError}
        >
          <CloudCheck size={16} weight="duotone" />
          {syncLabels[meta.syncStatus]}
        </span>
        <div
          className="avatar-stack"
          aria-label={`${visiblePeople.length} colaboradores conectados`}
        >
          {visiblePeople.slice(0, 3).map((person) => (
            <span
              className={`collaborator-avatar tone-${person.tone}`}
              key={person.id}
              title={person.name}
            >
              {person.initials}
            </span>
          ))}
          {visiblePeople.length > 3 ? (
            <span className="collaborator-count">
              +{visiblePeople.length - 3}
            </span>
          ) : null}
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Buscar en el tablero"
          title="Buscar"
        >
          <MagnifyingGlass size={20} />
        </button>
        <button className="share-button" type="button" onClick={onShare}>
          <ShareNetwork size={17} weight="bold" />
          Compartir
        </button>
      </div>
    </header>
  );
}
