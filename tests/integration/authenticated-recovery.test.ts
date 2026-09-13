import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createRetryableOperation } from "../../lib/backend/retryable-operation.ts";
import { mapBackendError } from "../../lib/backend/errors.ts";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const qaPath = process.env.TEST_QA_STATE_PATH;
const enabled = Boolean(qaPath && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function account(role: "owner" | "viewer") {
  const qa = JSON.parse(readFileSync(qaPath!, "utf8"));
  const cookies: { name: string; value: string }[] = [];
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => [], setAll: (values) => { cookies.push(...values); } },
  });
  const { error } = await client.auth.signInWithPassword({ email: qa.users[role].email, password: qa.users[role].password });
  assert.equal(error, null, "QA account must authenticate");
  return { client, qa, cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") };
}

test("an active board generates a local link readable anonymously with private images", { skip: !enabled }, async () => {
  const { qa, cookie } = await account("owner");
  const response = await fetch(`${base}/api/share-links`, {
    method: "POST", headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ boardId: qa.project.board_id, permission: "view" }),
  });
  assert.equal(response.status, 201);
  const link = await response.json();
  try {
    assert.equal(new URL(link.shareUrl).origin, new URL(base).origin);
    const token = new URL(link.shareUrl).pathname.split("/").pop();
    const publicResponse = await fetch(`${base}/api/shared/${token}`);
    assert.equal(publicResponse.status, 200);
    const board = await publicResponse.json();
    assert.equal(board.board.id, qa.project.board_id);
    assert.equal(board.assetsConfigured, true);
    const images = board.items.filter((item: { type: string }) => item.type === "image");
    assert.ok(images.length > 0, "QA fixture must contain a private image");
    for (const image of images) {
      assert.ok(image.image_url, "private image must be signed");
      assert.equal((await fetch(image.image_url)).status, 200);
    }
  } finally {
    const revoke = await fetch(`${base}/api/share-links?id=${link.shareId}`, { method: "DELETE", headers: { cookie } });
    assert.equal(revoke.status, 200);
  }
});

test("archived boards cannot generate misleading links or open as an editable workspace", { skip: !enabled }, async () => {
  const { client, qa, cookie } = await account("owner");
  const created = await client.rpc("create_board", { p_project_id: qa.project.project_id, p_name: "QA corrección: tablero archivado" });
  assert.equal(created.error, null);
  const boardId = created.data;
  assert.equal((await client.rpc("set_board_archived", { p_board_id: boardId, p_archived: true })).error, null);
  const response = await fetch(`${base}/api/share-links`, {
    method: "POST", headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ boardId, permission: "view" }),
  });
  assert.equal(response.status, 404);
  const home = await fetch(`${base}/?board=${boardId}`, { redirect: "manual", headers: { cookie } });
  assert.equal(home.status, 307);
  assert.equal(home.headers.get("location"), "/");
});

test("viewer remains unable to create share access", { skip: !enabled }, async () => {
  const { qa, cookie } = await account("viewer");
  const response = await fetch(`${base}/api/share-links`, {
    method: "POST", headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ boardId: qa.project.board_id, permission: "view" }),
  });
  assert.equal(response.status, 403);
});

test("a lost acknowledgement replays exactly once against the versioned RPC", { skip: !enabled }, async () => {
  const { client, qa } = await account("owner");
  const board = await client.from("boards").select("version,zoom").eq("id", qa.second).single();
  assert.equal(board.error, null);
  const initial = board.data!;
  const args = {
    p_board_id: qa.second, p_base_version: Number(initial.version), p_operation_id: crypto.randomUUID(),
    p_operations: [{ type: "board.update", payload: { zoom: Number(initial.zoom) === 1 ? 0.9 : 1 } }],
  };
  let attempts = 0;
  const operation = createRetryableOperation(async (batch: typeof args) => {
    const response = await client.rpc("apply_board_operations", batch);
    if (response.error) throw mapBackendError(response.error);
    attempts++;
    if (attempts === 1) throw new TypeError("Failed to fetch"); // server committed; response lost
    return Array.isArray(response.data) ? response.data[0] : response.data;
  });
  try {
    await assert.rejects(operation.run(args));
    const replay = await operation.run({ ...args, p_operation_id: crypto.randomUUID() });
    assert.equal(Number(replay.board_version), Number(initial.version) + 1);
    const current = await client.from("boards").select("version").eq("id", qa.second).single();
    assert.equal(Number(current.data?.version), Number(initial.version) + 1);
    assert.equal(attempts, 2);
  } finally {
    const restore = await client.rpc("apply_board_operations", {
      p_board_id: qa.second, p_base_version: Number(initial.version) + 1, p_operation_id: crypto.randomUUID(),
      p_operations: [{ type: "board.update", payload: { zoom: Number(initial.zoom) } }],
    });
    assert.equal(restore.error, null, "QA zoom must be restored");
  }
});
