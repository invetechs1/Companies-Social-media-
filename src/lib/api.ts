import { NextResponse } from "next/server";
import { getSession, requireOrgAccess } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps a route handler with auth; converts thrown auth errors to HTTP codes. */
export async function withAuth<T>(
  handler: (session: NonNullable<Awaited<ReturnType<typeof getSession>>>) => Promise<T>
): Promise<T | NextResponse> {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    return await handler(session);
  } catch (err: any) {
    if (err?.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (err?.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    console.error(err);
    return jsonError("Internal error", 500);
  }
}

export { requireOrgAccess };
