"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("client") ?? "").trim();
  if (!name) redirect("/?setup=missing-name");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_project_with_board", {
    p_name: name,
    p_client_name: clientName || null,
  });

  if (error) {
    redirect(`/?setup=${encodeURIComponent(error.message)}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  redirect(`/?board=${result.board_id}`);
}
