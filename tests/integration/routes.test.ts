import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test("el callback inválido vuelve a autenticación sin aceptar un destino externo", async () => {
  const response = await fetch(
    `${baseUrl}/auth/callback?next=https://evil.example`,
    { redirect: "manual" },
  );

  assert.ok([307, 308].includes(response.status));
  assert.equal(response.headers.get("location"), `${baseUrl}/auth?error=callback`);
});

test("un token compartido malformado devuelve un error 404 normalizado", async () => {
  const response = await fetch(`${baseUrl}/api/shared/invalid`, {
    headers: { "x-request-id": "qa-shared-invalid" },
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-request-id"), "qa-shared-invalid");
  assert.equal(body.error.code, "NOT_FOUND");
});

test("invitaciones y enlaces rechazan identificadores inválidos antes de consultar Supabase", async () => {
  const invitation = await fetch(`${baseUrl}/api/invitations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: "invalid", email: "qa@example.invalid" }),
  });
  const share = await fetch(`${baseUrl}/api/share-links`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ boardId: "invalid", permission: "view" }),
  });

  assert.equal(invitation.status, 400);
  assert.equal((await invitation.json()).error.code, "VALIDATION_ERROR");
  assert.equal(share.status, 400);
  assert.equal((await share.json()).error.code, "VALIDATION_ERROR");
});
