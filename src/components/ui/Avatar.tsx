import { clsx } from "clsx";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const PX_MAP = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColorFromName(name?: string | null) {
  const colors = [
    "from-violet-600 to-purple-600",
    "from-cyan-500 to-blue-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
  ];
  const idx = name
    ? name.charCodeAt(0) % colors.length
    : 0;
  return colors[idx];
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const px = PX_MAP[size];

  return (
    <div
      className={clsx(
        "relative rounded-full overflow-hidden flex-shrink-0",
        SIZE_MAP[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "avatar"}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className={clsx(
            "w-full h-full flex items-center justify-center bg-gradient-to-br font-semibold text-white",
            getColorFromName(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}
