import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return jsonError(parsed.error.errors[0].message);
  const { name, email, password, companyName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists.", 409);

  const slugBase = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let slug = slugBase || "workspace";
  let i = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${i++}`;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      memberships: {
        create: {
          role: "owner",
          organization: { create: { name: companyName, slug, plan: "starter", planStatus: "trial", trialEndsAt: new Date(Date.now() + 14 * 24 * 3600 * 1000) } },
        },
      },
    },
  });

  await createSession({ userId: user.id, email, name, isSuperAdmin: false });
  return NextResponse.json({ ok: true });
}
