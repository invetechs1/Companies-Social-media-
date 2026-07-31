import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { APP_URL } from "@/lib/providers/types";

/**
 * GET /api/oauth/:provider/callback?code=...&state=...
 * Exchanges the code for tokens and stores the connected account(s).
 */
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=oauth_denied", APP_URL));
  }

  const saved = await prisma.oAuthState.findUnique({ where: { state } });
  if (!saved || saved.provider !== params.provider) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", APP_URL));
  }
  await prisma.oAuthState.delete({ where: { state } });

  try {
    const provider = getProvider(params.provider);
    const accounts = await provider.handleCallback(code, saved.codeVerifier || undefined);

    for (const acc of accounts) {
      await prisma.socialAccount.upsert({
        where: {
          organizationId_provider_externalId: {
            organizationId: saved.organizationId,
            provider: params.provider,
            externalId: acc.externalId,
          },
        },
        update: {
          displayName: acc.displayName,
          avatarUrl: acc.avatarUrl,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken,
          tokenExpiresAt: acc.tokenExpiresAt,
          status: "connected",
        },
        create: {
          organizationId: saved.organizationId,
          provider: params.provider,
          externalId: acc.externalId,
          displayName: acc.displayName,
          avatarUrl: acc.avatarUrl,
          accessToken: acc.accessToken,
          refreshToken: acc.refreshToken,
          tokenExpiresAt: acc.tokenExpiresAt,
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/dashboard/${saved.organizationId}/accounts?connected=${accounts.length}`, APP_URL)
    );
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/dashboard/${saved.organizationId}/accounts?error=${encodeURIComponent(String(err?.message || "oauth_failed").slice(0, 200))}`,
        APP_URL
      )
    );
  }
}
