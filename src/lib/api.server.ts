import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status);
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** Anonymous client — used for sign-up / sign-in only. */
export function publicClient(): SupabaseClient<Database> {
  return createClient<Database>(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AuthedRequest = {
  userId: string;
  email: string | undefined;
  supabase: SupabaseClient<Database>;
};

/**
 * Validates the caller's bearer token (issued at login) and returns a client
 * that acts as that user, so row-level policies apply.
 */
export async function requireUser(request: Request): Promise<AuthedRequest | Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return errorResponse("Missing bearer token", 401);

  const key = env("SUPABASE_PUBLISHABLE_KEY");
  const supabase = createClient<Database>(env("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return errorResponse("Invalid or expired session", 401);

  return { userId: data.user.id, email: data.user.email, supabase };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
