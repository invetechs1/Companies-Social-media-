import Link from "next/link";

const platforms = ["Facebook", "Instagram", "X (Twitter)", "LinkedIn", "TikTok", "YouTube"];

const features = [
  { title: "One dashboard, every platform", desc: "Compose once and publish to Facebook, Instagram, X, LinkedIn, TikTok and YouTube simultaneously." },
  { title: "Smart scheduling", desc: "Plan weeks ahead with the content calendar. Posts go out automatically at the exact time you choose." },
  { title: "Approval workflow", desc: "Editors draft, managers approve. Nothing goes live without sign-off — perfect for agencies and teams." },
  { title: "Multi-company workspaces", desc: "Separate workspaces per company with isolated accounts, content, media and teams." },
  { title: "White-label & resellable", desc: "Your logo, your brand colors, your domain. Onboard customer companies as tenants and charge per plan." },
  { title: "Analytics", desc: "Track followers, impressions and engagement per account and per post across every platform." },
];

const plans = [
  { name: "Starter", price: "$29", per: "/mo", items: ["1 workspace", "5 social accounts", "2 team members", "Scheduling & calendar"] },
  { name: "Pro", price: "$79", per: "/mo", items: ["3 workspaces", "15 social accounts", "10 team members", "Approval workflow", "Analytics"] },
  { name: "Enterprise", price: "Custom", per: "", items: ["Unlimited workspaces", "Unlimited accounts", "White-label branding", "Custom domain", "Priority support"] },
];

export default function Landing() {
  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">S</div>
            <span className="font-semibold text-lg">Bassir Social Pro</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">Sign in</Link>
            <Link href="/signup" className="btn-primary">Start free trial</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          All your companies&apos; social media.
          <br />
          <span className="text-brand-600">One powerful dashboard.</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Schedule, approve and publish content to every major platform for every brand you manage —
          then resell the platform to your own customers under your brand.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base px-6 py-3">Get started</Link>
          <Link href="/login" className="btn-secondary text-base px-6 py-3">Sign in</Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {platforms.map((p) => (
            <span key={p} className="badge bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1">{p}</span>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-center">Simple pricing for resellers</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} className="card p-6 flex flex-col">
              <h3 className="font-semibold">{p.name}</h3>
              <div className="mt-2 text-3xl font-bold">{p.price}<span className="text-base font-normal text-slate-500">{p.per}</span></div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 flex-1">
                {p.items.map((i) => <li key={i}>✓ {i}</li>)}
              </ul>
              <Link href="/signup" className="btn-primary mt-6">Choose {p.name}</Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        Bassir Social Pro — a white-label social media management platform.
      </footer>
    </main>
  );
}
