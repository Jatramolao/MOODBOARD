"use client";

import { useMemo, useState } from "react";
import { createSupabaseBoardAdapter } from "@/lib/supabase/board-adapter";
import { BoardCanvas } from "./BoardCanvas";
import { BoardProvider } from "./BoardProvider";
import { ExtendDialog, ShareDialog } from "./Dialogs";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useBoardPresence } from "./useBoardPresence";

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
      };
    };

function Workspace({ runtime }: { runtime: WorkspaceRuntime }) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const connectedPeople = useBoardPresence(
    runtime.kind === "supabase" ? runtime.boardId : undefined,
    runtime.kind === "supabase" ? runtime.user : undefined,
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#board-main">
        Saltar al tablero
      </a>
      <Sidebar runtime={runtime} />
      <div className="workspace">
        <Topbar
          boardName={
            runtime.kind === "supabase" ? runtime.boardName : "Tablero general"
          }
          collaborators={connectedPeople}
          onShare={() => setDialog("share")}
          projectName={
            runtime.kind === "supabase"
              ? runtime.projectName
              : "Campaña Otoño 2026"
          }
        />
        <BoardCanvas onExtend={() => setDialog("extend")} />
      </div>
      {dialog === "extend" ? (
        <ExtendDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "share" ? (
        <ShareDialog onClose={() => setDialog(null)} />
      ) : null}
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
    <BoardProvider adapter={adapter}>
      <Workspace runtime={runtime} />
    </BoardProvider>
  );
}
