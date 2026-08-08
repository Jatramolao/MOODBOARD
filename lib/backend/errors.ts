import type { BackendError, BackendErrorCode } from "./types";

const knownCodes: BackendErrorCode[] = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "VERSION_CONFLICT",
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "INVITATION_EXPIRED",
  "INVITATION_EMAIL_MISMATCH",
  "ASSET_IN_USE",
  "CONFLICT",
];

export function mapBackendError(error: unknown): BackendError {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Error inesperado del backend.";
  const code = knownCodes.find((candidate) => rawMessage.includes(candidate)) ??
    (rawMessage.toLowerCase().includes("duplicate") ? "CONFLICT" : "UNKNOWN");
  const versionMatch = rawMessage.match(/VERSION_CONFLICT:(\d+)/);
  const codeIndex = rawMessage.indexOf(code);
  const domainMessage = code === "UNKNOWN"
    ? "Error inesperado del backend."
    : codeIndex >= 0
      ? rawMessage.slice(codeIndex).split("\n", 1)[0].slice(0, 240)
      : code;
  return {
    code,
    message: domainMessage,
    retryable: code === "VERSION_CONFLICT" || code === "RATE_LIMITED",
    currentVersion: versionMatch ? Number(versionMatch[1]) : undefined,
  };
}
