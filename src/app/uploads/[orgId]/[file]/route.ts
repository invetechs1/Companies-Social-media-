import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Serves user-uploaded media (`public/uploads/{orgId}/{file}`) directly from
 * disk. Next.js's built-in /public static serving only picks up files that
 * existed at build time — anything uploaded at runtime (i.e. every org's
 * media) 404s otherwise, which silently broke media previews and any
 * provider fetching the URL server-side (LinkedIn, YouTube) or handing it to
 * the platform to fetch (Facebook, Instagram, TikTok).
 */
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; file: string } }
) {
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const orgId = path.basename(params.orgId);
  const file = path.basename(params.file);
  const filePath = path.join(uploadsRoot, orgId, file);

  if (!filePath.startsWith(uploadsRoot)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
