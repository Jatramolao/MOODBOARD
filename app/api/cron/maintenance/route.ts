import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, requestId } from "@/lib/backend/http";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new Error("FORBIDDEN");
    }
    const admin = createAdminClient();
    if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

    const staleBefore = new Date(Date.now() - DAY_MS).toISOString();
    const [{ data: staleAssets, error: assetsError }, invitations, rateLimits] =
      await Promise.all([
        admin
          .from("assets")
          .select("id,storage_path")
          .in("status", ["uploading", "failed", "deleted"])
          .lt("updated_at", staleBefore)
          .limit(500),
        admin
          .from("project_invitations")
          .update({ status: "expired" })
          .eq("status", "pending")
          .lt("expires_at", new Date().toISOString()),
        admin.from("rate_limit_events").delete().lt("created_at", staleBefore),
      ]);
    if (assetsError) throw assetsError;
    if (invitations.error) throw invitations.error;
    if (rateLimits.error) throw rateLimits.error;

    const paths = (staleAssets ?? []).map((asset) => asset.storage_path);
    if (paths.length) {
      const removed = await admin.storage.from("board-assets").remove(paths);
      if (removed.error) throw removed.error;
      const ids = (staleAssets ?? []).map((asset) => asset.id);
      const marked = await admin
        .from("assets")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .in("id", ids);
      if (marked.error) throw marked.error;
    }

    return NextResponse.json(
      { cleanedAssets: paths.length, completedAt: new Date().toISOString() },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return jsonError(error, id);
  }
}
