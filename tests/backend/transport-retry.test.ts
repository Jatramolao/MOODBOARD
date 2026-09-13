import { test } from "node:test";
import assert from "node:assert/strict";
import { mapBackendError } from "../../lib/backend/errors.ts";

test("a lost fetch response is retryable without exposing transport details", () => {
  const error = mapBackendError(new TypeError("Failed to fetch"));
  assert.equal(error.retryable, true);
  assert.equal(error.code, "UNKNOWN");
  assert.ok(!error.message.includes("fetch"));
});

test("a permission failure is not a transport retry", () => {
  assert.equal(mapBackendError(new Error("FORBIDDEN")).retryable, false);
});
