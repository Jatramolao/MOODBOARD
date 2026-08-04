import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeDestination } from "@/lib/safe-destination";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeDestination(next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
}
