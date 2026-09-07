import { NextResponse, type NextRequest } from "next/server";
import type { AuthUser } from "@/lib/auth/types";
import { AuthError } from "./errors";
import { currentUser } from "./sessions";

export function checkOrigin(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  let valid = false;
  try {
    const source = new URL(origin ?? "");
    const configured = process.env.COMPOSEERR_ORIGIN;
    valid = configured
      ? source.origin === new URL(configured).origin
      : ["https:", "http:"].includes(source.protocol) &&
        source.host === (request.headers.get("host") ?? new URL(request.url).host) &&
        source.protocol === (request.headers.get("x-forwarded-proto")
          ? request.headers.get("x-forwarded-proto") + ":"
          : new URL(request.url).protocol);
  } catch { /* Reject missing or malformed origins. */ }
  if (!valid || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AuthError("Request origin is not allowed.", 403);
  }
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AuthError("Send a JSON request body.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError("Invalid request body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new AuthError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid request body.");
  } finally {
    reader.releaseLock();
  }
}

function failure(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ ok: false, error: error.message }, {
      status: error.status,
      headers: error.status === 429 ? { "Retry-After": "300" } : undefined,
    });
  }
  console.error("Authentication or protected request failed.");
  return NextResponse.json({ ok: false, error: "Could not complete this request." }, { status: 500 });
}

function privateResponse(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function withPublicAuth(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      checkOrigin(request);
      return privateResponse(await handler(request));
    } catch (error) {
      return privateResponse(failure(error));
    }
  };
}

export function withAuth<T extends Request = NextRequest>(
  handler: (request: T, user: AuthUser) => Promise<Response>,
  options: { admin?: boolean; allowPasswordChange?: boolean } = {},
) {
  return async (request: T) => {
    try {
      const user = await currentUser();
      if (!user) throw new AuthError("Please sign in to continue.", 401);
      if (user.mustChangePassword && !options.allowPasswordChange) {
        throw new AuthError("Change your password in General settings first.", 403);
      }
      if (options.admin && user.role !== "admin") throw new AuthError("Administrator access is required.", 403);
      checkOrigin(request);
      return privateResponse(await handler(request, user));
    } catch (error) {
      return privateResponse(failure(error));
    }
  };
}
