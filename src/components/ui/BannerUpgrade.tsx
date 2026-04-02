import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

interface BannerUpgradeProps {
  title?: string;
  description?: string;
}

export function BannerUpgrade({
  title = "Sblocca AI Picks",
  description = "Accedi a raccomandazioni personalizzate con la nostra AI. Passa a Pro per supportare Vibe Loop e sbloccare tutte le funzionalità premium.",
}: BannerUpgradeProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/50 via-purple-900/40 to-fuchsia-900/30 border border-violet-500/30 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-sm font-medium text-violet-300">{title}</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">{description}</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-violet-300 transition-colors"
        >
          Passa a Pro
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
