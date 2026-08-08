import type { BackendError, BackendErrorCode } from "./backend/types";
import { safeDestination } from "./safe-destination.ts";

export function readBackendError(error: unknown): BackendError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const candidate = error as Partial<BackendError>;
    return {
      code: (candidate.code ?? "UNKNOWN") as BackendErrorCode,
      message: String(candidate.message ?? "Error inesperado."),
      retryable: Boolean(candidate.retryable),
      currentVersion: candidate.currentVersion,
    };
  }
  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Error inesperado.",
    retryable: false,
  };
}

export function frontendErrorMessage(error: unknown, fallback: string) {
  const mapped = readBackendError(error);
  if (mapped.code === "VERSION_CONFLICT") return "El tablero cambió en otra sesión. Recarga para integrar la versión más reciente antes de continuar.";
  if (mapped.code === "VALIDATION_ERROR") return mapped.message === "VALIDATION_ERROR"
    ? "No se pudo guardar porque un dato del tablero ya no es válido. Revisa el cambio e inténtalo nuevamente."
    : `No se pudo guardar (${mapped.message}). Revisa el cambio e inténtalo nuevamente.`;
  if (mapped.code === "RATE_LIMITED") return "Alcanzaste el límite temporal de solicitudes. Conservamos tus datos; inténtalo nuevamente en unos minutos.";
  if (mapped.code === "QUOTA_EXCEEDED") return "El proyecto alcanzó su límite activo. Archiva un proyecto, tablero o activo que ya no necesites y vuelve a intentarlo.";
  if (mapped.code === "FORBIDDEN") return "Tu rol no permite realizar esta acción.";
  if (mapped.code === "ASSET_IN_USE") return "Este activo todavía está utilizado en el tablero.";
  return mapped.message && !["Error inesperado.", "Error inesperado del backend."].includes(mapped.message)
    ? mapped.message
    : fallback;
}

export function redirectOnUnauthorized(error: unknown, destination?: string) {
  const mapped = readBackendError(error);
  if (mapped.code !== "UNAUTHORIZED" || typeof window === "undefined") return false;
  const next = safeDestination(destination, `${window.location.pathname}${window.location.search}`);
  window.location.assign(`/auth?next=${encodeURIComponent(next)}`);
  return true;
}
