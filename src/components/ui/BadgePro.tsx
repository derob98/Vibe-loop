import { clsx } from "clsx";
import { Crown } from "lucide-react";

interface BadgeProProps {
  size?: "sm" | "md" | "lg";
}

export function BadgePro({ size = "md" }: BadgeProProps) {
  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-2.5 py-1.5",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25",
        sizes[size]
      )}
    >
      <Crown size={size === "sm" ? 10 : size === "md" ? 12 : 14} />
      Pro
    </span>
  );
}
