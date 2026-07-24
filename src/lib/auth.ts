import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);

const COOKIE = "shp_session";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/** Returns the membership if the user belongs to the org (super admins always pass). */
export async function requireOrgAccess(
  userId: string,
  organizationId: string,
  minRole?: "owner" | "admin" | "editor"
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isSuperAdmin) return { role: "owner" };
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership) throw new Error("FORBIDDEN");
  if (minRole) {
    const rank: Record<string, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };
    if ((rank[membership.role] ?? 0) < rank[minRole]) throw new Error("FORBIDDEN");
  }
  return membership;
}
