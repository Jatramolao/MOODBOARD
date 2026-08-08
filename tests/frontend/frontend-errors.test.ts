import assert from "node:assert/strict";
import test from "node:test";
import { mapBackendError } from "../../lib/backend/errors.ts";
import { frontendErrorMessage, readBackendError } from "../../lib/frontend-errors.ts";
import { safeDestination } from "../../lib/safe-destination.ts";

test("conserva los errores de dominio enviados por el backend", () => {
  const error = readBackendError({
    code: "VERSION_CONFLICT",
    message: "VERSION_CONFLICT:7",
    retryable: true,
    currentVersion: 7,
  });

  assert.equal(error.code, "VERSION_CONFLICT");
  assert.equal(error.currentVersion, 7);
  assert.equal(error.retryable, true);
  assert.match(
    frontendErrorMessage(error, "No se pudo guardar."),
    /Recarga para integrar/,
  );
});

test("muestra la causa validada del RPC sin caer en el mensaje genérico", () => {
  const message = frontendErrorMessage(
    {
      code: "VALIDATION_ERROR",
      message: "VALIDATION_ERROR: asset is not ready",
      retryable: false,
    },
    "No se pudo guardar.",
  );

  assert.match(message, /VALIDATION_ERROR: asset is not ready/);
  assert.notEqual(message, "No se pudo guardar.");
});

test("recorta detalles internos después de un código de dominio", () => {
  const mapped = mapBackendError({
    message: "VALIDATION_ERROR: asset is not ready\nCONTEXT: internal SQL detail",
  });

  assert.equal(mapped.code, "VALIDATION_ERROR");
  assert.equal(mapped.message, "VALIDATION_ERROR: asset is not ready");
  assert.equal(mapBackendError({ message: "duplicate key value" }).message, "CONFLICT");
});

test("traduce límites temporales sin perder los datos del formulario", () => {
  const message = frontendErrorMessage(
    { code: "RATE_LIMITED", message: "RATE_LIMITED", retryable: true },
    "Error genérico",
  );

  assert.match(message, /Conservamos tus datos/);
  assert.match(message, /nuevamente/);
});

test("explica cuotas y permisos con acciones comprensibles", () => {
  assert.match(
    frontendErrorMessage(
      { code: "QUOTA_EXCEEDED", message: "QUOTA_EXCEEDED", retryable: false },
      "Error",
    ),
    /Archiva/,
  );
  assert.equal(
    frontendErrorMessage(
      { code: "FORBIDDEN", message: "FORBIDDEN", retryable: false },
      "Error",
    ),
    "Tu rol no permite realizar esta acción.",
  );
});

test("acepta destinos internos y rechaza redirecciones externas", () => {
  assert.equal(safeDestination("/invite?token=abc"), "/invite?token=abc");
  assert.equal(safeDestination("//evil.example/path"), "/");
  assert.equal(safeDestination("/\\evil.example"), "/");
  assert.equal(safeDestination("https://evil.example"), "/");
});
