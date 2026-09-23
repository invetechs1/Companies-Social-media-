import { NextRequest, NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

/**
 * Serves uploaded media from disk on every request. Next.js snapshots the
 * public/ folder at server boot in production, so files written there after
 * startup 404 until the next restart — this route reads the filesystem live
 * instead, so newly uploaded media is servable immediately.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; filename: string } }
) {
  // Reject path traversal / anything outside the plain org/filename shape.
  if (!/^[a-zA-Z0-9_-]+$/.test(params.orgId) || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/i.test(params.filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "uploads", params.orgId, params.filename);
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) throw new Error("not a file");
    const buffer = await readFile(filePath);
    const ext = path.extname(params.filename).toLowerCase();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
