import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const adminCorsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type AuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: HandlerResponse };

const jsonResponse = (statusCode: number, error: string): HandlerResponse => ({
  statusCode,
  headers: adminCorsHeaders,
  body: JSON.stringify({ ok: false, error }),
});

export async function requireAdminUser(event: HandlerEvent): Promise<AuthResult> {
  const authorization = event.headers.authorization || event.headers.Authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { ok: false, response: jsonResponse(401, "Authentication required") };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase authentication is not configured for Admin functions");
    return { ok: false, response: jsonResponse(500, "Admin authentication is not configured") };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return { ok: false, response: jsonResponse(401, "Invalid or expired Admin session") };
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("app_role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Admin role lookup failed:", profileError.message);
      return { ok: false, response: jsonResponse(503, "Unable to validate Admin access") };
    }

    const role = String(profile?.app_role || "");
    if (!["owner", "staff"].includes(role)) {
      return { ok: false, response: jsonResponse(403, "Admin access required") };
    }

    return { ok: true, userId: authData.user.id, role };
  } catch (error) {
    console.error(
      "Admin session validation failed:",
      error instanceof Error ? error.message : String(error),
    );
    return { ok: false, response: jsonResponse(503, "Unable to validate Admin session") };
  }
}
