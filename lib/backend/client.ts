"use client";

import { createClient } from "@/lib/supabase/client";
import { mapBackendError } from "./errors";
import { mapAssetUsage } from "./mappers";
import { validateOperations } from "./validation";
import type {
  ApplyOperationsInput,
  ApplyOperationsResult,
  SignedAssetUrl,
  SharePermission,
  SharedBoardPayload,
} from "./types";

const ASSET_BUCKET = "board-assets";
const SIGNED_ASSET_TTL_SECONDS = 60 * 60 * 8;

function requireClient() {
  const client = createClient();
  if (!client) throw new Error("Supabase no está configurado.");
  return client;
}

async function unwrap<T>(request: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await request;
  if (error) throw mapBackendError(error);
  return data;
}

export const backend = {
  async listProjects() {
    const client = requireClient();
    return unwrap(
      client
        .from("projects")
        .select("id,owner_id,name,client_name,status,archived_at,created_at,updated_at,project_members!inner(role,can_comment)")
        .order("updated_at", { ascending: false }),
    );
  },

  async createProject(name: string, clientName?: string) {
    const client = requireClient();
    return unwrap(
      client.rpc("create_project_with_board", {
        p_name: name,
        p_client_name: clientName || null,
      }),
    );
  },

  async updateProject(projectId: string, name: string, clientName?: string) {
    await unwrap(
      requireClient().rpc("update_project", {
        p_project_id: projectId,
        p_name: name,
        p_client_name: clientName || null,
      }),
    );
  },

  async listBoards(projectId: string, includeArchived = false) {
    const client = requireClient();
    let query = client
      .from("boards")
      .select("id,project_id,name,position,version,zoom,archived_at,created_at,updated_at")
      .eq("project_id", projectId)
      .order("position");
    if (!includeArchived) query = query.is("archived_at", null);
    return unwrap(query);
  },

  async createBoard(projectId: string, name?: string) {
    return unwrap(
      requireClient().rpc("create_board", {
        p_project_id: projectId,
        p_name: name || "Nuevo tablero",
      }),
    );
  },

  async duplicateBoard(boardId: string, name?: string) {
    return unwrap(
      requireClient().rpc("duplicate_board", {
        p_board_id: boardId,
        p_name: name || null,
      }),
    );
  },

  async updateBoard(boardId: string, name: string) {
    await unwrap(
      requireClient().rpc("update_board", {
        p_board_id: boardId,
        p_name: name,
      }),
    );
  },

  async reorderBoards(projectId: string, boardIds: string[]) {
    await unwrap(
      requireClient().rpc("reorder_boards", {
        p_project_id: projectId,
        p_board_ids: boardIds,
      }),
    );
  },

  async setBoardArchived(boardId: string, archived: boolean) {
    await unwrap(
      requireClient().rpc("set_board_archived", {
        p_board_id: boardId,
        p_archived: archived,
      }),
    );
  },

  async setProjectArchived(projectId: string, archived: boolean) {
    await unwrap(
      requireClient().rpc("set_project_archived", {
        p_project_id: projectId,
        p_archived: archived,
      }),
    );
  },

  async applyOperations(input: ApplyOperationsInput): Promise<ApplyOperationsResult> {
    validateOperations(input.operations);
    const data = await unwrap(
      requireClient().rpc("apply_board_operations", {
        p_board_id: input.boardId,
        p_base_version: input.baseVersion,
        p_operation_id: input.operationId ?? crypto.randomUUID(),
        p_operations: input.operations,
      }),
    );
    const result = Array.isArray(data) ? data[0] : data;
    return {
      boardVersion: Number(result.board_version),
      applied: Boolean(result.applied),
    };
  },

  async operationsSince(boardId: string, version: number) {
    return unwrap(
      requireClient().rpc("get_board_operations_since", {
        p_board_id: boardId,
        p_after_version: version,
        p_limit: 500,
      }),
    );
  },

  async createComment(input: {
    boardId: string;
    body: string;
    itemId?: string;
    parentId?: string;
    x?: number;
    y?: number;
  }) {
    return unwrap(
      requireClient().rpc("create_board_comment", {
        p_board_id: input.boardId,
        p_body: input.body,
        p_item_id: input.itemId ?? null,
        p_parent_id: input.parentId ?? null,
        p_position_x: input.x ?? null,
        p_position_y: input.y ?? null,
      }),
    );
  },

  async listComments(boardId: string) {
    return unwrap(
      requireClient()
        .from("comments")
        .select("id,board_id,item_id,parent_id,user_id,body,position_x,position_y,resolved_at,resolved_by,edited_at,deleted_at,created_at,updated_at")
        .eq("board_id", boardId)
        .order("created_at"),
    );
  },

  async resolveComment(commentId: string, resolved: boolean) {
    await unwrap(
      requireClient().rpc("set_comment_resolved", {
        p_comment_id: commentId,
        p_resolved: resolved,
      }),
    );
  },

  async updateComment(commentId: string, body: string) {
    await unwrap(
      requireClient().rpc("update_board_comment", {
        p_comment_id: commentId,
        p_body: body,
      }),
    );
  },

  async deleteComment(commentId: string) {
    await unwrap(
      requireClient().rpc("delete_board_comment", {
        p_comment_id: commentId,
      }),
    );
  },

  async listMembers(projectId: string) {
    return unwrap(
      requireClient()
        .from("project_members")
        .select("project_id,user_id,role,can_comment,created_at")
        .eq("project_id", projectId)
        .order("created_at"),
    );
  },

  async changeMember(input: {
    projectId: string;
    userId: string;
    role: "owner" | "editor" | "viewer";
    canComment: boolean;
  }) {
    await unwrap(
      requireClient().rpc("change_project_member", {
        p_project_id: input.projectId,
        p_user_id: input.userId,
        p_role: input.role,
        p_can_comment: input.canComment,
      }),
    );
  },

  async removeMember(projectId: string, userId: string) {
    await unwrap(
      requireClient().rpc("remove_project_member", {
        p_project_id: projectId,
        p_user_id: userId,
      }),
    );
  },

  async listInvitations(projectId: string) {
    return unwrap(
      requireClient()
        .from("project_invitations")
        .select("id,project_id,email,role,can_comment,status,expires_at,accepted_at,revoked_at,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    );
  },

  async acceptInvitation(token: string) {
    return unwrap(
      requireClient().rpc("accept_project_invitation", { p_token: token }),
    );
  },

  async createShareLink(
    boardId: string,
    permission: SharePermission,
    expiresAt?: string,
  ) {
    return unwrap(
      requireClient().rpc("create_board_share_link", {
        p_board_id: boardId,
        p_permission: permission,
        p_expires_at: expiresAt ?? null,
      }),
    );
  },

  async resolveShareLink(token: string): Promise<SharedBoardPayload> {
    return unwrap(
      requireClient().rpc("resolve_board_share_link", { p_token: token }),
    ) as Promise<SharedBoardPayload>;
  },

  async createSharedComment(input: {
    token: string;
    body: string;
    itemId?: string;
    parentId?: string;
    x?: number;
    y?: number;
  }) {
    return unwrap(
      requireClient().rpc("create_shared_comment", {
        p_token: input.token,
        p_body: input.body,
        p_item_id: input.itemId ?? null,
        p_parent_id: input.parentId ?? null,
        p_position_x: input.x ?? null,
        p_position_y: input.y ?? null,
      }),
    );
  },

  async listShareLinks(boardId: string) {
    return unwrap(
      requireClient()
        .from("board_share_links")
        .select("id,board_id,permission,expires_at,revoked_at,last_accessed_at,created_at")
        .eq("board_id", boardId)
        .order("created_at", { ascending: false }),
    );
  },

  async listAssets(projectId: string, limit = 100) {
    return unwrap(
      requireClient()
        .from("assets")
        .select("id,project_id,board_id,storage_path,original_name,mime_type,byte_size,width,height,status,created_at,deleted_at")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(limit, 500))),
    );
  },

  async signAssetPaths(storagePaths: string[]): Promise<SignedAssetUrl[]> {
    const paths = [...new Set(storagePaths)].filter(Boolean);
    if (!paths.length) return [];
    const { data, error } = await requireClient().storage
      .from(ASSET_BUCKET)
      .createSignedUrls(paths, SIGNED_ASSET_TTL_SECONDS);
    if (error) throw mapBackendError(error);
    return (data ?? []).map((entry: { path: string; signedUrl: string | null; error?: string | null }) => ({
      path: entry.path,
      signedUrl: entry.signedUrl,
      error: entry.error ?? null,
    }));
  },

  async markAssetDeleted(assetId: string) {
    await unwrap(
      requireClient().rpc("mark_asset_deleted", { p_asset_id: assetId }),
    );
  },

  async listAssetUsages(projectId: string, assetIds?: string[]) {
    const data = await unwrap(
      requireClient().rpc("list_asset_usages", {
        p_project_id: projectId,
        p_asset_ids: assetIds ?? null,
      }),
    );
    return (Array.isArray(data) ? data : []).map((row) =>
      mapAssetUsage(row as Record<string, unknown>),
    );
  },

  async getProjectUsage(projectId: string) {
    const data = await unwrap(
      requireClient().rpc("get_project_usage", { p_project_id: projectId }),
    );
    return Array.isArray(data) ? data[0] ?? null : data;
  },

  async listProfiles(userIds: string[]) {
    if (!userIds.length) return [];
    return unwrap(
      requireClient()
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", [...new Set(userIds)]),
    );
  },

  async listActivity(projectId: string, limit = 100) {
    return unwrap(
      requireClient()
        .from("activity_events")
        .select("id,project_id,board_id,actor_id,event_type,entity_type,entity_id,metadata,created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(Math.max(1, Math.min(limit, 500))),
    );
  },

  async listNotifications() {
    return unwrap(
      requireClient()
        .from("notifications")
        .select("id,project_id,type,payload,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    );
  },

  async markNotificationRead(notificationId: number) {
    await unwrap(
      requireClient().rpc("mark_notification_read", {
        p_notification_id: notificationId,
      }),
    );
  },

  async markAllNotificationsRead() {
    await unwrap(requireClient().rpc("mark_all_notifications_read"));
  },
};
