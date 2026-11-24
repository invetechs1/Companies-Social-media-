import Link from "next/link";
import { buildReportData, renderReportHtml } from "@/lib/report";
import PrintButton from "./print-button";

export const dynamic = "force-dynamic";

/**
 * Branded, printable performance report for a workspace. The client can read
 * it here and "Save as PDF" via the browser. Period selectable via ?days=.
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { orgId: string };
  searchParams: { days?: string };
}) {
  const days = searchParams.days === "7" ? 7 : searchParams.days === "90" ? 90 : 30;
  const data = await buildReportData(params.orgId, days);
  if (!data) return <div className="p-6 text-sm text-slate-500">Workspace not found.</div>;
  const html = renderReportHtml(data);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Report</h1>
          <p className="text-slate-500 text-sm mt-1">A shareable performance summary for {data.org.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`?days=${d}`}
              className={`badge border px-3 py-1.5 ${days === d ? "bg-brand-50 border-brand-400 text-brand-700" : "bg-white border-slate-300 text-slate-600"}`}
            >
              {d} days
            </Link>
          ))}
          <PrintButton />
        </div>
      </div>

      {/* The report itself, rendered in an isolated iframe so its inline styles
          don't inherit the dashboard's, and it prints as its own document. */}
      <div className="card overflow-hidden">
        <iframe
          title="Performance report"
          srcDoc={html}
          className="w-full"
          style={{ height: "900px", border: "0" }}
        />
      </div>
    </div>
  );
}
