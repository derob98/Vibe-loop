"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { clsx } from "clsx";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "" });

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  // ─── Email/password auth ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sb = createClient();

    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Bentornato! 👋");
        router.push("/feed");
        router.refresh();
      } else {
        const { data, error } = await sb.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { username: form.username },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // Se l'utente esiste già, Supabase non lancia errore ma identities è vuoto
        if (data.user && data.user.identities?.length === 0) {
          toast.error("Email già registrata. Prova ad accedere.");
          setMode("login");
          return;
        }

        // Se email confirmation è OFF → redirect diretto al feed
        if (data.session) {
          toast.success("Account creato! Benvenuto 🎉");
          router.push("/feed");
          router.refresh();
        } else {
          // Email confirmation ON → mostra istruzioni chiare
          toast.success(
            "📧 Email inviata! Controlla la casella (anche spam) e clicca il link per confermare.",
            { duration: 6000 }
          );
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Errore di autenticazione";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Google OAuth ───────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // Se OK, Supabase fa il redirect — il loading rimane attivo intenzionalmente
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold gradient-text">
            Vibe Loop
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            Scopri gli eventi nella tua città
          </p>
        </div>

        {/* Mode toggle */}
        <div className="glass rounded-2xl p-1 flex mb-6">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                mode === m
                  ? "bg-violet-600 text-white shadow-lg"
                  : "text-white/50 hover:text-white"
              )}
            >
              {m === "login" ? "Accedi" : "Registrati"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (solo signup) */}
          {mode === "signup" && (
            <div className="relative">
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10"
              />
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className="input-dark has-icon"
                required={mode === "signup"}
                autoComplete="username"
              />
            </div>
          )}

          {/* Email */}
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="input-dark has-icon"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none z-10"
            />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="input-dark has-icon has-icon-right"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full mt-2"
          >
            {mode === "login" ? "Accedi" : "Crea account"}
            <ArrowRight size={16} />
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">oppure</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full glass py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all flex items-center justify-center gap-2.5 border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {googleLoading ? "Reindirizzamento..." : "Continua con Google"}
        </button>

        <p className="text-center text-xs text-white/30 mt-5">
          Continuando accetti i{" "}
          <span className="text-violet-400 cursor-pointer hover:underline">
            Termini di Servizio
          </span>{" "}
          e la{" "}
          <span className="text-violet-400 cursor-pointer hover:underline">
            Privacy Policy
          </span>
        </p>
      </div>
    </div>
  );
}
