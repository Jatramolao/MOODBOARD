import assert from "node:assert/strict";
import test from "node:test";
import { createdBoardId, mapAsset, mapAssetUsage, mapBoard, mapComment, mapProject } from "../../lib/backend/mappers.ts";

test("obtiene el tablero creado desde respuestas escalares o tabulares", () => {
  assert.equal(createdBoardId("board-scalar"), "board-scalar");
  assert.equal(createdBoardId({ board_id: "board-row" }), "board-row");
  assert.equal(createdBoardId([{ board_id: "board-array" }]), "board-array");
});

test("rechaza respuestas sin ID antes de construir board=undefined", () => {
  assert.equal(createdBoardId(undefined), null);
  assert.equal(createdBoardId({ board_id: undefined }), null);
  assert.equal(createdBoardId([]), null);
});

test("mapea proyectos snake_case con el rol de la membresía", () => {
  const project = mapProject({
    id: "project-1",
    owner_id: "owner-1",
    name: "Editorial invierno",
    client_name: "Estudio Norte",
    project_members: [{ role: "editor", can_comment: false }],
    archived_at: null,
    created_at: "2026-08-03T10:00:00Z",
    updated_at: "2026-08-03T11:00:00Z",
  });

  assert.equal(project.ownerId, "owner-1");
  assert.equal(project.role, "editor");
  assert.equal(project.canComment, false);
});

test("normaliza números del tablero entregados como texto", () => {
  const board = mapBoard({
    id: "board-1",
    project_id: "project-1",
    name: "General",
    position: "2",
    version: "8",
    zoom: "0.82",
    archived_at: null,
    created_at: "2026-08-03T10:00:00Z",
    updated_at: "2026-08-03T11:00:00Z",
  });

  assert.equal(board.position, 2);
  assert.equal(board.version, 8);
  assert.equal(board.zoom, 0.82);
});

test("preserva anclas y borrado lógico de comentarios", () => {
  const comment = mapComment({
    id: "comment-1",
    board_id: "board-1",
    item_id: null,
    parent_id: null,
    user_id: "user-1",
    body: "Revisar encuadre",
    position_x: "415.5",
    position_y: "230",
    resolved_at: null,
    resolved_by: null,
    edited_at: null,
    deleted_at: "2026-08-03T12:00:00Z",
    created_at: "2026-08-03T10:00:00Z",
    updated_at: "2026-08-03T12:00:00Z",
  });

  assert.equal(comment.positionX, 415.5);
  assert.equal(comment.positionY, 230);
  assert.ok(comment.deletedAt);
});

test("trata board_id del activo como origen informativo y mapea sus usos", () => {
  const asset = mapAsset({
    id: "asset-1",
    project_id: "project-1",
    board_id: "origin-board",
    storage_path: "project-1/origin-board/image.webp",
    original_name: "image.webp",
    mime_type: "image/webp",
    byte_size: "2048",
    width: "800",
    height: "600",
    status: "ready",
    created_at: "2026-08-12T10:00:00Z",
    deleted_at: null,
  });
  const usage = mapAssetUsage({
    asset_id: "asset-1",
    board_id: "board-2",
    board_name: "Makeup",
    item_id: "item-2",
    item_title: null,
    item_created_at: "2026-08-12T11:00:00Z",
  });

  assert.equal(asset.originBoardId, "origin-board");
  assert.equal("boardId" in asset, false);
  assert.deepEqual(usage, {
    assetId: "asset-1",
    boardId: "board-2",
    boardName: "Makeup",
    itemId: "item-2",
    itemTitle: null,
    itemCreatedAt: "2026-08-12T11:00:00Z",
  });
});
