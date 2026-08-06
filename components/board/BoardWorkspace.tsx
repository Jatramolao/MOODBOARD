"use client";

import { useEffect, useMemo, useState } from "react";
import { ClockCounterClockwise, GridFour, Images, UsersThree } from "@phosphor-icons/react";
import { createSupabaseBoardAdapter } from "@/lib/supabase/board-adapter";
import { BoardCanvas } from "./BoardCanvas";
import { BoardProvider, useBoard } from "./BoardProvider";
import { ExtendDialog, ShareDialog } from "./Dialogs";
import { Sidebar } from "./Sidebar";
import type { WorkspaceView } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useBoardPresence } from "./useBoardPresence";
import { ContentPanel, UtilityDrawer, type CommentAnchor, type UtilityPanel } from "./WorkspacePanels";

type OpenDialog = "extend" | "share" | null;

export type WorkspaceRuntime =
  | { kind: "local" }
  | {
      kind: "supabase";
      boardId: string;
      projectId: string;
      projectName: string;
      boardName: string;
      user: {
        id: string;
        name: string;
        initials: string;
        role: string;
        email: string;
      };
      access: {
        role: "owner" | "editor" | "viewer";
        canComment: boolean;
      };
    };

function ProjectLoadingState() {
  return (
    <main
      className="project-loading"
      id="board-main"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="project-loading-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <strong>Cargando proyecto</strong>
      <p>Preparando el tablero y sus referencias…</p>
    </main>
  );
}

function Workspace({ runtime }: { runtime: WorkspaceRuntime }) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [view, setView] = useState<WorkspaceView>("board");
  const [utility, setUtility] = useState<UtilityPanel>(null);
  const [commentAnchor, setCommentAnchor] = useState<CommentAnchor | null>(null);
  const { meta } = useBoard();
  const loadingRemoteBoard = runtime.kind === "supabase" && !meta.hydrated;
  const connectedPeople = useBoardPresence(
    runtime.kind === "supabase" ? runtime.boardId : undefined,
    runtime.kind === "supabase" ? runtime.user : undefined,
  );

  useEffect(() => {
    const openComments = (event: Event) => {
      const detail = (event as CustomEvent<CommentAnchor>).detail;
      setCommentAnchor(detail);
      setUtility("comments");
    };
    window.addEventListener("moodboard:comment", openComments);
    return () => window.removeEventListener("moodboard:comment", openComments);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#board-main">
        Saltar al tablero
      </a>
      <Sidebar runtime={runtime} view={view} onViewChange={setView} />
      <div className="workspace">
        <Topbar
          boardName={
            runtime.kind === "supabase" ? runtime.boardName : "Tablero general"
          }
          collaborators={connectedPeople}
          onShare={() => setDialog("share")}
          onSearch={() => setUtility("search")}
          onComments={() => { setCommentAnchor(null); setUtility("comments"); }}
          onNotifications={() => setUtility("notifications")}
          projectName={
            runtime.kind === "supabase"
              ? runtime.projectName
              : "Campaña Otoño 2026"
          }
          showDemoCollaborators={runtime.kind === "local"}
        />
        {view === "board" ? (
          loadingRemoteBoard ? (
            <ProjectLoadingState />
          ) : (
            <BoardCanvas onExtend={() => setDialog("extend")} />
          )
        ) : (
          <ContentPanel
            view={view}
            runtime={runtime}
            onViewChange={setView}
          />
        )}
      </div>
      {utility ? <UtilityDrawer panel={utility} runtime={runtime} anchorItem={commentAnchor} onClose={() => setUtility(null)} /> : null}
      {dialog === "extend" ? (
        <ExtendDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "share" ? (
        <ShareDialog runtime={runtime} onClose={() => setDialog(null)} />
      ) : null}
      <nav className="mobile-project-nav" aria-label="Secciones del proyecto">
        <button type="button" data-active={view === "board" || undefined} onClick={() => setView("board")}><GridFour size={18} /><span>Tableros</span></button>
        <button type="button" data-active={view === "assets" || undefined} onClick={() => setView("assets")}><Images size={18} /><span>Referencias</span></button>
        <button type="button" data-active={view === "team" || undefined} onClick={() => setView("team")}><UsersThree size={18} /><span>Equipo</span></button>
        <button type="button" data-active={view === "activity" || undefined} onClick={() => setView("activity")}><ClockCounterClockwise size={18} /><span>Actividad</span></button>
      </nav>
    </div>
  );
}

export function BoardWorkspace({
  runtime = { kind: "local" },
}: {
  runtime?: WorkspaceRuntime;
}) {
  const adapter = useMemo(
    () =>
      runtime.kind === "supabase"
        ? createSupabaseBoardAdapter({
            boardId: runtime.boardId,
            projectId: runtime.projectId,
          })
        : null,
    [runtime],
  );

  return (
    <BoardProvider
      adapter={adapter}
      readOnly={runtime.kind === "supabase" && runtime.access.role === "viewer"}
    >
      <Workspace runtime={runtime} />
    </BoardProvider>
  );
}
