"use client";
/* Navigation data is loaded from the backend when project context changes. */
/* eslint-disable react-hooks/set-state-in-effect */

import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  CaretDown,
  ClockCounterClockwise,
  Copy,
  FolderOpen,
  GridFour,
  Images,
  PencilSimple,
  Plus,
  SignOut,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { backend } from "@/lib/backend/client";
import { createdBoardId, mapBoard, mapProject } from "@/lib/backend/mappers";
import type { BoardSummary, ProjectSummary } from "@/lib/backend/types";
import { createClient } from "@/lib/supabase/client";
import { frontendErrorMessage, redirectOnUnauthorized } from "@/lib/frontend-errors";
import type { WorkspaceRuntime } from "./BoardWorkspace";

export type WorkspaceView = "board" | "assets" | "team" | "activity";

type EditorState =
  | { kind: "project" }
  | { kind: "edit-project"; project: ProjectSummary }
  | { kind: "board" }
  | { kind: "rename-board"; board: BoardSummary }
  | null;

export function Sidebar({
  runtime,
  view,
  onViewChange,
}: {
  runtime: WorkspaceRuntime;
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remote = runtime.kind === "supabase";
  const showError = (cause: unknown, fallback: string) => {
    if (redirectOnUnauthorized(cause)) return;
    setError(frontendErrorMessage(cause, fallback));
  };
  const projectName = remote ? runtime.projectName : "Campaña Otoño 2026";
  const profile = remote
    ? runtime.user
    : { name: "Marina Soler", initials: "MS", role: "Dirección creativa" };

  const refreshNavigation = async () => {
    if (!remote) return;
    try {
      const [projectRows, boardRows] = await Promise.all([
        backend.listProjects(),
        backend.listBoards(runtime.projectId, true),
      ]);
      setProjects((projectRows as Record<string, unknown>[]).map(mapProject));
      setBoards((boardRows as Record<string, unknown>[]).map(mapBoard));
    } catch (cause) {
      showError(cause, "No pudimos cargar la navegación.");
    }
  };

  useEffect(() => {
    void refreshNavigation();
  }, [remote, remote ? runtime.projectId : "local"]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditor = (next: EditorState) => {
    setError("");
    setName(next?.kind === "rename-board" ? next.board.name : next?.kind === "edit-project" ? next.project.name : "");
    setClientName(next?.kind === "edit-project" ? next.project.clientName ?? "" : "");
    setEditor(next);
  };

  const submitEditor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!remote || !editor || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (editor.kind === "project") {
        const result = await backend.createProject(name.trim(), clientName.trim());
        const boardId = createdBoardId(result);
        if (!boardId) throw new Error("El proyecto se creó, pero no recibimos el identificador de su tablero.");
        window.location.assign(`/?board=${encodeURIComponent(boardId)}`);
        return;
      }
      if (editor.kind === "edit-project") {
        await backend.updateProject(editor.project.id, name.trim(), clientName.trim());
        setEditor(null); await refreshNavigation(); window.location.reload(); return;
      }
      if (editor.kind === "board") {
        const result = await backend.createBoard(runtime.projectId, name.trim());
        const boardId = createdBoardId(result);
        if (!boardId) throw new Error("El tablero se creó, pero no recibimos un identificador válido.");
        window.location.assign(`/?board=${encodeURIComponent(boardId)}`);
        return;
      }
      await backend.updateBoard(editor.board.id, name.trim());
      setEditor(null);
      await refreshNavigation();
      if (editor.board.id === runtime.boardId) window.location.reload();
    } catch (cause) {
      showError(cause, "No pudimos guardar el cambio.");
    } finally {
      setBusy(false);
    }
  };

  const mutateBoard = async (board: BoardSummary, action: "duplicate" | "archive" | "restore") => {
    setError("");
    if (action === "archive" && !window.confirm(`¿Archivar el tablero “${board.name}”?`)) return;
    try {
      if (action === "duplicate") await backend.duplicateBoard(board.id, `${board.name} — copia`);
      else await backend.setBoardArchived(board.id, action === "archive");
      await refreshNavigation();
      if (action === "archive" && runtime.kind === "supabase" && board.id === runtime.boardId) {
        const fallback = boards.find((item) => item.id !== board.id && !item.archivedAt);
        if (fallback) window.location.assign(`/?board=${encodeURIComponent(fallback.id)}`);
      }
    } catch (cause) {
      showError(cause, "No pudimos actualizar el tablero.");
    }
  };

  const visibleBoards = boards.filter((board) => showArchived ? Boolean(board.archivedAt) : !board.archivedAt);

  const moveBoard = async (board: BoardSummary, direction: -1 | 1) => {
    if (runtime.kind !== "supabase") return;
    const active = boards.filter((item) => !item.archivedAt);
    const index = active.findIndex((item) => item.id === board.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active.length) return;
    const reordered = [...active];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try { await backend.reorderBoards(runtime.projectId, reordered.map((item) => item.id)); await refreshNavigation(); }
    catch (cause) { showError(cause, "No pudimos reordenar los tableros."); }
  };

  const archiveCurrentProject = async () => {
    if (runtime.kind !== "supabase") return;
    if (!window.confirm(`¿Archivar el proyecto “${projectName}”?`)) return;
    try {
      await backend.setProjectArchived(runtime.projectId, true);
      const nextProject = projects.find((project) => project.id !== runtime.projectId && !project.archivedAt);
      if (!nextProject) { window.location.assign("/"); return; }
      const rows = await backend.listBoards(nextProject.id);
      const first = (rows as Record<string, unknown>[])[0];
      window.location.assign(first ? `/?board=${encodeURIComponent(String(first.id))}` : "/");
    } catch (cause) { showError(cause, "No pudimos archivar el proyecto."); }
  };

  return (
    <aside className="sidebar" aria-label="Navegación del proyecto">
      <div className="wordmark" aria-label="Moodboard" translate="no">MOODBOARD</div>

      <div className="project-switcher-wrap">
        <button className="project-switcher" type="button" aria-expanded={switcherOpen} onClick={() => setSwitcherOpen((value) => !value)}>
          <span><small>Proyecto</small>{projectName}</span>
          <CaretDown size={15} weight="bold" aria-hidden="true" />
        </button>
        {switcherOpen && remote ? (
          <div className="project-menu">
            {projects.filter((project) => !project.archivedAt).map((project) => (
              <button key={project.id} type="button" data-current={project.id === runtime.projectId || undefined} onClick={async () => {
                const rows = await backend.listBoards(project.id);
                const first = (rows as Record<string, unknown>[])[0];
                if (first) window.location.assign(`/?board=${encodeURIComponent(String(first.id))}`);
              }}>
                <FolderOpen size={17} />
                <span>{project.name}<small>{project.clientName || project.role}</small></span>
              </button>
            ))}
            <button type="button" className="menu-create" onClick={() => openEditor({ kind: "project" })}>
              <Plus size={17} /> Nuevo proyecto
            </button>
            {runtime.access.role !== "viewer" ?
              <button type="button" onClick={() => { const current = projects.find((project) => project.id === runtime.projectId); if (current) openEditor({ kind: "edit-project", project: current }); }}><PencilSimple size={17} /> Editar proyecto</button>
            : null}
            {runtime.access.role === "owner" ?
              <button type="button" className="menu-danger" onClick={() => void archiveCurrentProject()}><Archive size={17} /> Archivar proyecto</button>
            : null}
          </div>
        ) : null}
      </div>

      <nav className="project-nav" aria-label="Secciones del proyecto">
        <button className="nav-item" data-active={view === "board" || undefined} type="button" onClick={() => onViewChange("board")}>
          <GridFour size={19} weight={view === "board" ? "duotone" : "regular"} /><span>Tableros</span>
        </button>
        <button className="nav-item" data-active={view === "assets" || undefined} type="button" onClick={() => onViewChange("assets")}>
          <Images size={19} weight={view === "assets" ? "duotone" : "regular"} /><span>Referencias</span>
        </button>
        <button className="nav-item" data-active={view === "team" || undefined} type="button" onClick={() => onViewChange("team")}>
          <UsersThree size={19} weight={view === "team" ? "duotone" : "regular"} /><span>Equipo</span>
        </button>
        <button className="nav-item" data-active={view === "activity" || undefined} type="button" onClick={() => onViewChange("activity")}>
          <ClockCounterClockwise size={19} weight={view === "activity" ? "duotone" : "regular"} /><span>Actividad</span>
        </button>
      </nav>

      <section className="board-nav" aria-label="Tableros del proyecto">
        <div className="board-nav-heading">
          <span>{showArchived ? "Archivados" : "Tableros"}</span>
          {remote && runtime.access.role !== "viewer" ? <button type="button" onClick={() => openEditor({ kind: "board" })} aria-label="Crear tablero"><Plus size={16} /></button> : null}
        </div>
        <div className="board-nav-list">
          {remote ? visibleBoards.map((board) => (
            <div className="board-nav-row" data-current={board.id === runtime.boardId || undefined} key={board.id}>
              <button className="board-link" type="button" onClick={() => window.location.assign(`/?board=${encodeURIComponent(board.id)}`)}>
                <span>{board.name}</span><small>v{board.version}</small>
              </button>
              {runtime.access.role !== "viewer" ? (
                <details className="board-menu">
                  <summary aria-label={`Opciones de ${board.name}`}>•••</summary>
                  <div>
                    {!board.archivedAt ? <button type="button" onClick={() => openEditor({ kind: "rename-board", board })}><PencilSimple size={15} /> Renombrar</button> : null}
                    {!board.archivedAt ? <button type="button" onClick={() => void mutateBoard(board, "duplicate")}><Copy size={15} /> Duplicar</button> : null}
                    {!board.archivedAt ? <button type="button" onClick={() => void moveBoard(board, -1)}><ArrowUp size={15} /> Subir</button> : null}
                    {!board.archivedAt ? <button type="button" onClick={() => void moveBoard(board, 1)}><ArrowDown size={15} /> Bajar</button> : null}
                    <button type="button" onClick={() => void mutateBoard(board, board.archivedAt ? "restore" : "archive")}><Archive size={15} /> {board.archivedAt ? "Restaurar" : "Archivar"}</button>
                  </div>
                </details>
              ) : null}
            </div>
          )) : <button className="board-nav-row board-link" data-current type="button">Tablero general</button>}
          {remote && !visibleBoards.length ? <p className="nav-empty">No hay tableros {showArchived ? "archivados" : "activos"}.</p> : null}
        </div>
        {remote ? <button className="archive-toggle" type="button" onClick={() => setShowArchived((value) => !value)}><ArrowsDownUp size={15} /> {showArchived ? "Ver activos" : "Ver archivados"}</button> : null}
      </section>

      {error ? <p className="sidebar-error" role="alert">{error}</p> : null}

      <div className="profile-wrap">
        <button className="profile-button" type="button">
          <span className="profile-avatar">{profile.initials}</span>
          <span><strong>{profile.name}</strong><small>{profile.role}</small></span>
        </button>
        {remote ? <button className="signout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={async () => {
          await createClient()?.auth.signOut(); window.location.assign("/auth");
        }}><SignOut size={17} /></button> : null}
      </div>

      {editor ? (
        <div className="mini-dialog-backdrop" onMouseDown={() => setEditor(null)}>
          <form className="mini-dialog" role="dialog" aria-modal="true" aria-labelledby="mini-dialog-title" onSubmit={submitEditor} onMouseDown={(event) => event.stopPropagation()}>
            <button className="mini-dialog-close" type="button" onClick={() => setEditor(null)} aria-label="Cerrar"><X size={17} /></button>
            <h2 id="mini-dialog-title">{editor.kind === "project" ? "Nuevo proyecto" : editor.kind === "edit-project" ? "Editar proyecto" : editor.kind === "board" ? "Nuevo tablero" : "Renombrar tablero"}</h2>
            <label>Nombre<input name="name" autoComplete="off" autoFocus required maxLength={90} value={name} onChange={(event) => setName(event.target.value)} /></label>
            {editor.kind === "project" || editor.kind === "edit-project" ? <label>Cliente <span>(opcional)</span><input name="client" autoComplete="organization" maxLength={90} value={clientName} onChange={(event) => setClientName(event.target.value)} /></label> : null}
            {error ? <p role="alert">{error}</p> : null}
            <button className="primary-dialog-button" disabled={busy || !name.trim()}>{busy ? "Guardando…" : "Guardar"}</button>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
