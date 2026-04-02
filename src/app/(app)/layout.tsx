"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutGrid, Map, PlusSquare, User, Users, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const NAV_ITEMS = [
  { href: "/feed", icon: LayoutGrid, label: "Feed" },
  { href: "/map", icon: Map, label: "Mappa" },
  { href: "/create", icon: PlusSquare, label: "Crea" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/friends", icon: Users, label: "Amici" },
  { href: "/profile", icon: User, label: "Profilo" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages(user?.id ?? null);

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/8 p-6 gap-1 fixed h-full top-0 left-0">
        {/* Logo */}
        <div className="mb-8 px-3">
          <h1 className="font-heading text-xl font-bold gradient-text">
            Vibe Loop
          </h1>
          <p className="text-xs text-white/40 mt-0.5">Discover your city</p>
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          const isChat = href === "/chat";
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="relative">
                <Icon
                  size={18}
                  className={active ? "text-violet-400" : ""}
                />
                {isChat && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          );
        })}

        {/* Bottom section */}
        <div className="mt-auto pt-6 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold">
              G
            </div>
            <div>
              <p className="text-sm font-medium text-white">Gianluca</p>
              <p className="text-xs text-white/40">Milano</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            const isCreate = href === "/create";
            const isChat = href === "/chat";
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                  isCreate
                    ? "bg-violet-600 rounded-xl p-3 -mt-4 shadow-lg glow-violet"
                    : active
                    ? "text-violet-400"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <div className="relative">
                  <Icon size={isCreate ? 22 : 20} className={isCreate ? "text-white" : ""} />
                  {isChat && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                {!isCreate && (
                  <span className="text-[10px] font-medium">{label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
