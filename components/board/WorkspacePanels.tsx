"use client";
/* Backend-backed panels synchronize remote resources into local presentation state. */
/* eslint-disable react-hooks/set-state-in-effect */

import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle,
  Copy,
  FileImage,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plus,
  Trash,
  UserMinus,
  X,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backend } from "@/lib/backend/client";
import { mapActivity, mapAsset, mapComment, mapInvitation, mapMember, mapNotification } from "@/lib/backend/mappers";
import type { ActivityEvent, AssetRecord, AssetUsage, BoardComment, ProjectInvitation, ProjectMember, UserNotification } from "@/lib/backend/types";
import type { WorkspaceRuntime } from "./BoardWorkspace";
import type { WorkspaceView } from "./Sidebar";
import { useBoard } from "./BoardProvider";
import { createClient } from "@/lib/supabase/client";
import { frontendErrorMessage, redirectOnUnauthorized } from "@/lib/frontend-errors";
import { groupAssetUsages } from "@/lib/reference-library";

export type UtilityPanel = "search" | "comments" | "notifications" | null;
export type CommentAnchor = { id?: string; title: string; x?: number; y?: number };

const formatDate = (value: string) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const focusBoardCard = (itemId: string) => Array.from(document.querySelectorAll<HTMLElement>("[data-card-id]")).find((element) => element.dataset.cardId === itemId)?.focus();

