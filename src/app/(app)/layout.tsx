"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutGrid,
  Map,
  PlusSquare,
  User,
  Users,
  MessageCircle,
  CreditCard,
  LogOut,
  Sparkles,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import { BadgePro } from "@/components/ui/BadgePro";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/feed", icon: LayoutGrid, label: "Feed" },
  { href: "/map", icon: Map, label: "Mappa" },
  { href: "/create", icon: PlusSquare, label: "Crea" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/friends", icon: Users, label: "Amici" },
  { href: "/profile", icon: User, label: "Profilo" },
  { href: "/pricing", icon: CreditCard, label: "Piani" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages(user?.id ?? null);
  const { isPro, plan } = useSubscription();
  const { notifications, unreadCount: notifUnreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    city: string | null;
  } | null>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMobileNotifDropdown, setShowMobileNotifDropdown] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url, city")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const displayName = profile?.full_name ?? profile?.username ?? "Utente";
  const initials = displayName.charAt(0).toUpperCase();
  const displayCity = profile?.city ?? "Italia";

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/8 p-6 gap-1 fixed h-full top-0 left-0">
        {/* Logo */}
        <div className="mb-8 px-3 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold gradient-text">
              Vibe Loop
            </h1>
            <p className="text-xs text-white/40 mt-0.5">Discover your city</p>
          </div>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bell size={20} />
            {notifUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                {notifUnreadCount > 99 ? "99+" : notifUnreadCount}
              </span>
            )}
          </button>
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
              {href === "/pricing" && isPro && (
                <Sparkles size={12} className="ml-auto text-amber-400" />
              )}
            </Link>
          );
        })}

        {/* Bottom section */}
        <div className="mt-auto pt-6 border-t border-white/8 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white truncate">
                  {displayName}
                </p>
                {isPro && <BadgePro />}
              </div>
              <p className="text-xs text-white/40">{displayCity}</p>
            </div>
          </div>
          {plan && (
            <div className="px-3">
              <div className="text-[10px] text-white/30 uppercase tracking-wide">
                Piano: {plan.name}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-white/40 hover:text-red-400 transition-colors rounded-xl hover:bg-white/5"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>

      {/* Notifications Dropdown */}
      {showNotifDropdown && (
        <div className="hidden lg:block fixed top-4 right-4 w-80 bg-[#13131a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifiche</h3>
            {notifUnreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Segna tutte come lette
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-white/40 text-sm">
                Nessuna notifica
              </p>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={clsx(
                    "w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5",
                    !notif.is_read && "bg-violet-600/10"
                  )}
                >
                  <p className={clsx("text-sm", notif.is_read ? "text-white/60" : "text-white")}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
          {[
            ...NAV_ITEMS.filter((item) => item.href !== "/pricing"),
            { href: "/notifications", icon: Bell, label: "Notifiche", isNotif: true as const }
          ].map(
            (item) => {
              const href = item.href;
              const Icon = item.icon;
              const label = item.label;
              const isNotifItem = "isNotif" in item && item.isNotif;
              const active = pathname.startsWith(href);
              const isCreate = href === "/create";
              const isChat = href === "/chat";
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => {
                    if (isNotifItem) {
                      e.preventDefault();
                      setShowMobileNotifDropdown(true);
                    }
                  }}
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
                    <Icon
                      size={isCreate ? 22 : 20}
                      className={isCreate ? "text-white" : ""}
                    />
                    {isChat && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {isNotifItem && notifUnreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                        {notifUnreadCount > 99 ? "99+" : notifUnreadCount}
                      </span>
                    )}
                  </div>
                  {!isCreate && (
                    <span className="text-[10px] font-medium">{label}</span>
                  )}
                </Link>
              );
            }
          )}
        </div>
      </nav>

      {/* Mobile Notifications Modal */}
      {showMobileNotifDropdown && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileNotifDropdown(false)}>
          <div className="absolute bottom-20 left-2 right-2 bg-[#13131a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#13131a]">
              <h3 className="font-semibold text-white">Notifiche</h3>
              <button
                onClick={() => {
                  markAllAsRead();
                  setShowMobileNotifDropdown(false);
                }}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Segna tutte come lette
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-8 text-center text-white/40 text-sm">
                  Nessuna notifica
                </p>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      setShowMobileNotifDropdown(false);
                    }}
                    className={clsx(
                      "w-full p-4 text-left hover:bg-white/5 transition-colors border-b border-white/5",
                      !notif.is_read && "bg-violet-600/10"
                    )}
                  >
                    <p className={clsx("text-sm", notif.is_read ? "text-white/60" : "text-white")}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowMobileNotifDropdown(false)}
              className="w-full p-4 text-center text-white/60 hover:text-white border-t border-white/10"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
