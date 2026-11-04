import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession, requireOrgAccess } from "@/lib/auth";
import { getProvider, isProviderConfigured } from "@/lib/providers";
import { APP_URL } from "@/lib/providers/types";
import type { ProviderKey } from "@/lib/providers/types";

/**
 * GET /api/oauth/:provider/start?orgId=...
 * Redirects the user to the platform's OAuth consent screen.
 */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", APP_URL));

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  await requireOrgAccess(session.userId, orgId, "admin");

  if (!isProviderConfigured(params.provider as ProviderKey)) {
    return NextResponse.redirect(
      new URL(`/dashboard/${orgId}/accounts?error=provider_not_configured&provider=${params.provider}`, APP_URL)
    );
  }

  const provider = getProvider(params.provider);
  const state = crypto.randomBytes(24).toString("hex");

  // PKCE for providers that need it (Twitter)
  const codeVerifier = crypto.randomBytes(48).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  await prisma.oAuthState.create({
    data: { state, provider: params.provider, organizationId: orgId, codeVerifier },
  });

  return NextResponse.redirect(provider.getAuthUrl(state, codeChallenge));
}
