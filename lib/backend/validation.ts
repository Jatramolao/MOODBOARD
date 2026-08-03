import type { BoardOperation } from "./board-operations";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidEmail = (value: string) =>
  value.length <= 320 && EMAIL_PATTERN.test(value.trim());

export const isValidUuid = (value: string) => UUID_PATTERN.test(value);

export function normalizeName(value: string, maximum = 90) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("VALIDATION_ERROR: name");
  return normalized.slice(0, maximum);
}

export function validateOperations(operations: BoardOperation[]) {
  const allowedOperations = new Set([
    "board.update",
    "section.create",
    "section.update",
    "section.delete",
    "item.create",
    "item.update",
    "item.delete",
  ]);
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("VALIDATION_ERROR: operations are required");
  }
  if (operations.length > 100) {
    throw new Error("VALIDATION_ERROR: maximum 100 operations");
  }
  operations.forEach((operation) => {
    if (!operation || !allowedOperations.has(operation.type)) {
      throw new Error("VALIDATION_ERROR: invalid operation");
    }
    if (!operation.payload || typeof operation.payload !== "object") {
      throw new Error("VALIDATION_ERROR: invalid operation payload");
    }
  });
  return operations;
}

export function validateUploadMetadata(input: {
  mimeType: string;
  byteSize: number;
}) {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
  ]);
  if (!allowedTypes.has(input.mimeType)) {
    throw new Error("VALIDATION_ERROR: unsupported image type");
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize < 0 || input.byteSize > 52_428_800) {
    throw new Error("VALIDATION_ERROR: maximum file size is 50 MB");
  }
  return input;
}
