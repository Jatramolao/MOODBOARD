import { NextResponse } from "next/server";
import { mapBackendError } from "./errors";

export function jsonError(error: unknown, requestId: string) {
  const mapped = mapBackendError(error);
  const status =
    mapped.code === "UNAUTHORIZED"
      ? 401
      : mapped.code === "FORBIDDEN"
        ? 403
        : mapped.code === "INVITATION_EMAIL_MISMATCH"
          ? 403
        : mapped.code === "NOT_FOUND"
          ? 404
          : mapped.code === "INVITATION_EXPIRED"
            ? 410
          : mapped.code === "VALIDATION_ERROR"
            ? 400
            : mapped.code === "VERSION_CONFLICT" ||
                mapped.code === "CONFLICT" ||
                mapped.code === "QUOTA_EXCEEDED" ||
                mapped.code === "ASSET_IN_USE"
              ? 409
              : mapped.code === "RATE_LIMITED"
                ? 429
                : 500;
  return NextResponse.json(
    { error: mapped, requestId },
    { status, headers: { "x-request-id": requestId } },
  );
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}
