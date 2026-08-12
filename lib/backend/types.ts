import type { BoardOperation } from "./board-operations";

export type ProjectRole = "owner" | "editor" | "viewer";
export type SharePermission = "view" | "comment";
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type AssetStatus = "uploading" | "ready" | "failed" | "deleted";

export type BackendErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "VERSION_CONFLICT"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INVITATION_EXPIRED"
  | "INVITATION_EMAIL_MISMATCH"
  | "ASSET_IN_USE"
  | "ASSET_ALREADY_ON_BOARD"
  | "CONFLICT"
  | "UNKNOWN";

export type BackendError = {
  code: BackendErrorCode;
  message: string;
  retryable: boolean;
  currentVersion?: number;
};

export type ProjectSummary = {
  id: string;
  ownerId: string;
  name: string;
  clientName: string | null;
  role: ProjectRole;
  canComment: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardSummary = {
  id: string;
  projectId: string;
  name: string;
  position: number;
  version: number;
  zoom: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: ProjectRole;
  canComment: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  email: string;
  role: Exclude<ProjectRole, "owner">;
  canComment: boolean;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type BoardShareLink = {
  id: string;
  boardId: string;
  permission: SharePermission;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
};

export type BoardComment = {
  id: string;
  boardId: string;
  itemId: string | null;
  parentId: string | null;
  userId: string;
  body: string;
  positionX: number | null;
  positionY: number | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetRecord = {
  id: string;
  projectId: string;
  originBoardId: string | null;
  storagePath: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  status: AssetStatus;
  createdAt: string;
  deletedAt: string | null;
};

export type AssetUsage = {
  assetId: string;
  boardId: string;
  boardName: string;
  itemId: string;
  itemTitle: string | null;
  itemCreatedAt: string;
};

export type ActivityEvent = {
  id: number;
  projectId: string;
  boardId: string | null;
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type UserNotification = {
  id: number;
  projectId: string | null;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type ApplyOperationsInput = {
  boardId: string;
  baseVersion: number;
  operationId?: string;
  operations: BoardOperation[];
};

export type ApplyOperationsResult = {
  boardVersion: number;
  applied: boolean;
};

export type SharedBoardPayload = {
  share_id: string;
  permission: SharePermission;
  project: { id: string; name: string };
  board: { id: string; name: string; version: number; zoom: number };
  sections: Array<{
    id: string;
    name: string;
    position: number;
    width: number;
  }>;
  items: Array<Record<string, unknown>>;
  comments: Array<{
    id: string;
    item_id: string | null;
    parent_id: string | null;
    body: string;
    position_x: number | null;
    position_y: number | null;
    resolved_at: string | null;
    created_at: string;
    author: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
};
