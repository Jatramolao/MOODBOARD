import { BoardWorkspace } from "@/components/board/BoardWorkspace";
import { WorkspaceSetup } from "@/components/auth/WorkspaceSetup";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams: Promise<{ board?: string; project?: string; setup?: string }>;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es");
}

export default async function Home({ searchParams }: HomeProps) {
  if (!hasSupabaseEnv()) return <BoardWorkspace />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const params = await searchParams;
  const requestedBoard = params.board;
  const requestedProject = params.project;
  let query = supabase
    .from("boards")
    .select("id,name,project_id,projects!inner(name)")
    .order("created_at")
    .limit(1);
  if (requestedBoard) query = query.eq("id", requestedBoard);
  else if (requestedProject) query = query.eq("project_id", requestedProject);

  const { data: board } = await query.maybeSingle();
  const displayName =
    String(user.user_metadata.full_name ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Creativo";

  if (!board) {
    return (
      <WorkspaceSetup
        error={
          params.setup && params.setup !== "missing-name"
            ? params.setup
            : undefined
        }
        name={displayName}
      />
    );
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role,can_comment")
    .eq("project_id", board.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const project = board.projects as unknown as { name: string };

  return (
    <BoardWorkspace
      runtime={{
        kind: "supabase",
        boardId: board.id,
        boardName: board.name,
        projectId: board.project_id,
        projectName: project.name,
        user: {
          id: user.id,
          name: displayName,
          initials: getInitials(displayName),
          email: user.email ?? "",
          role:
            membership?.role === "owner"
              ? "Dirección del proyecto"
              : membership?.role === "editor"
                ? "Colaborador"
                : "Invitado",
        },
        access: {
          role: membership?.role === "owner" || membership?.role === "editor" ? membership.role : "viewer",
          canComment: Boolean(membership?.can_comment),
        },
      }}
    />
  );
}
