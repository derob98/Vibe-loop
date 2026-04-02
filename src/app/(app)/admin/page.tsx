"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Shield,
  Key,
  AlertCircle,
  Trash2,
  Filter,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface IngestionSource {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  is_active: boolean;
  feed_url: string | null;
}

interface IngestionRun {
  id: string;
  source_id: string | null;
  status: string;
  items_seen: number | null;
  items_created: number | null;
  items_updated: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}


interface Profile {
  id: string;
  is_admin: boolean;
}

interface ApiStatus {
  eventbrite: boolean;
  ticketmaster: boolean;
  songkick: boolean;
  meetup: boolean;
  rss: boolean;
}

function ApiKeyCard({
  name, secretName, registerUrl, steps, color,
}: {
  name: string; secretName: string; registerUrl: string; steps: string[]; color: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/5 rounded-lg overflow-hidden">
      <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}>
        <span className={`text-xs font-semibold ${color}`}>{name}</span>
        <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-white/40">
            Secret name: <code className="text-violet-300 bg-white/10 px-1 rounded">{secretName}</code>
          </p>
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="text-xs text-white/50 flex gap-2">
                <span className="text-violet-400 flex-shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <a href={registerUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 px-3 py-1.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-xs rounded-lg transition-colors">
            Vai alla pagina di registrazione →
          </a>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sources, setSources] = useState<IngestionSource[]>([]);
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventsBySource, setEventsBySource] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceCity, setNewSourceCity] = useState("");

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("id", user.id)
        .single();

      if (!profileData?.is_admin) {
        toast.error("Accesso negato: richiesto ruolo admin");
        router.push("/");
        return;
      }

      setProfile(profileData);
      setCheckingAuth(false);
    };

    checkAdmin();
  }, [router, supabase]);

  const loadData = useCallback(async () => {
    if (!profile?.is_admin) return;

    const [{ data: srcs }, { data: runData }, { count }] = await Promise.all([
      supabase.from("ingestion_sources").select("*").order("name"),
      supabase
        .from("ingestion_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20),
      supabase.from("events").select("*", { count: "exact", head: true }),
    ]);

    setSources(srcs ?? []);
    setRuns(runData ?? []);
    setTotalEvents(count ?? 0);

    // Carica conteggio eventi per fonte
    const { data: eventsBySourceData } = await supabase
      .from("events")
      .select("source_name")
      .not("source_name", "is", null);

    const sourceCounts: Record<string, number> = {};
    eventsBySourceData?.forEach((e) => {
      const source = e.source_name || "Manuale";
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    setEventsBySource(sourceCounts);

    // Fetch API status via our Next.js route
    try {
      const statusRes = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData?.apiStatus) {
          setApiStatus(statusData.apiStatus);
        }
      }
    } catch {
      // Non critico — API status non bloccante
    }

    setLoading(false);
  }, [profile, supabase]);

  useEffect(() => {
    if (!checkingAuth && profile?.is_admin) {
      loadData();
    }
  }, [loadData, checkingAuth, profile]);

  const toggleSource = async (source: IngestionSource) => {
    await supabase
      .from("ingestion_sources")
      .update({ is_active: !source.is_active })
      .eq("id", source.id);
    setSources((prev) =>
      prev.map((s) =>
        s.id === source.id ? { ...s, is_active: !s.is_active } : s
      )
    );
    toast(source.is_active ? "Fonte disattivata" : "Fonte attivata");
  };

  const triggerIngestion = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const results = data?.results ?? [];

      if (data?.apiStatus) {
        setApiStatus(data.apiStatus);
      }

      const totalCreated = results.reduce(
        (acc: number, r: { created?: number }) => acc + (r.created ?? 0),
        0
      );
      const totalErrors = results.filter(
        (r: { error?: string | null }) => r.error
      ).length;

      if (totalErrors > 0) {
        toast.error(
          `Ingestion completata con ${totalErrors} errori. Creati: ${totalCreated} eventi`
        );
      } else {
        toast.success(`Ingestion completata: ${totalCreated} nuovi eventi`);
      }

      await loadData();
    } catch (e) {
      toast.error("Errore: " + (e instanceof Error ? e.message : String(e)));
    }
    setTriggering(false);
  };

  const triggerSingleSource = async (sourceId: string) => {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: sourceId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const results = data?.results ?? [];

      if (data?.apiStatus) {
        setApiStatus(data.apiStatus);
      }

      const totalCreated = results.reduce(
        (acc: number, r: { created?: number }) => acc + (r.created ?? 0),
        0
      );
      const totalErrors = results.filter(
        (r: { error?: string | null }) => r.error
      ).length;

      if (totalErrors > 0) {
        toast.error(
          `Ingestion completata con ${totalErrors} errori. Creati: ${totalCreated} eventi`
        );
      } else {
        toast.success(`Ingestion completata: ${totalCreated} nuovi eventi`);
      }

      await loadData();
    } catch (e) {
      toast.error("Errore: " + (e instanceof Error ? e.message : String(e)));
    }
    setTriggering(false);
  };

  const triggerCleanup = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      toast.success(
        `Cleanup completato: ${data.deleted_count} eventi eliminati`
      );
      await loadData();
    } catch (e) {
      toast.error("Errore: " + (e instanceof Error ? e.message : String(e)));
    }
    setCleaning(false);
  };

  const addSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      toast.error("Nome e URL sono obbligatori");
      return;
    }
    const { error } = await supabase.from("ingestion_sources").insert({
      name: newSourceName.trim(),
      kind: "rss",
      city: newSourceCity.trim() || null,
      feed_url: newSourceUrl.trim(),
      is_active: false,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Sorgente aggiunta");
      setNewSourceName("");
      setNewSourceUrl("");
      setNewSourceCity("");
      setShowAddSource(false);
      await loadData();
    }
  };


  const sourceName = (sourceId: string | null) =>
    sources.find((s) => s.id === sourceId)?.name ?? sourceId ?? "—";

  const getSourceIcon = (kind: string) => {
    switch (kind) {
      case "eventbrite":
        return "🎫";
      case "ticketmaster":
        return "🎭";
      case "songkick":
        return "🎸";
      case "meetup":
        return "👥";
      case "opendata":
        return "📊";
      case "rss":
        return "📡";
      default:
        return "📡";
    }
  };

  // Derive unique cities from sources
  const cities = Array.from(
    new Set(sources.map((s) => s.city).filter(Boolean))
  ).sort() as string[];

  const filteredSources =
    cityFilter === "all"
      ? sources
      : sources.filter((s) => s.city === cityFilter);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <Shield size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold text-white mb-2">
            Accesso Negato
          </h1>
          <p className="text-white/60 text-sm">
            Solo gli utenti admin possono accedere a questa pagina.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-white">
              Ingestion Admin
            </h1>
            <p className="text-xs text-white/40">Gestione fonti eventi</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalEvents}</p>
          <p className="text-xs text-white/40 mt-1">Tot. eventi</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            {sources.filter((s) => s.is_active).length}
          </p>
          <p className="text-xs text-white/40 mt-1">Fonti attive</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {runs.filter((r) => r.status === "success").length}
          </p>
          <p className="text-xs text-white/40 mt-1">Run OK</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">
            {runs.filter((r) => r.status === "error").length}
          </p>
          <p className="text-xs text-white/40 mt-1">Errori</p>
        </div>
      </div>

      {/* API Keys Status */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Key size={16} className="text-violet-400" />
          <h2 className="font-heading font-semibold text-white text-sm">
            Stato API Keys
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            {
              key: "eventbrite",
              label: "Eventbrite",
              color: "text-orange-400",
            },
            {
              key: "ticketmaster",
              label: "Ticketmaster",
              color: "text-blue-400",
            },
            { key: "songkick", label: "Songkick", color: "text-pink-400" },
            { key: "meetup", label: "Meetup", color: "text-red-400" },
            { key: "rss", label: "RSS (free)", color: "text-green-400" },
          ].map(({ key, label, color }) => (
            <div
              key={key}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  apiStatus?.[key as keyof ApiStatus]
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />
              <span className={`text-xs font-medium ${color}`}>{label}</span>
            </div>
          ))}
        </div>
        {apiStatus && !apiStatus.eventbrite && !apiStatus.ticketmaster && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
            <AlertCircle
              size={16}
              className="text-amber-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-400/80">
              Configura le API keys in Supabase Dashboard → Settings → Edge
              Functions → Secrets per attivare l&apos;ingestion automatica. Le
              fonti RSS funzionano senza API key.
            </p>
          </div>
        )}
      </div>

      {/* Setup API Keys Guide */}
      {apiStatus && (!apiStatus.eventbrite || !apiStatus.ticketmaster || !apiStatus.songkick || !apiStatus.meetup) && (
        <div className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-amber-400" />
            <h2 className="font-heading font-semibold text-white text-sm">Setup API Keys</h2>
          </div>
          <p className="text-xs text-white/50 mb-3">
            Configura le API keys in{" "}
            <a href="https://supabase.com/dashboard/project/gytrrdlkxizzbvuoswnq/settings/functions"
              target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">
              Supabase Dashboard → Edge Functions → Secrets
            </a>.
          </p>
          <div className="space-y-2">
            {!apiStatus.eventbrite && (
              <ApiKeyCard name="Eventbrite" secretName="EVENTBRITE_TOKEN"
                registerUrl="https://www.eventbrite.com/platform/api-keys"
                steps={["Vai su eventbrite.com/platform/api-keys","Crea account gratuito","Clicca 'Create API Key'","Copia il 'Private Token'","Aggiungilo come EVENTBRITE_TOKEN"]}
                color="text-orange-400" />
            )}
            {!apiStatus.ticketmaster && (
              <ApiKeyCard name="Ticketmaster" secretName="TICKETMASTER_KEY"
                registerUrl="https://developer.ticketmaster.com"
                steps={["Vai su developer.ticketmaster.com","Crea account developer gratuito","Crea 'New App'","Copia il 'Consumer Key'","Aggiungilo come TICKETMASTER_KEY"]}
                color="text-blue-400" />
            )}
            {!apiStatus.songkick && (
              <ApiKeyCard name="Songkick" secretName="SONGKICK_KEY"
                registerUrl="https://www.songkick.com/api_key_requests/new"
                steps={["Vai su songkick.com/api_key_requests/new","Richiedi accesso API (gratuito)","Attendi email approvazione (24-48h)","Aggiungila come SONGKICK_KEY"]}
                color="text-pink-400" />
            )}
            {!apiStatus.meetup && (
              <ApiKeyCard name="Meetup" secretName="MEETUP_TOKEN"
                registerUrl="https://www.meetup.com/api/authentication/"
                steps={["Vai su meetup.com/api/authentication","Crea OAuth Consumer","Ottieni token OAuth 2.0","Aggiungilo come MEETUP_TOKEN"]}
                color="text-red-400" />
            )}
          </div>
        </div>
      )}

      {/* Eventi per Fonte */}
      {Object.keys(eventsBySource).length > 0 && (
        <div className="glass rounded-xl p-4 mb-6">
          <h2 className="font-heading font-semibold text-white text-sm mb-3">
            Eventi per Fonte
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(eventsBySource).map(([source, count]) => (
              <div key={source} className="bg-white/5 rounded-full px-3 py-1">
                <span className="text-xs text-white/60">{source}: </span>
                <span className="text-xs font-medium text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={triggering}
          onClick={triggerIngestion}
        >
          <Play size={16} />
          Avvia ingestion ora
        </Button>
        <button
          onClick={triggerCleanup}
          disabled={cleaning}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-white/5 border border-white/10 text-white/70 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 disabled:opacity-50"
        >
          {cleaning ? (
            <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          Pulisci eventi scaduti (&gt;30gg)
        </button>
      </div>

      {/* Aggiungi sorgente RSS */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddSource((v) => !v)}
          className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors mb-3"
        >
          <Plus size={16} />
          <span>Aggiungi sorgente RSS</span>
        </button>
        {showAddSource && (
          <div className="glass rounded-xl p-4">
            <h3 className="font-heading font-semibold text-white text-sm mb-3">Nuova Sorgente RSS</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nome (es. Artribune Milano)"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white px-3 py-2 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="url"
                placeholder="URL feed RSS"
                value={newSourceUrl}
                onChange={(e) => setNewSourceUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white px-3 py-2 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="text"
                placeholder="Città (es. Milano)"
                value={newSourceCity}
                onChange={(e) => setNewSourceCity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-sm text-white px-3 py-2 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={addSource}>
                  Aggiungi
                </Button>
                <button
                  onClick={() => setShowAddSource(false)}
                  className="px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fonti */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-white flex items-center gap-2">
          <span>Fonti</span>
          <span className="text-xs font-normal text-white/40">
            ({filteredSources.filter((s) => s.is_active).length}/
            {filteredSources.length} attive)
          </span>
        </h2>

        {/* City Filter */}
        {cities.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-white/40" />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 px-2 py-1.5 appearance-none cursor-pointer focus:outline-none focus:border-violet-500/50"
            >
              <option value="all">Tutte le città</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-6">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className={`glass rounded-xl p-4 flex items-center gap-3 transition-all ${
              source.is_active
                ? ""
                : "opacity-50 hover:opacity-70"
            }`}
          >
            <span className="text-lg" role="img" aria-label={source.kind}>
              {getSourceIcon(source.kind)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {source.name}
              </p>
              <p className="text-xs text-white/40">
                {source.kind} · {source.city ?? "Globale"}
                {source.feed_url && (
                  <span className="ml-1 text-white/20">
                    · {new URL(source.feed_url).hostname}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => triggerSingleSource(source.id)}
              disabled={triggering}
              className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors disabled:opacity-50"
              title="Testa questa sorgente"
            >
              <Play size={12} />
            </button>
            <button
              onClick={() => toggleSource(source)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                source.is_active
                  ? "bg-emerald-600/20 text-emerald-400 hover:bg-red-600/20 hover:text-red-400"
                  : "bg-white/5 text-white/30 hover:bg-emerald-600/20 hover:text-emerald-400"
              }`}
            >
              {source.is_active ? "Attiva" : "Inattiva"}
            </button>
          </div>
        ))}
      </div>

      {/* Run history */}
      <h2 className="font-heading font-semibold text-white mb-3">
        Storico run
      </h2>
      <div className="space-y-2">
        {runs.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-white/40 text-sm">
            Nessun run ancora. Avvia la prima ingestion!
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="glass rounded-xl p-4">
              <div className="flex items-center gap-3">
                {run.status === "success" ? (
                  <CheckCircle
                    size={16}
                    className="text-emerald-400 flex-shrink-0"
                  />
                ) : run.status === "error" ? (
                  <XCircle
                    size={16}
                    className="text-red-400 flex-shrink-0"
                  />
                ) : (
                  <Clock
                    size={16}
                    className="text-white/40 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {sourceName(run.source_id)}
                  </p>
                  {run.error_message ? (
                    <p className="text-xs text-red-400 truncate">
                      {run.error_message}
                    </p>
                  ) : (
                    <p className="text-xs text-white/40">
                      {run.items_seen ?? 0} visti · {run.items_created ?? 0}{" "}
                      creati
                      {run.items_created === 0 &&
                        run.items_seen &&
                        run.items_seen > 0 && (
                          <span className="text-amber-400 ml-1">
                            (duplicati?)
                          </span>
                        )}
                    </p>
                  )}
                </div>
                <span className="text-xs text-white/30 flex-shrink-0">
                  {new Date(run.started_at).toLocaleString("it-IT", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
