import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonError, requestId } from "@/lib/backend/http";
import { isValidUuid } from "@/lib/backend/validation";

type ShareBody = {
  boardId?: string;
  permission?: "view" | "comment";
  expiresAt?: string | null;
};

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const body = (await request.json()) as ShareBody;
    if (!body.boardId || !isValidUuid(body.boardId)) {
      throw new Error("VALIDATION_ERROR: boardId");
    }
    if (body.permission && !["view", "comment"].includes(body.permission)) {
      throw new Error("VALIDATION_ERROR: permission");
    }
    if (body.expiresAt && Number.isNaN(Date.parse(body.expiresAt))) {
      throw new Error("VALIDATION_ERROR: expiresAt");
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_board_share_link", {
      p_board_id: body.boardId,
      p_permission: body.permission ?? "view",
      p_expires_at: body.expiresAt ?? null,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return NextResponse.json(
      {
        shareId: result.share_id,
        shareUrl: `${origin}/share/${encodeURIComponent(result.share_token)}`,
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
    const shareId = new URL(request.url).searchParams.get("id");
    if (!shareId || !isValidUuid(shareId)) {
      throw new Error("VALIDATION_ERROR: share id");
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_board_share_link", {
      p_share_id: shareId,
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
