"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PROVIDER_META, STATUS_META } from "@/lib/ui";

type Post = {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  targets: { id: string; socialAccount: { provider: string } }[];
};

export default function CalendarPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    fetch(`/api/orgs/${orgId}/posts`)
      .then((r) => r.json())
      .then((d) => setPosts((d.posts || []).filter((p: Post) => p.scheduledAt)));
  }, [orgId]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function postsOn(day: number) {
    return posts.filter((p) => {
      const d = new Date(p.scheduledAt!);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const monthName = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const today = new Date();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content calendar</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-3" onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button>
          <span className="font-medium w-40 text-center">{monthName}</span>
          <button className="btn-secondary !px-3" onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button>
        </div>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday =
              day !== null &&
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            return (
              <div key={i} className="min-h-[110px] border-b border-r border-slate-100 p-1.5">
                {day && (
                  <>
                    <div className={`text-xs mb-1 ${isToday ? "font-bold text-brand-600" : "text-slate-400"}`}>{day}</div>
                    <div className="space-y-1">
                      {postsOn(day).map((p) => {
                        const st = STATUS_META[p.status] || STATUS_META.draft;
                        const time = new Date(p.scheduledAt!).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={p.id} className={`rounded px-1.5 py-1 text-[11px] leading-tight ${st.className}`} title={p.body}>
                            <span className="font-medium">{time}</span>{" "}
                            {p.targets.map((t) => PROVIDER_META[t.socialAccount.provider]?.icon).join("")}
                            <div className="truncate">{p.body}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