function SurfaceState({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" }) {
  return <div className="surface-state" data-tone={tone}>{children}</div>;
}

export function ContentPanel({ view, runtime, onViewChange }: { view: Exclude<WorkspaceView, "board">; runtime: WorkspaceRuntime; onViewChange: (view: WorkspaceView) => void }) {
  if (runtime.kind === "local") return <SurfaceState>Conecta Supabase para usar esta sección colaborativa.</SurfaceState>;
  if (view === "assets") return <AssetsPanel runtime={runtime} onViewChange={onViewChange} />;
  if (view === "team") return <TeamPanel runtime={runtime} />;
  return <ActivityPanel runtime={runtime} />;
}

function AssetsPanel({ runtime, onViewChange }: { runtime: Extract<WorkspaceRuntime, { kind: "supabase" }>; onViewChange: (view: WorkspaceView) => void }) {
  const { actions } = useBoard();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetUsages, setAssetUsages] = useState<AssetUsage[]>([]);
  const [previewByPath, setPreviewByPath] = useState(new Map<string, string>());
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [thumbnailError, setThumbnailError] = useState("");
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);
  const requestId = useRef(0);
  const thumbnailRetries = useRef(new Set<string>());

  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    try {
      const assetRowsPromise = backend.listAssets(runtime.projectId);
      const usagePromise = backend.getProjectUsage(runtime.projectId);
      const assetRows = await assetRowsPromise;
      const mappedAssets = (assetRows as Record<string, unknown>[])
        .map(mapAsset)
        .filter((asset) => asset.status === "ready");
      const signedPromise = backend.signAssetPaths(mappedAssets.map((asset) => asset.storagePath))
        .then((data) => ({ data, cause: null }))
        .catch((cause: unknown) => ({ data: [], cause }));
      const [usages, usageRow, signed] = await Promise.all([
        backend.listAssetUsages(runtime.projectId, mappedAssets.map((asset) => asset.id)),
        usagePromise,
        signedPromise,
      ]);
      if (activeRequest !== requestId.current) return usages;
      setAssets(mappedAssets);
      setAssetUsages(usages);
      setUsage(usageRow as Record<string, unknown> | null);
      setPreviewByPath(new Map(signed.data.flatMap((item) => item.signedUrl ? [[item.path, item.signedUrl]] : [])));
      thumbnailRetries.current.clear();
      setThumbnailError(signed.cause
        ? frontendErrorMessage(signed.cause, "No pudimos firmar las miniaturas privadas. Reintenta la carga.")
        : signed.data.some((item) => !item.signedUrl)
          ? "Algunas miniaturas privadas no están disponibles. Puedes reintentarlas individualmente."
          : "");
      setStatus("ready");
      return usages;
    } catch (cause) {
      if (activeRequest !== requestId.current) return [];
      if (!redirectOnUnauthorized(cause)) setMessage(frontendErrorMessage(cause, "No pudimos cargar los activos."));
      setStatus("error");
      return [];
    }
  }, [runtime.projectId]);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("moodboard:assets-changed", refresh);
    return () => window.removeEventListener("moodboard:assets-changed", refresh);
  }, [load]);

  const renewThumbnail = useCallback(async (asset: AssetRecord, automatic = false) => {
    if (automatic && thumbnailRetries.current.has(asset.storagePath)) {
      setPreviewByPath((current) => {
        const next = new Map(current); next.delete(asset.storagePath); return next;
      });
      return;
    }
    if (automatic) thumbnailRetries.current.add(asset.storagePath);
    try {
      const [signed] = await backend.signAssetPaths([asset.storagePath]);
      if (!signed?.signedUrl) throw new Error("La ruta privada no pudo firmarse.");
      setPreviewByPath((current) => new Map(current).set(asset.storagePath, signed.signedUrl!));
    } catch (cause) {
      setPreviewByPath((current) => { const next = new Map(current); next.delete(asset.storagePath); return next; });
      setThumbnailError(frontendErrorMessage(cause, `No pudimos renovar la miniatura de ${asset.originalName}.`));
    }
  }, []);

  const openUsage = useCallback((assetUsage: AssetUsage) => {
    if (assetUsage.boardId !== runtime.boardId) {
      window.location.assign(`/?board=${encodeURIComponent(assetUsage.boardId)}&focus=${encodeURIComponent(assetUsage.itemId)}`);
      return;
    }
    onViewChange("board");
    window.setTimeout(() => focusBoardCard(assetUsage.itemId), 60);
  }, [onViewChange, runtime.boardId]);

  const usagesByAsset = useMemo(() => groupAssetUsages(assetUsages), [assetUsages]);

  const addToBoard = async (asset: AssetRecord) => {
    const imageUrl = previewByPath.get(asset.storagePath);
    if (!imageUrl) { await renewThumbnail(asset); return; }
    setBusyAssetId(asset.id); setMessage("");
    try {
      const result = await actions.addExistingImage({
        assetId: asset.id,
        imagePath: asset.storagePath,
        imageUrl,
        title: asset.originalName.replace(/\.[^.]+$/, ""),
      });
      await load();
      setMessage(result.status === "existing" ? "La referencia ya estaba en este tablero." : `“${asset.originalName}” se añadió al tablero.`);
      openUsage({ assetId: asset.id, boardId: runtime.boardId, boardName: runtime.boardName, itemId: result.cardId, itemTitle: asset.originalName, itemCreatedAt: new Date().toISOString() });
    } catch (cause) {
      const refreshed = await load();
      const existing = refreshed.find((item) => item.assetId === asset.id && item.boardId === runtime.boardId);
      if (existing) openUsage(existing);
      if (!redirectOnUnauthorized(cause)) setMessage(frontendErrorMessage(cause, "No pudimos añadir la referencia al tablero."));
    } finally { setBusyAssetId(null); }
  };

  const deleteAsset = async (asset: AssetRecord) => {
    if (!window.confirm(`¿Eliminar definitivamente “${asset.originalName}” de Referencias? Esta acción solo es posible si ningún tablero la está usando.`)) return;
    setBusyAssetId(asset.id); setMessage("");
    try {
      await backend.markAssetDeleted(asset.id);
      await load();
      setMessage(`“${asset.originalName}” se eliminó de Referencias.`);
    } catch (cause) {
      await load();
      if (!redirectOnUnauthorized(cause)) setMessage(frontendErrorMessage(cause, "No pudimos eliminar el activo."));
    } finally { setBusyAssetId(null); }
  };

  if (status === "loading") return <PanelSkeleton title="Referencias" />;
  if (status === "error") return <main className="content-panel"><SurfaceState tone="error"><span>{message}</span><button className="text-action" type="button" onClick={() => { setStatus("loading"); void load(); }}>Reintentar</button></SurfaceState></main>;
  const bytes = Number(usage?.asset_bytes ?? usage?.assetBytes ?? assets.reduce((sum, asset) => sum + asset.byteSize, 0));
  return <main className="content-panel" id="board-main">
    <header className="content-panel-header"><div><span>Biblioteca del proyecto</span><h1>Referencias</h1><p>Archivos privados disponibles para todos los tableros del proyecto.</p></div><div className="usage-stat"><strong>{assets.length}</strong><span>activos · {formatBytes(bytes)}</span></div></header>
    {thumbnailError ? <div className="inline-feedback asset-library-feedback" role="alert"><span>{thumbnailError}</span><button type="button" onClick={() => void load()}>Recargar miniaturas</button></div> : null}
    {message ? <div className="inline-feedback asset-library-feedback" role="status">{message}</div> : null}
    {assets.length ? <div className="asset-grid">{assets.map((asset) => {
      const assetUsageList = usagesByAsset.get(asset.id) ?? [];
      const localUsage = assetUsageList.find((item) => item.boardId === runtime.boardId);
      const preview = previewByPath.get(asset.storagePath);
      const boardCount = new Set(assetUsageList.map((item) => item.boardId)).size;
      const busy = busyAssetId === asset.id;
      return <article className="asset-tile" key={asset.id} aria-busy={busy || undefined}>
        <div className="asset-preview">{preview ? <Image src={preview} alt={asset.originalName} fill unoptimized sizes="(max-width: 640px) 50vw, 260px" onError={() => void renewThumbnail(asset, true)} /> : <><FileImage size={30} weight="thin" /><span>Miniatura privada no disponible</span><button type="button" onClick={() => void renewThumbnail(asset)}>Reintentar</button></>}</div>
        <div className="asset-meta"><strong title={asset.originalName}>{asset.originalName}</strong><span>{formatBytes(asset.byteSize)} · {formatDate(asset.createdAt)}</span><span className="asset-usage-status" data-local={localUsage ? true : undefined}>{localUsage ? "En este tablero" : boardCount ? `${boardCount} ${boardCount === 1 ? "tablero" : "tableros"}` : "Sin usar"}</span></div>
        {assetUsageList.length ? <details className="asset-usages"><summary>Ver usos ({boardCount})</summary><div>{assetUsageList.map((item) => <button type="button" key={item.itemId} onClick={() => openUsage(item)}><span>{item.boardName}</span><small>{item.itemTitle || "Tarjeta sin título"}</small><ArrowRight size={14} /></button>)}</div></details> : null}
        <footer className="asset-actions">
          {localUsage ? <button className="asset-primary" type="button" onClick={() => openUsage(localUsage)}>Ver en el tablero <ArrowRight size={14} /></button> : runtime.access.role !== "viewer" ? <button className="asset-primary" type="button" disabled={busy || !preview} onClick={() => void addToBoard(asset)}><Plus size={14} /> {busy ? "Añadiendo…" : "Añadir al tablero"}</button> : <span>Sólo lectura</span>}
          {runtime.access.role !== "viewer" ? <button className="asset-delete" type="button" disabled={busy} aria-label={`Eliminar definitivamente ${asset.originalName}`} title="Eliminar de Referencias" onClick={() => void deleteAsset(asset)}><Trash size={16} /></button> : null}
        </footer>
      </article>;
    })}</div> : <SurfaceState>No hay activos todavía. Agrega imágenes desde la barra del tablero.</SurfaceState>}
  </main>;
}

