import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

export const adminCorsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type AuthResult =
  | { ok: true; user: Record<string, unknown> }
  | { ok: false; response: HandlerResponse };

const jsonResponse = (statusCode: number, error: string): HandlerResponse => ({
  statusCode,
  headers: adminCorsHeaders,
  body: JSON.stringify({ ok: false, error }),
});

export async function requireBase44User(event: HandlerEvent): Promise<AuthResult> {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, response: jsonResponse(401, "Authentication required") };
  }

  const appId = process.env.VITE_BASE44_APP_ID || process.env.BASE44_APP_ID;
  const backendUrl = process.env.VITE_BASE44_BACKEND_URL || process.env.BASE44_BACKEND_URL;
  if (!appId || !backendUrl) {
    console.error("Base44 authentication is not configured for Admin functions");
    return { ok: false, response: jsonResponse(500, "Admin authentication is not configured") };
  }

  try {
    const validationUrl =
      `${backendUrl.replace(/\/+$/, "")}/api/apps/${encodeURIComponent(appId)}/entities/User/me`;
    const validation = await fetch(validationUrl, {
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "X-App-Id": appId,
      },
    });

    if (!validation.ok) {
      return {
        ok: false,
        response: jsonResponse(validation.status === 403 ? 403 : 401, "Invalid or expired Admin session"),
      };
    }

    const user = await validation.json();
    if (!user || typeof user !== "object") {
      return { ok: false, response: jsonResponse(401, "Invalid Admin session") };
    }

    return { ok: true, user: user as Record<string, unknown> };
  } catch (error) {
    console.error(
      "Admin session validation failed:",
      error instanceof Error ? error.message : String(error),
    );
    return { ok: false, response: jsonResponse(503, "Unable to validate Admin session") };
  }
}
