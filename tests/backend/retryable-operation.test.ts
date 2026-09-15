import test from "node:test";
import assert from "node:assert/strict";
import { createRetryableOperation } from "../../lib/backend/retryable-operation.ts";

test("replays the unconfirmed operation, not a new operation identity", async () => {
  const sent: string[] = [];
  const operation = createRetryableOperation(async (id: string) => {
    sent.push(id);
    if (sent.length === 1) throw new TypeError("Failed to fetch");
    return 2;
  });
  await assert.rejects(operation.run("original"));
  assert.equal(await operation.run("replacement"), 2);
  assert.deepEqual(sent, ["original", "original"]);
  await operation.run("next");
  assert.deepEqual(sent, ["original", "original", "next"]);
});

test("retains base version and payload through multiple lost responses", async () => {
  const sent: { id: string; base: number; content: string }[] = [];
  const operation = createRetryableOperation(async (batch: typeof sent[number]) => {
    sent.push(batch);
    if (sent.length < 3) throw new TypeError("fetch failed");
  });
  const first = { id: "batch-a", base: 8, content: "original" };
  await assert.rejects(operation.run(first));
  await assert.rejects(operation.run({ id: "batch-b", base: 9, content: "newer" }));
  await operation.run({ id: "batch-c", base: 10, content: "latest" });
  assert.deepEqual(sent, [first, first, first]);
  assert.equal(operation.hasPending(), false);
});

test("a permanent rejection does not poison the next operation", async () => {
  const sent: string[] = [];
  const operation = createRetryableOperation(async (id: string) => {
    sent.push(id);
    if (id === "forbidden") throw new Error("FORBIDDEN");
  }, () => false);
  await assert.rejects(operation.run("forbidden"));
  assert.equal(operation.hasPending(), false);
  await operation.run("valid");
  assert.deepEqual(sent, ["forbidden", "valid"]);
});
