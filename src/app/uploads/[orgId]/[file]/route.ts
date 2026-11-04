import { NextRequest } from "next/server";
import { serveUpload } from "@/lib/serveUpload";

/** Legacy URL shape: posts created before the move to /api/uploads still store `/uploads/{orgId}/{file}`. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; file: string } }
) {
  return serveUpload(params.orgId, params.file);
}
