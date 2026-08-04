import type {
  ActivityEvent,
  AssetRecord,
  BoardComment,
  BoardShareLink,
  BoardSummary,
  ProjectInvitation,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
  UserNotification,
} from "./types";

type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const nullableText = (value: unknown) => (typeof value === "string" ? value : null);

export function mapProject(row: Row): ProjectSummary {
  const membership = Array.isArray(row.project_members) ? row.project_members[0] as Row | undefined : undefined;
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    name: text(row.name),
    clientName: nullableText(row.client_name),
    role: (membership?.role ?? "viewer") as ProjectRole,
    canComment: Boolean(membership?.can_comment),
    archivedAt: nullableText(row.archived_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapBoard(row: Row): BoardSummary {
  return {
    id: text(row.id), projectId: text(row.project_id), name: text(row.name),
    position: Number(row.position), version: Number(row.version), zoom: Number(row.zoom),
    archivedAt: nullableText(row.archived_at), createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}

export function mapMember(row: Row): ProjectMember {
  return {
    projectId: text(row.project_id), userId: text(row.user_id), role: (row.role ?? "viewer") as ProjectRole,
    canComment: Boolean(row.can_comment), displayName: nullableText(row.display_name), avatarUrl: nullableText(row.avatar_url),
    createdAt: text(row.created_at),
  };
}

export function mapInvitation(row: Row): ProjectInvitation {
  return {
    id: text(row.id), projectId: text(row.project_id), email: text(row.email),
    role: (row.role ?? "viewer") as "editor" | "viewer", canComment: Boolean(row.can_comment),
    status: (row.status ?? "pending") as ProjectInvitation["status"], expiresAt: text(row.expires_at),
    acceptedAt: nullableText(row.accepted_at), revokedAt: nullableText(row.revoked_at), createdAt: text(row.created_at),
  };
}

export function mapComment(row: Row): BoardComment {
  return {
    id: text(row.id), boardId: text(row.board_id), itemId: nullableText(row.item_id), parentId: nullableText(row.parent_id),
    userId: text(row.user_id), body: text(row.body), positionX: row.position_x == null ? null : Number(row.position_x),
    positionY: row.position_y == null ? null : Number(row.position_y), resolvedAt: nullableText(row.resolved_at),
    resolvedBy: nullableText(row.resolved_by), editedAt: nullableText(row.edited_at), deletedAt: nullableText(row.deleted_at),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}

export function mapShareLink(row: Row): BoardShareLink {
  return {
    id: text(row.id), boardId: text(row.board_id), permission: row.permission === "comment" ? "comment" : "view",
    expiresAt: nullableText(row.expires_at), revokedAt: nullableText(row.revoked_at), lastAccessedAt: nullableText(row.last_accessed_at),
    createdAt: text(row.created_at),
  };
}

export function mapAsset(row: Row): AssetRecord {
  return {
    id: text(row.id), projectId: text(row.project_id), boardId: nullableText(row.board_id), storagePath: text(row.storage_path),
    originalName: text(row.original_name), mimeType: text(row.mime_type), byteSize: Number(row.byte_size),
    width: row.width == null ? null : Number(row.width), height: row.height == null ? null : Number(row.height),
    status: (row.status ?? "ready") as AssetRecord["status"], createdAt: text(row.created_at), deletedAt: nullableText(row.deleted_at),
  };
}

export function mapActivity(row: Row): ActivityEvent {
  return {
    id: Number(row.id), projectId: text(row.project_id), boardId: nullableText(row.board_id), actorId: nullableText(row.actor_id),
    eventType: text(row.event_type), entityType: text(row.entity_type), entityId: nullableText(row.entity_id),
    metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>, createdAt: text(row.created_at),
  };
}

export function mapNotification(row: Row): UserNotification {
  return {
    id: Number(row.id), projectId: nullableText(row.project_id), type: text(row.type),
    payload: (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>,
    readAt: nullableText(row.read_at), createdAt: text(row.created_at),
  };
}
