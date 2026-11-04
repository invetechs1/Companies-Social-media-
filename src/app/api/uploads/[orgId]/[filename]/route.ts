import { NextRequest } from "next/server";
import { serveUpload } from "@/lib/serveUpload";

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; filename: string } }
) {
  return serveUpload(params.orgId, params.filename);
}
