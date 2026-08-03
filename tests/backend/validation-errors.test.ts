import assert from "node:assert/strict";
import test from "node:test";
import { mapBackendError } from "../../lib/backend/errors.ts";
import {
  isValidEmail,
  isValidUuid,
  normalizeName,
  validateOperations,
  validateUploadMetadata,
} from "../../lib/backend/validation.ts";

test("normaliza nombres y valida identificadores", () => {
  assert.equal(normalizeName("  Campaña   Primavera  "), "Campaña Primavera");
  assert.equal(isValidEmail("equipo@estudio.cl"), true);
  assert.equal(isValidEmail("sin-dominio"), false);
  assert.equal(isValidUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isValidUuid("no-es-uuid"), false);
});

test("rechaza lotes vacíos o mal formados", () => {
  assert.throws(() => validateOperations([]), /operations are required/);
  assert.throws(
    () => validateOperations([{ type: "item.update", payload: null } as never]),
    /invalid operation payload/,
  );
});

test("valida tipo y límite de imágenes", () => {
  assert.doesNotThrow(() =>
    validateUploadMetadata({ mimeType: "image/webp", byteSize: 4_000_000 }),
  );
  assert.throws(
    () => validateUploadMetadata({ mimeType: "application/pdf", byteSize: 1 }),
    /unsupported image type/,
  );
  assert.throws(
    () => validateUploadMetadata({ mimeType: "image/jpeg", byteSize: 52_428_801 }),
    /maximum file size/,
  );
});

test("traduce conflictos, cuotas e invitaciones a errores de dominio", () => {
  assert.deepEqual(mapBackendError(new Error("VERSION_CONFLICT:17")), {
    code: "VERSION_CONFLICT",
    message: "VERSION_CONFLICT:17",
    retryable: true,
    currentVersion: 17,
  });
  assert.equal(mapBackendError(new Error("QUOTA_EXCEEDED: project storage")).code, "QUOTA_EXCEEDED");
  assert.equal(mapBackendError({ message: "INVITATION_EXPIRED" }).code, "INVITATION_EXPIRED");
});
