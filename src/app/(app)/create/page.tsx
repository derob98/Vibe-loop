"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Tag,
  Image as ImageIcon,
  Globe,
  Lock,
  Users,
  ChevronRight,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useEventLimit } from "@/hooks/useEventLimit";
import toast from "react-hot-toast";
import { clsx } from "clsx";

const CATEGORIES = [
  "music", "tech", "art", "food", "sport",
  "cinema", "teatro", "festival", "natura", "sociale",
];

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
  const random = Math.random().toString(36).slice(2, 7);
  return `${base}-${random}`;
}

async function geocodeAddress(
  address: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, ${city}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "Accept-Language": "it" } }
    );
    const data = await res.json();
    if (data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // geocoding non bloccante
  }
  return null;
}

export default function CreatePage() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const { limit, remaining, canCreateEvent, loading: limitLoading } = useEventLimit();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    starts_at: "",
    ends_at: "",
    venue_name: "",
    address_line: "",
    city: "Milano",
    price_label: "",
    visibility: "public" as "public" | "private" | "friends",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.starts_at) {
      toast.error("Titolo e data di inizio sono obbligatori");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Devi essere loggato per creare un evento");
      setLoading(false);
      return;
    }

    if (!isPro && !canCreateEvent) {
      toast.error(`Hai raggiunto il limite di ${limit} eventi mensili. Passa a Pro per creare eventi illimitati!`);
      router.push("/pricing");
      setLoading(false);
      return;
    }

    try {
      // 1. Upload immagine copertina (se caricata)
      let cover_image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `events/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("event-covers")
          .upload(path, imageFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("event-covers")
            .getPublicUrl(path);
          cover_image_url = urlData.publicUrl;
        }
      }

      // 2. Geocoding indirizzo (non bloccante)
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (form.address_line || form.city) {
        const coords = await geocodeAddress(form.address_line, form.city);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      // 3. Inserisci evento nel DB
      const slug = generateSlug(form.title);
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: form.title,
          slug,
          description: form.description || null,
          category: form.category || null,
          visibility: form.visibility,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          venue_name: form.venue_name || null,
          address_line: form.address_line || null,
          city: form.city || null,
          country: "IT",
          latitude,
          longitude,
          cover_image_url,
          price_label: form.price_label || null,
          timezone: "Europe/Rome",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Evento creato! 🎉");
      router.push(`/event/${event.slug}`);
    } catch (err) {
      console.error(err);
      toast.error("Errore nella creazione dell'evento");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ["Dettagli", "Luogo", "Immagine"];

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-white">Crea Evento</h1>
        <p className="text-white/50 text-sm mt-1">Condividi qualcosa di speciale</p>
      </div>

      {/* Limite Free */}
      {!isPro && !limitLoading && (
        <div className="mb-4 p-3 rounded-lg bg-surface border border-border">
          <p className="text-sm text-white/70">
            💡 Piano Free: <span className="text-white font-medium">{remaining}</span> eventi rimasti questo mese
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                step === i + 1
                  ? "bg-violet-600 text-white"
                  : step > i + 1
                  ? "bg-violet-600/20 text-violet-400 cursor-pointer"
                  : "text-white/30"
              )}
            >
              <span
                className={clsx(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                  step > i + 1 ? "bg-violet-400 text-white" : "border border-current"
                )}
              >
                {step > i + 1 ? "✓" : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-white/20" />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Dettagli */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Titolo evento *
              </label>
              <input
                type="text"
                placeholder="Es. Jazz Night al Blue Note"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="input-dark"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Descrizione
              </label>
              <textarea
                placeholder="Descrivi il tuo evento..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="input-dark resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Categoria
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set("category", cat)}
                    className={clsx(
                      "transition-all",
                      form.category === cat
                        ? "ring-2 ring-violet-500 rounded-full"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <CategoryBadge category={cat} size="md" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <Calendar size={13} className="inline mr-1" />
                  Inizio *
                </label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => set("starts_at", e.target.value)}
                  className="input-dark text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <Calendar size={13} className="inline mr-1" />
                  Fine
                </label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => set("ends_at", e.target.value)}
                  className="input-dark text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                <Tag size={13} className="inline mr-1" />
                Prezzo
              </label>
              <input
                type="text"
                placeholder="Es. Gratuito, €10, €15-25"
                value={form.price_label}
                onChange={(e) => set("price_label", e.target.value)}
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Visibilità
              </label>
              <div className="flex gap-2">
                {(["public", "friends", "private"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("visibility", v)}
                    className={clsx(
                      "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all",
                      form.visibility === v
                        ? "border-violet-500/50 bg-violet-600/20 text-violet-300"
                        : "border-white/10 text-white/50 hover:border-white/20"
                    )}
                  >
                    {v === "public" ? (
                      <Globe size={16} />
                    ) : v === "friends" ? (
                      <Users size={16} />
                    ) : (
                      <Lock size={16} />
                    )}
                    {v === "public"
                      ? "Pubblico"
                      : v === "friends"
                      ? "Amici"
                      : "Privato"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Luogo */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                <MapPin size={13} className="inline mr-1" />
                Nome del luogo
              </label>
              <input
                type="text"
                placeholder="Es. Fabrique Milano, Alcatraz"
                value={form.venue_name}
                onChange={(e) => set("venue_name", e.target.value)}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Indirizzo
              </label>
              <input
                type="text"
                placeholder="Via Roma 1"
                value={form.address_line}
                onChange={(e) => set("address_line", e.target.value)}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Città
              </label>
              <input
                type="text"
                placeholder="Milano"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="input-dark"
              />
            </div>
            <p className="text-xs text-white/30 flex items-center gap-1">
              <MapPin size={11} />
              Le coordinate GPS saranno ricavate automaticamente dall&apos;indirizzo
            </p>
          </div>
        )}

        {/* Step 3: Immagine */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Immagine copertina
              </label>
              <label className="flex flex-col items-center justify-center h-48 rounded-xl glass border-2 border-dashed border-white/20 cursor-pointer hover:border-violet-500/50 transition-colors">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="preview"
                    width={400}
                    height={200}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <Upload size={32} />
                    <p className="text-sm">Clicca per caricare</p>
                    <p className="text-xs">JPG, PNG, WebP • max 5MB</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="mt-2 text-xs text-white/40 hover:text-white/70"
                >
                  Rimuovi immagine
                </button>
              )}
            </div>

            {!imagePreview && (
              <div className="flex items-center gap-3 text-white/30">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs">oppure</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            )}

            {!imagePreview && (
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  <ImageIcon size={13} className="inline mr-1" />
                  URL immagine esterna
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  onChange={(e) => setImagePreview(e.target.value)}
                  className="input-dark"
                />
              </div>
            )}
          </div>
        )}

        {/* Navigazione */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Indietro
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                if (step === 1 && !form.title) {
                  toast.error("Inserisci almeno il titolo");
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1"
            >
              Avanti
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="flex-1"
            >
              Pubblica Evento 🎉
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
