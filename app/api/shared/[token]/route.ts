import { NextResponse } from "next/server";
import { createAdminClient, createPublicClient } from "@/lib/supabase/admin";
import { jsonError, requestId } from "@/lib/backend/http";
import type { SharedBoardPayload } from "@/lib/backend/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const id = requestId(request);
  try {
    const { token } = await context.params;
    if (!/^[0-9a-f]{64}$/i.test(token)) {
      throw new Error("NOT_FOUND");
    }
    const publicClient = createPublicClient();
    const { data, error } = await publicClient.rpc("resolve_board_share_link", {
      p_token: token,
    });
    if (error) throw error;
    if (!data || typeof data !== "object") throw new Error("NOT_FOUND");
    const payload = data as SharedBoardPayload;
    const privatePaths = payload.items
      .map((item) => item.image_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);
    const signedByPath = new Map<string, string>();
    const admin = createAdminClient();
    if (privatePaths.length && admin) {
      const signed = await admin.storage
        .from("board-assets")
        .createSignedUrls(privatePaths, 60 * 60);
      if (signed.error) throw signed.error;
      signed.data.forEach((asset) => {
        if (asset.path && asset.signedUrl) signedByPath.set(asset.path, asset.signedUrl);
      });
    }
    return NextResponse.json(
      {
        ...payload,
        items: payload.items.map((item) => ({
          ...item,
          image_url:
            (typeof item.image_path === "string" && signedByPath.get(item.image_path)) ||
            item.source_url ||
            null,
        })),
        assetsConfigured: privatePaths.length === 0 || Boolean(admin),
      },
      {
        headers: {
          "cache-control": "private, no-store",
          "x-request-id": id,
        },
      },
    );
  } catch (error) {
    return jsonError(error, id);
  }
}
