"use client";

import { Eye, Users, Bookmark, Share2, TrendingUp } from "lucide-react";
import { useEventAnalytics } from "@/hooks/useEventAnalytics";

interface Props {
  eventId: string;
}

export function EventAnalyticsDashboard({ eventId }: Props) {
  const { summary, loading } = useEventAnalytics(eventId);

  if (loading) {
    return (
      <div className="mt-6 space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!summary) return null;

  const stats = [
    {
      label: "Visualizzazioni",
      value: summary.totalViews,
      sub: `${summary.uniqueViews} uniche`,
      icon: Eye,
      color: "text-blue-400",
      bg: "bg-blue-600/20",
    },
    {
      label: "Partecipanti",
      value: summary.totalRsvps,
      sub: "confermati",
      icon: Users,
      color: "text-violet-400",
      bg: "bg-violet-600/20",
    },
    {
      label: "Salvati",
      value: summary.totalSaves,
      sub: "bookmark",
      icon: Bookmark,
      color: "text-amber-400",
      bg: "bg-amber-600/20",
    },
    {
      label: "Condivisioni",
      value: summary.totalShares,
      sub: "link copiati",
      icon: Share2,
      color: "text-emerald-400",
      bg: "bg-emerald-600/20",
    },
  ];

  const maxViews = Math.max(...summary.viewsByDay.map((d) => d.count), 1);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-violet-400" />
        <h2 className="font-heading font-semibold text-white">Analytics</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-xl p-4 flex items-start gap-3"
          >
            <div
              className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}
            >
              <stat.icon size={16} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
              <p className="text-[10px] text-white/25">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini chart - views ultimi 14 giorni */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-white/50 mb-3">
          Visualizzazioni — ultimi 14 giorni
        </p>
        <div className="flex items-end gap-1 h-24">
          {summary.viewsByDay.map((day) => {
            const height =
              day.count > 0 ? Math.max(8, (day.count / maxViews) * 100) : 4;
            const dayLabel = new Date(day.date).toLocaleDateString("it-IT", {
              day: "numeric",
            });
            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-5 hidden group-hover:block text-[9px] text-white/70 bg-white/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {day.count}
                  </div>
                </div>
                <div
                  className="w-full rounded-sm bg-violet-500/60 hover:bg-violet-400/80 transition-colors"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[8px] text-white/30">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
