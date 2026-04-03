"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { ALL_INTERESTS } from "@/hooks/useUserInterests";
import type { Profile } from "@/lib/supabase/types";
import toast from "react-hot-toast";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setUserId(user.id);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (p) {
        setProfile(p);
        setFullName(p.full_name ?? "");
        setUsername(p.username ?? "");
        setBio(p.bio ?? "");
        setCity(p.city ?? "");
        setWebsite(p.website ?? "");
        setAvatarUrl(p.avatar_url ?? null);
        const prefs = p.preferences as { interests?: string[] } | null;
        setSelectedInterests(prefs?.interests ?? []);
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Immagine troppo grande (max 5MB)");
      return;
    }

    setUploadingAvatar(true);
    const path = `${userId}/avatar.jpg`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Errore upload avatar");
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploadingAvatar(false);
    toast.success("Avatar aggiornato");
  };

  const handleRemoveAvatar = async () => {
    if (!userId || !avatarUrl) return;
    setUploadingAvatar(true);
    const path = `${userId}/avatar.jpg`;
    await supabase.storage.from("avatars").remove([path]);
    setAvatarUrl(null);
    setUploadingAvatar(false);
    toast.success("Avatar rimosso");
  };

  const handleSave = async () => {
    if (!userId) return;

    // Valida username: solo lettere, numeri, underscore
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error("Username: solo lettere, numeri e _");
      return;
    }

    setSaving(true);
    const existingPrefs = (profile?.preferences as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        website: website.trim() || null,
        avatar_url: avatarUrl,
        preferences: { ...existingPrefs, interests: selectedInterests },
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Username già in uso");
      } else {
        toast.error("Errore nel salvataggio");
      }
      return;
    }

    toast.success("Profilo aggiornato!");
    router.push("/profile");
  };

  const displayName =
    profile?.full_name ?? profile?.username ?? "Utente";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 glass rounded-xl flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-heading text-xl font-bold text-white">
          Modifica profilo
        </h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <Avatar src={avatarUrl} name={displayName} size="xl" />
          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              <X size={10} className="text-white" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shadow-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {uploadingAvatar ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <Camera size={14} className="text-white" />
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {avatarUrl ? "Cambia foto" : "Carica foto"}
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Nome completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Es. Mario Rossi"
            className="input-dark"
            maxLength={80}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="il_tuo_username"
              className="input-dark pl-7"
              maxLength={30}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Raccontati in poche parole..."
            rows={3}
            maxLength={200}
            className="input-dark resize-none"
          />
          <p className="text-right text-[10px] text-white/30 mt-1">
            {bio.length}/200
          </p>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">Città</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Es. Milano"
            className="input-dark"
            maxLength={60}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5">
            Sito web
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="input-dark"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-2">
            Interessi <span className="text-white/30">(usati per personalizzare il feed)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_INTERESTS.map((interest) => {
              const active = selectedInterests.includes(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() =>
                    setSelectedInterests((prev) =>
                      active
                        ? prev.filter((i) => i !== interest.id)
                        : [...prev, interest.id]
                    )
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    active
                      ? "bg-violet-600/30 text-violet-300 border-violet-500/50"
                      : "glass text-white/50 border-white/10 hover:text-white"
                  }`}
                >
                  {interest.emoji} {interest.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex-1"
        >
          Annulla
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          className="flex-1"
        >
          Salva
        </Button>
      </div>
    </div>
  );
}
