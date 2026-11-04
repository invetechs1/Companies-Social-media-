import { NextResponse } from "next/server";
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
  ".webm": "video/webm",
};

/**
 * Serves uploaded media (`public/uploads/{orgId}/{file}`) straight from disk on
 * every request. Next.js snapshots public/ at server boot in production, so
 * files uploaded at runtime 404 until the next restart; reading the filesystem
 * live makes new media (and the URLs handed to LinkedIn/YouTube/Meta/TikTok)
 * work immediately.
 *
 * Shared by two routes so both URL shapes keep working: `/api/uploads/...`
 * (current uploads) and `/uploads/...` (URLs already stored on older posts).
 */
export async function serveUpload(orgId: string, filename: string) {
  // Reject path traversal / anything outside the plain org/filename shape
  // (uploads are named `<24 hex chars><ext>`).
  if (!/^[a-zA-Z0-9_-]+$/.test(orgId) || !/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/i.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = path.join(process.cwd(), "public", "uploads", orgId, filename);
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) throw new Error("not a file");
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
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
