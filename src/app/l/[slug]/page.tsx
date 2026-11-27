import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isSafeHttpUrl } from "@/lib/safeUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const org = await prisma.organization.findUnique({ where: { slug: params.slug } });
  return { title: org ? `${org.name} — Links` : "Links" };
}

/** Public link-in-bio page. No auth, no dashboard chrome. */
export default async function BioPage({ params }: { params: { slug: string } }) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.slug },
    include: { bioLinks: { orderBy: { order: "asc" } } },
  });
  if (!org) notFound();

  // Defense in depth: never render a non-http(s) href (javascript:, data:, …)
  // on a public page, even if one was stored before validation existed.
  const safeLinks = org.bioLinks.filter((l) => isSafeHttpUrl(l.url));
  const color = org.brandColor || "#3564fb";
  const initial = org.name[0]?.toUpperCase() || "•";

  return (
    <main
      style={{ minHeight: "100vh", padding: "48px 20px", background: `linear-gradient(160deg, ${color}14, #f8fafc 55%)` }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt="" style={{ width: 84, height: 84, borderRadius: 24, objectFit: "cover", margin: "0 auto" }} />
        ) : (
          <div
            style={{
              width: 84, height: 84, borderRadius: 24, background: color, color: "#fff",
              display: "grid", placeItems: "center", fontSize: 38, fontWeight: 800, margin: "0 auto",
            }}
          >
            {initial}
          </div>
        )}
        <h1 style={{ marginTop: 16, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{org.name}</h1>
        {org.bioHeadline && (
          <p style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{org.bioHeadline}</p>
        )}

        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
          {safeLinks.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 14 }}>No links yet.</p>
          ) : (
            safeLinks.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{
                  display: "block", padding: "15px 18px", borderRadius: 14, background: "#fff",
                  border: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 600, fontSize: 15.5,
                  textDecoration: "none", boxShadow: "0 1px 2px rgba(15,23,42,.05)",
                }}
              >
                {l.title}
              </a>
            ))
          )}
        </div>

        <div style={{ marginTop: 40, fontSize: 12, color: "#94a3b8" }}>
          Powered by Bassir Social Pro
        </div>
      </div>
    </main>
  );
}
