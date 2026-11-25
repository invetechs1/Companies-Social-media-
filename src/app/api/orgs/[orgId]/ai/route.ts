import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError, requireOrgAccess } from "@/lib/api";
import { runAi, isAiConfigured, AiAction } from "@/lib/ai";

const schema = z.object({
  action: z.enum(["generate", "improve", "hashtags", "translate_ar", "translate_en"]),
  text: z.string().min(1, "Add some text first."),
  platform: z.string().optional(),
  tone: z.string().optional(),
});

/** POST /api/orgs/:orgId/ai — AI writing assistant for the composer (editors+). */
export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const raw = await req.json();
  return withAuth(async (session) => {
    await requireOrgAccess(session.userId, params.orgId, "editor");
    if (!isAiConfigured())
      return jsonError("AI is not configured. Set ANTHROPIC_API_KEY in .env.", 501);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return jsonError(parsed.error.errors[0].message);
    try {
      const result = await runAi({
        action: parsed.data.action as AiAction,
        text: parsed.data.text,
        platform: parsed.data.platform,
        tone: parsed.data.tone,
      });
      return NextResponse.json({ result });
    } catch (err: any) {
      return jsonError(String(err?.message || "AI request failed"), 500);
    }
  });
}