function TeamPanel({ runtime }: { runtime: Extract<WorkspaceRuntime, { kind: "supabase" }> }) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvitation[]>([]);
  const [profiles, setProfiles] = useState(new Map<string, { display_name?: string; avatar_url?: string }>());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [canComment, setCanComment] = useState(true);
  const [status, setStatus] = useState("loading");
  const [feedback, setFeedback] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const load = async () => {
    try {
      const [memberRows, inviteRows] = await Promise.all([backend.listMembers(runtime.projectId), backend.listInvitations(runtime.projectId)]);
      const mapped = (memberRows as Record<string, unknown>[]).map(mapMember);
      const profileRows = await backend.listProfiles(mapped.map((member) => member.userId)) as Array<Record<string, unknown>>;
      setMembers(mapped); setInvites((inviteRows as Record<string, unknown>[]).map(mapInvitation));
      setProfiles(new Map(profileRows.map((profile) => [String(profile.id), profile as { display_name?: string; avatar_url?: string }])));
      setStatus("ready");
    } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos cargar el equipo.")); setStatus("error"); }
  };
  useEffect(() => { void load(); }, [runtime.projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  const invite = async (event: React.FormEvent) => {
    event.preventDefault(); setFeedback(""); setManualUrl("");
    const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: runtime.projectId, email, role, canComment }) });
    const data = await response.json();
    if (!response.ok) {
      if (data.error?.code === "UNAUTHORIZED") { window.location.assign(`/auth?next=${encodeURIComponent(window.location.pathname)}`); return; }
      setFeedback(frontendErrorMessage(data.error, "No pudimos crear la invitación.")); return;
    }
    setFeedback(data.delivery === "manual" ? "Invitación creada. Comparte el enlace seguro." : "Invitación enviada por correo.");
    setManualUrl(data.inviteUrl ?? ""); setEmail(""); await load();
  };
  const updateMember = async (member: ProjectMember, next: { role?: "editor" | "viewer"; canComment?: boolean }) => {
    try {
      await backend.changeMember({ projectId: runtime.projectId, userId: member.userId, role: next.role ?? (member.role === "editor" ? "editor" : "viewer"), canComment: next.canComment ?? member.canComment });
      await load();
    } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos actualizar a esta persona.")); }
  };
  const revokeInvitation = async (invitation: ProjectInvitation) => {
    if (!window.confirm(`¿Revocar la invitación de ${invitation.email}?`)) return;
    try {
      const response = await fetch(`/api/invitations?id=${encodeURIComponent(invitation.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw data.error ?? new Error("No pudimos revocar la invitación.");
      setFeedback("Invitación revocada.");
      await load();
    } catch (cause) {
      if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos revocar la invitación."));
    }
  };
  return <main className="content-panel" id="board-main">
    <header className="content-panel-header"><div><span>Acceso y colaboración</span><h1>Equipo</h1><p>Administra roles, capacidad de comentar e invitaciones pendientes.</p></div><div className="usage-stat"><strong>{members.length}</strong><span>personas</span></div></header>
    {runtime.access.role === "owner" ? <form className="invite-form" onSubmit={invite}>
      <label>Correo<input name="email" type="email" autoComplete="email" spellCheck={false} required value={email} placeholder="persona@estudio.cl" onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Rol<select name="role" value={role} onChange={(event) => setRole(event.target.value as "editor" | "viewer")}><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label>
      <label className="check-field"><input name="can-comment" type="checkbox" checked={canComment} onChange={(event) => setCanComment(event.target.checked)} /> Puede comentar</label>
      <button className="share-button" type="submit"><PaperPlaneTilt size={16} /> Invitar</button>
    </form> : null}
    {manualUrl ? <div className="manual-link"><span>{manualUrl}</span><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(manualUrl); setFeedback("Enlace copiado."); } catch { setFeedback("No pudimos copiar el enlace. Selecciónalo manualmente."); } }}><Copy size={16} /> Copiar</button></div> : null}
    {feedback ? <p className="inline-feedback" role={status === "error" ? "alert" : "status"}>{feedback}</p> : null}
    {status === "loading" ? <PanelRows /> : <div className="member-list">{members.map((member) => {
      const profile = profiles.get(member.userId); const name = profile?.display_name || member.displayName || "Integrante del equipo";
      return <article className="member-row" key={member.userId}><span className="member-avatar">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{name}</strong><span>{member.userId === runtime.user.id ? "Tú" : member.canComment ? "Puede comentar" : "Solo lectura de comentarios"}</span></div>
        {runtime.access.role === "owner" && member.role !== "owner" ? <><select aria-label={`Rol de ${name}`} value={member.role} onChange={(event) => void updateMember(member, { role: event.target.value as "editor" | "viewer" })}><option value="editor">Editor</option><option value="viewer">Viewer</option></select><label className="member-comment-toggle"><input type="checkbox" checked={member.canComment} onChange={(event) => void updateMember(member, { canComment: event.target.checked })} /> Comenta</label><button type="button" aria-label={`Quitar a ${name}`} onClick={async () => { if (!window.confirm(`¿Quitar a ${name} del proyecto?`)) return; try { await backend.removeMember(runtime.projectId, member.userId); await load(); } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos quitar a esta persona.")); } }}><UserMinus size={17} /></button></> : <span className="role-label">{member.role}</span>}
      </article>;
    })}</div>}
    {invites.filter((item) => item.status === "pending").length ? <section className="pending-section"><h2>Invitaciones pendientes</h2>{invites.filter((item) => item.status === "pending").map((item) => <div key={item.id}><span><strong>{item.email}</strong><small>{item.role} · vence {formatDate(item.expiresAt)}</small></span>{runtime.access.role === "owner" ? <button type="button" onClick={() => void revokeInvitation(item)}>Revocar</button> : null}</div>)}</section> : null}
  </main>;
}

const activityLabels: Record<string, string> = { "board.created": "creó un tablero", "board.updated": "actualizó el tablero", "board.archived": "archivó un tablero", "comment.created": "agregó un comentario", "member.added": "sumó a una persona", "asset.created": "subió una referencia" };

function ActivityPanel({ runtime }: { runtime: Extract<WorkspaceRuntime, { kind: "supabase" }> }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]); const [names, setNames] = useState(new Map<string, string>()); const [error, setError] = useState("");
  useEffect(() => { void (async () => { try { const rows = (await backend.listActivity(runtime.projectId)) as Record<string, unknown>[]; const mapped = rows.map(mapActivity); const ids = mapped.flatMap((event) => event.actorId ? [event.actorId] : []); const profiles = await backend.listProfiles(ids) as Record<string, unknown>[]; setNames(new Map(profiles.map((profile) => [String(profile.id), String(profile.display_name || "Integrante")] ))); setEvents(mapped); } catch (cause) { if (!redirectOnUnauthorized(cause)) setError(frontendErrorMessage(cause, "No pudimos cargar la actividad.")); } })(); }, [runtime.projectId]);
  return <main className="content-panel" id="board-main"><header className="content-panel-header"><div><span>Registro del proyecto</span><h1>Actividad</h1><p>Una cronología de decisiones, cambios y colaboración.</p></div></header>{error ? <SurfaceState tone="error">{error}</SurfaceState> : events.length ? <ol className="timeline">{events.map((event) => <li key={event.id}><span className="timeline-mark" /><div><strong>{event.actorId ? names.get(event.actorId) || "Integrante" : "Sistema"}</strong> {activityLabels[event.eventType] || event.eventType.replaceAll("_", " ")}<small>{formatDate(event.createdAt)}</small></div></li>)}</ol> : <SurfaceState>Todavía no hay actividad registrada.</SurfaceState>}</main>;
}

function PanelSkeleton({ title }: { title: string }) { return <main className="content-panel"><header className="content-panel-header"><div><span>Cargando</span><h1>{title}</h1></div></header><PanelRows /></main>; }
function PanelRows() { return <div className="panel-skeleton" aria-label="Cargando"><span /><span /><span /></div>; }

export function UtilityDrawer({ panel, runtime, anchorItem, onClose }: { panel: Exclude<UtilityPanel, null>; runtime: WorkspaceRuntime; anchorItem?: CommentAnchor | null; onClose: () => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLElement>("button, input, textarea")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href]'));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [onClose]);
  return <aside ref={drawerRef} className="utility-drawer" role="dialog" aria-modal="true" aria-label={panel === "search" ? "Buscar" : panel === "comments" ? "Comentarios" : "Notificaciones"}>
    <button className="drawer-close" type="button" onClick={onClose} aria-label="Cerrar panel"><X size={18} /></button>
    {panel === "search" ? <SearchPanel onClose={onClose} /> : panel === "comments" ? <CommentsPanel runtime={runtime} anchorItem={anchorItem} onClose={onClose} /> : <NotificationsPanel runtime={runtime} />}
  </aside>;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { state } = useBoard(); const [query, setQuery] = useState("");
  const results = useMemo(() => { const term = query.trim().toLocaleLowerCase("es"); return term ? state.cards.filter((card) => `${card.title} ${card.content}`.toLocaleLowerCase("es").includes(term)) : []; }, [query, state.cards]);
  return <div className="drawer-content"><span className="drawer-kicker">En este tablero</span><h2>Buscar</h2><label className="search-input"><MagnifyingGlass size={18} /><span className="visually-hidden">Buscar en el tablero</span><input name="board-search" autoComplete="off" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, nota o referencia…" /></label>{query && !results.length ? <SurfaceState>Sin coincidencias para “{query}”.</SurfaceState> : <div className="search-results">{results.map((card) => <button type="button" key={card.id} onClick={() => { onClose(); window.setTimeout(() => document.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)?.focus(), 30); }}><span>{card.type}</span><strong>{card.title || "Sin título"}</strong><small>{card.content || "Elemento visual"}</small></button>)}</div>}</div>;
}

function CommentsPanel({ runtime, anchorItem, onClose }: { runtime: WorkspaceRuntime; anchorItem?: CommentAnchor | null; onClose: () => void }) {
  const [comments, setComments] = useState<BoardComment[]>([]); const [names, setNames] = useState(new Map<string, string>()); const [body, setBody] = useState(""); const [replyTo, setReplyTo] = useState<string | null>(null); const [feedback, setFeedback] = useState("");
  const remote = runtime.kind === "supabase";
  const load = async () => { if (!remote) return; try { const rows = await backend.listComments(runtime.boardId) as Record<string, unknown>[]; const mapped = rows.map(mapComment); const profiles = await backend.listProfiles(mapped.map((comment) => comment.userId)) as Record<string, unknown>[]; setComments(mapped); setNames(new Map(profiles.map((profile) => [String(profile.id), String(profile.display_name || "Colaborador")] ))); } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos cargar los comentarios.")); } };
  useEffect(() => { void load(); }, [remote, remote ? runtime.boardId : "local"]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!remote) return;
    const client = createClient();
    if (!client) return;
    const channel = client.channel(`board:${runtime.boardId}`, { config: { private: true } }).on("broadcast", { event: "board_changed" }, () => void load()).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [remote, remote ? runtime.boardId : "local"]); // eslint-disable-line react-hooks/exhaustive-deps
  const canComment = remote && runtime.access.canComment;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!remote || !body.trim()) return; try { await backend.createComment({ boardId: runtime.boardId, body: body.trim(), itemId: anchorItem?.id, x: anchorItem?.x, y: anchorItem?.y, parentId: replyTo || undefined }); setBody(""); setReplyTo(null); await load(); } catch (cause) { if (!redirectOnUnauthorized(cause)) setFeedback(frontendErrorMessage(cause, "No pudimos publicar el comentario.")); } };
  const roots = comments.filter((comment) => !comment.parentId);
  return <div className="drawer-content"><span className="drawer-kicker">Revisión editorial</span><h2>Comentarios</h2>{anchorItem ? <div className="comment-anchor"><span>Anclado a</span><strong>{anchorItem.title}</strong></div> : canComment ? <button className="text-action comment-place-action" type="button" onClick={() => { window.dispatchEvent(new CustomEvent("moodboard:place-comment")); onClose(); }}>Anclar comentario en el lienzo</button> : null}
    {feedback ? <p className="inline-feedback" role="alert">{feedback}</p> : null}
    <div className="comment-list">{roots.map((comment) => <CommentItem key={comment.id} comment={comment} replies={comments.filter((item) => item.parentId === comment.id)} names={names} runtime={runtime} onReply={() => setReplyTo(comment.id)} onRefresh={load} />)}{!roots.length ? <SurfaceState>No hay comentarios. Abre una conversación sobre el tablero o una tarjeta.</SurfaceState> : null}</div>
    {canComment ? <form className="comment-composer" onSubmit={submit}>{replyTo ? <button type="button" onClick={() => setReplyTo(null)}>Respondiendo · cancelar</button> : null}<label><span className="visually-hidden">Comentario</span><textarea required maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder={anchorItem ? `Comentar sobre ${anchorItem.title}` : "Escribe una observación…"} /></label><button className="share-button" disabled={!body.trim()}><PaperPlaneTilt size={16} /> Publicar</button></form> : <SurfaceState>Tu acceso permite leer esta conversación, pero no publicar.</SurfaceState>}
  </div>;
}

function CommentItem({ comment, replies, names, runtime, onReply, onRefresh }: { comment: BoardComment; replies: BoardComment[]; names: Map<string, string>; runtime: WorkspaceRuntime; onReply: () => void; onRefresh: () => Promise<void> }) {
  const remote = runtime.kind === "supabase"; const author = remote && comment.userId === runtime.user.id; const canResolve = remote && runtime.access.role !== "viewer";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const save = async () => { if (!draft.trim()) return; await backend.updateComment(comment.id, draft.trim()); setEditing(false); await onRefresh(); };
  return <article className="comment-item" data-resolved={Boolean(comment.resolvedAt) || undefined}>
    <header><span className="member-avatar">{(names.get(comment.userId) || "C").slice(0, 2).toUpperCase()}</span><div><strong>{names.get(comment.userId) || "Colaborador"}</strong><small>{formatDate(comment.createdAt)}{comment.editedAt ? " · editado" : ""}</small></div>{comment.resolvedAt ? <CheckCircle size={17} weight="fill" /> : null}</header>
    {comment.itemId ? <span className="comment-location">Tarjeta anclada</span> : comment.positionX != null && comment.positionY != null ? <span className="comment-location">Lienzo · {Math.round(comment.positionX)}, {Math.round(comment.positionY)}</span> : null}
    {editing ? <textarea className="comment-edit" aria-label="Editar comentario" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} /> : <p>{comment.deletedAt ? "Comentario eliminado" : comment.body}</p>}
    {!comment.deletedAt ? <footer>
      {editing ? <><button type="button" onClick={() => { setDraft(comment.body); setEditing(false); }}>Cancelar</button><button type="button" onClick={() => void save()}>Guardar</button></> : <>
        <button type="button" onClick={onReply}>Responder</button>
        {canResolve ? <button type="button" onClick={async () => { await backend.resolveComment(comment.id, !comment.resolvedAt); await onRefresh(); }}>{comment.resolvedAt ? "Reabrir" : "Resolver"}</button> : null}
        {author ? <><button type="button" onClick={() => setEditing(true)}>Editar</button><button type="button" onClick={async () => { await backend.deleteComment(comment.id); await onRefresh(); }}>Eliminar</button></> : null}
      </>}
    </footer> : null}
    {replies.map((reply) => <CommentReply key={reply.id} reply={reply} name={names.get(reply.userId) || "Colaborador"} isAuthor={remote && reply.userId === runtime.user.id} onRefresh={onRefresh} />)}
  </article>;
}

function CommentReply({ reply, name, isAuthor, onRefresh }: { reply: BoardComment; name: string; isAuthor: boolean; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.body);
  return <div className="comment-reply"><strong>{name}</strong>{editing ? <textarea className="comment-edit" aria-label="Editar respuesta" value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} /> : <p>{reply.deletedAt ? "Comentario eliminado" : reply.body}</p>}{isAuthor && !reply.deletedAt ? <div>{editing ? <><button type="button" onClick={() => setEditing(false)}>Cancelar</button><button type="button" onClick={async () => { await backend.updateComment(reply.id, draft.trim()); setEditing(false); await onRefresh(); }}>Guardar</button></> : <><button type="button" onClick={() => setEditing(true)}>Editar</button><button type="button" onClick={async () => { await backend.deleteComment(reply.id); await onRefresh(); }}>Eliminar</button></>}</div> : null}</div>;
}

function NotificationsPanel({ runtime }: { runtime: WorkspaceRuntime }) {
  const [items, setItems] = useState<UserNotification[]>([]); const [error, setError] = useState("");
  const load = async () => { if (runtime.kind !== "supabase") return; try { setItems(((await backend.listNotifications()) as Record<string, unknown>[]).map(mapNotification)); } catch (cause) { if (!redirectOnUnauthorized(cause)) setError(frontendErrorMessage(cause, "No pudimos cargar las notificaciones.")); } };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="drawer-content"><span className="drawer-kicker">Bandeja personal</span><h2>Notificaciones</h2>{items.some((item) => !item.readAt) ? <button className="text-action" type="button" onClick={async () => { await backend.markAllNotificationsRead(); await load(); }}><Check size={15} /> Marcar todas como leídas</button> : null}{error ? <SurfaceState tone="error">{error}</SurfaceState> : <div className="notification-list">{items.map((item) => <button type="button" key={item.id} data-unread={!item.readAt || undefined} onClick={async () => { await backend.markNotificationRead(item.id); await load(); }}><Bell size={17} /><span><strong>{String(item.payload.title || item.type.replaceAll("_", " "))}</strong><small>{String(item.payload.message || formatDate(item.createdAt))}</small></span></button>)}{!items.length ? <SurfaceState>Estás al día. No hay notificaciones nuevas.</SurfaceState> : null}</div>}</div>;
}
