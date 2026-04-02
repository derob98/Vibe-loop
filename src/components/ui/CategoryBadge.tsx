import { clsx } from "clsx";

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  music: { label: "🎵 Musica", className: "cat-music" },
  tech: { label: "💻 Tech", className: "cat-tech" },
  art: { label: "🎨 Arte", className: "cat-art" },
  food: { label: "🍽️ Food", className: "cat-food" },
  sport: { label: "⚽ Sport", className: "cat-sport" },
  cinema: { label: "🎬 Cinema", className: "cat-cinema" },
  teatro: { label: "🎭 Teatro", className: "cat-teatro" },
  festival: { label: "🎪 Festival", className: "cat-music" },
  nightlife: { label: "🌙 Nightlife", className: "cat-music" },
};

interface CategoryBadgeProps {
  category: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function CategoryBadge({
  category,
  size = "sm",
  className,
}: CategoryBadgeProps) {
  const key = (category ?? "").toLowerCase();
  const config = CATEGORY_CONFIG[key] ?? {
    label: category ?? "Evento",
    className: "cat-default",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
