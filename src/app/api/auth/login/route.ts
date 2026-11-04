import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const password = body.password;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !password) return jsonError("Email and password are required.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError("Invalid email or password.", 401);
  }

  const token = await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin,
  });
  // token is returned for the mobile app (sent as Authorization: Bearer <token>)
  return NextResponse.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin },
  });
}
