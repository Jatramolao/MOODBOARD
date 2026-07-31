"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, hasSupabaseEnv } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!hasSupabaseEnv()) return null;
  if (browserClient) return browserClient;

  const { url, publishableKey } = getSupabaseEnv();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
