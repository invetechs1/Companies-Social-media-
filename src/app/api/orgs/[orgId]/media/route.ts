import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId);
    const media = await prisma.mediaAsset.findMany({
      where: { organizationId: params.orgId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ media });
  });
}

const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const form = await req.formData();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    const file = form.get("file") as File | null;
    if (!file) return jsonError("No file uploaded");
    if (!ALLOWED.includes(file.type)) return jsonError(`Unsupported file type: ${file.type}`);
    if (file.size > MAX_BYTES) return jsonError("File too large (max 100 MB)");

    const ext = path.extname(file.name) || ".bin";
    const name = `${crypto.randomBytes(12).toString("hex")}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", params.orgId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/${params.orgId}/${name}`;
    const asset = await prisma.mediaAsset.create({
      data: {
        url,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        organizationId: params.orgId,
      },
    });
    return NextResponse.json({ media: asset });
  });
}
