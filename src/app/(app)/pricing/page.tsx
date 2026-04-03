"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Shield,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import toast from "react-hot-toast";
import { clsx } from "clsx";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { plan: currentPlan, isPro, isEnterprise } = useSubscription();
  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (!error && data) {
        setPlans(data as Plan[]);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async (planId: string) => {
    if (planId === currentPlan?.id) return;

    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          interval: billingInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Errore durante il checkout");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("URL di checkout non disponibile");
      }
    } catch {
      toast.error("Errore durante il checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Errore nell'apertura del portale");
    }
  };

  const getIcon = (planId: string) => {
    switch (planId) {
      case "free":
        return Zap;
      case "pro":
        return Sparkles;
      case "enterprise":
        return Crown;
      default:
        return Check;
    }
  };

  const getGradient = (planId: string) => {
    switch (planId) {
      case "pro":
        return "from-violet-600 to-indigo-600";
      case "enterprise":
        return "from-amber-500 to-orange-600";
      default:
        return "from-white/20 to-white/10";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-heading text-3xl font-bold text-white mb-3">
          Scegli il tuo piano
        </h1>
        <p className="text-white/50 max-w-md mx-auto">
          Sblocca funzionalità premium e vivi Vibe Loop al massimo
        </p>

        {/* Current plan badge */}
        {currentPlan && currentPlan.id !== "free" && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600/20 border border-violet-500/30">
            <Shield size={14} className="text-violet-400" />
            <span className="text-sm text-violet-300">
              Piano attuale: <strong>{currentPlan.name}</strong>
            </span>
            <button
              onClick={handleManage}
              className="ml-2 text-xs text-violet-400 hover:text-violet-300 underline"
            >
              Gestisci
            </button>
          </div>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3 p-1 rounded-full bg-white/5 border border-white/10">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              billingInterval === "monthly"
                ? "bg-violet-600 text-white"
                : "text-white/50 hover:text-white"
            )}
          >
            Mensile
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              billingInterval === "yearly"
                ? "bg-violet-600 text-white"
                : "text-white/50 hover:text-white"
            )}
          >
            Annuale
            <span className="ml-2 text-xs text-green-400">-20%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = getIcon(plan.id);
          const planIsPro = plan.id === "pro";
          const planIsEnterprise = plan.id === "enterprise";
          const price =
            billingInterval === "monthly"
              ? plan.price_monthly
              : plan.price_yearly;
          const isCurrent = currentPlan?.id === plan.id;
          const isUpgrade =
            (plan.id === "pro" && !isPro && !isEnterprise) ||
            (plan.id === "enterprise" && !isEnterprise);

          return (
            <div
              key={plan.id}
              className={clsx(
                "relative rounded-2xl border p-6 flex flex-col transition-all",
                isCurrent
                  ? "border-green-500/50 bg-green-600/5 ring-1 ring-green-500/20"
                  : planIsPro
                    ? "border-violet-500/50 bg-violet-600/5"
                    : planIsEnterprise
                      ? "border-amber-500/50 bg-amber-600/5"
                      : "border-white/10 bg-white/5"
              )}
            >
              {planIsPro && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-medium">
                  Più popolare
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-600 text-white text-xs font-medium">
                  Piano attuale
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={clsx(
                    "p-2 rounded-xl bg-gradient-to-br",
                    getGradient(plan.id)
                  )}
                >
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="font-heading font-semibold text-white">
                  {plan.name}
                </h3>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-white">
                  {price === 0 ? "Gratis" : `€${price / 100}`}
                </span>
                {price > 0 && (
                  <span className="text-white/50 text-sm">
                    /{billingInterval === "monthly" ? "mese" : "anno"}
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <Check
                      size={16}
                      className="text-green-400 flex-shrink-0 mt-0.5"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={
                  checkoutLoading === plan.id ||
                  isCurrent ||
                  plan.id === "free"
                }
                className={clsx(
                  "w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                  isCurrent
                    ? "bg-green-600/20 text-green-400 border border-green-500/30 cursor-default"
                    : planIsPro
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : planIsEnterprise
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white",
                  (checkoutLoading === plan.id || plan.id === "free") &&
                    !isCurrent &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {checkoutLoading === plan.id ? (
                  "Caricamento..."
                ) : isCurrent ? (
                  <>
                    <Check size={16} /> Piano attuale
                  </>
                ) : plan.id === "free" ? (
                  "Piano gratuito"
                ) : isUpgrade ? (
                  <>
                    Upgrade <ArrowRight size={16} />
                  </>
                ) : (
                  "Acquista ora"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ section */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="font-heading text-xl font-bold text-white text-center mb-8">
          Domande frequenti
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "Posso cambiare piano in qualsiasi momento?",
              a: "Sì, puoi fare upgrade o downgrade del tuo piano quando vuoi. Il cambio sarà effettivo immediatamente.",
            },
            {
              q: "Come funziona la prova gratuita?",
              a: "Puoi usare il piano Free senza limiti di tempo. Quando sei pronto, fai upgrade a Pro per sbloccare tutte le funzionalità.",
            },
            {
              q: "Posso cancellare l'abbonamento?",
              a: "Certo! Puoi cancellare in qualsiasi momento dalla sezione gestione abbonamento. Continuerai ad avere accesso fino alla fine del periodo pagato.",
            },
            {
              q: "I dati delle mie raccomandazioni AI sono privati?",
              a: "Assolutamente. Le tue preferenze e raccomandazioni sono visibili solo a te e non vengono condivise con nessuno.",
            },
          ].map((faq, i) => (
            <details
              key={i}
              className="glass rounded-xl group"
            >
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-white/80 hover:text-white transition-colors list-none flex items-center justify-between">
                {faq.q}
                <span className="text-white/30 group-open:rotate-45 transition-transform text-lg">
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm text-white/50 leading-relaxed">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
