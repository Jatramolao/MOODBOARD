"use client";

import {
  Bell,
  CaretRight,
  ChatCircleDots,
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
  offline: "Sin conexión",
  error: "Error al guardar",
} as const;

export function Topbar({
  boardName,
  collaborators,
  onShare,
  onSearch,
  onComments,
  onNotifications,
  projectName,
  showDemoCollaborators,
}: {
  boardName: string;
  collaborators: BoardPerson[];
  onShare: () => void;
  onSearch: () => void;
  onComments: () => void;
  onNotifications: () => void;
  projectName: string;
  showDemoCollaborators: boolean;
}) {
  const { meta } = useBoard();
  const visiblePeople = collaborators.length ? collaborators : showDemoCollaborators ? demoCollaborators : [];

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
          role={meta.syncStatus === "error" ? "alert" : "status"}
          aria-live="polite"
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
          onClick={onSearch}
        >
          <MagnifyingGlass size={20} />
        </button>
        <button className="icon-button" type="button" aria-label="Abrir comentarios" title="Comentarios" onClick={onComments}><ChatCircleDots size={20} /></button>
        <button className="icon-button" type="button" aria-label="Abrir notificaciones" title="Notificaciones" onClick={onNotifications}><Bell size={19} /></button>
        <button className="share-button" type="button" onClick={onShare}>
          <ShareNetwork size={17} weight="bold" />
          Compartir
        </button>
      </div>
      {meta.versionConflict ? <div className="conflict-banner" role="alert"><span>El tablero cambió en otra sesión. La edición está pausada para evitar sobrescrituras.</span><button type="button" onClick={() => window.location.reload()}>Recargar tablero</button></div> : null}
    </header>
  );
}
