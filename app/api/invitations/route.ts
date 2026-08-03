import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, isValidUuid } from "@/lib/backend/validation";
import { jsonError, requestId } from "@/lib/backend/http";

type InvitationBody = {
  projectId?: string;
  email?: string;
  role?: "editor" | "viewer";
  canComment?: boolean;
  expiresHours?: number;
};

async function sendInvitationEmail(input: {
  email: string;
  projectName: string;
  inviteUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return "manual" as const;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: `Invitación a ${input.projectName}`,
      html: `<p>Te invitaron a colaborar en <strong>${escapeHtml(input.projectName)}</strong>.</p><p><a href="${escapeHtml(input.inviteUrl)}">Aceptar invitación</a></p><p>Este enlace es personal y puede expirar.</p>`,
    }),
  });
  if (!response.ok) {
    throw new Error(`EMAIL_DELIVERY_FAILED:${response.status}`);
  }
  return "email" as const;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const body = (await request.json()) as InvitationBody;
    if (!body.projectId || !isValidUuid(body.projectId)) {
      throw new Error("VALIDATION_ERROR: projectId");
    }
    if (!body.email || !isValidEmail(body.email)) {
      throw new Error("VALIDATION_ERROR: email");
    }
    if (body.role && !["editor", "viewer"].includes(body.role)) {
      throw new Error("VALIDATION_ERROR: role");
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("UNAUTHORIZED");
    const [{ data, error }, projectResult] = await Promise.all([
      supabase.rpc("create_project_invitation", {
        p_project_id: body.projectId,
        p_email: body.email,
        p_role: body.role ?? "viewer",
        p_can_comment: body.canComment ?? true,
        p_expires_hours: body.expiresHours ?? 168,
      }),
      supabase.from("projects").select("name").eq("id", body.projectId).single(),
    ]);
    if (error) throw error;
    if (projectResult.error) throw projectResult.error;
    const result = Array.isArray(data) ? data[0] : data;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const inviteUrl = `${origin}/invite?token=${encodeURIComponent(result.invitation_token)}`;
    const delivery = await sendInvitationEmail({
      email: body.email.trim().toLowerCase(),
      projectName: projectResult.data.name,
      inviteUrl,
    });
    return NextResponse.json(
      {
        invitationId: result.invitation_id,
        expiresAt: result.expires_at,
        inviteUrl: delivery === "manual" ? inviteUrl : undefined,
        delivery,
      },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function DELETE(request: Request) {
  const id = requestId(request);
  try {
    const invitationId = new URL(request.url).searchParams.get("id");
    if (!invitationId || !isValidUuid(invitationId)) {
      throw new Error("VALIDATION_ERROR: invitation id");
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_project_invitation", {
      p_invitation_id: invitationId,
    });
    if (error) throw error;
    return NextResponse.json(
      { revoked: true },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return jsonError(error, id);
  }
}
