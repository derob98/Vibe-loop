"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EventPost } from "@/lib/supabase/types";
import toast from "react-hot-toast";

interface Props {
  eventId: string;
  userId: string | null;
}

export function EventPhotoSection({ eventId, userId }: Props) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("event_posts")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(30);
    setPosts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Foto troppo grande (max 10MB)");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    setUploading(true);
    const ext = selectedFile.name.split(".").pop();
    const path = `${userId}/${eventId}/${Date.now()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("event-posts")
      .upload(path, selectedFile);

    if (storageError) {
      toast.error("Errore upload foto");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("event-posts")
      .getPublicUrl(path);

    const { error: dbError } = await supabase.from("event_posts").insert({
      event_id: eventId,
      user_id: userId,
      image_url: urlData.publicUrl,
      caption: caption.trim() || null,
    });

    if (dbError) {
      toast.error("Errore salvataggio post");
    } else {
      toast.success("Foto pubblicata! 📸");
      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      await loadPosts();
    }
    setUploading(false);
  };

  const handleDelete = async (post: EventPost) => {
    if (post.user_id !== userId) return;
    await supabase.from("event_posts").delete().eq("id", post.id);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast("Foto rimossa");
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-white">
          Foto ({posts.length})
        </h2>
        {userId && !preview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Camera size={14} />
            Aggiungi foto
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload preview */}
      {preview && (
        <div className="glass rounded-xl p-3 mb-4 space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <Image src={preview} alt="preview" fill className="object-cover" />
            <button
              onClick={cancelPreview}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
            >
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Aggiungi una didascalia..."
            maxLength={200}
            className="input-dark text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Pubblicando...
              </>
            ) : (
              <>
                <Camera size={15} />
                Pubblica foto
              </>
            )}
          </button>
        </div>
      )}

      {/* Gallery */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <ImageOff size={28} className="text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">
            {userId
              ? "Nessuna foto ancora. Sii il primo a condividere!"
              : "Nessuna foto ancora"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {posts.map((post) => (
            <div
              key={post.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setLightbox(post.image_url)}
            >
              <Image
                src={post.image_url}
                alt={post.caption ?? "foto evento"}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              {post.user_id === userId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(post);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full items-center justify-center text-white hidden group-hover:flex"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 glass rounded-xl flex items-center justify-center text-white"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <div className="relative w-full max-w-lg aspect-square">
            <Image
              src={lightbox}
              alt="foto"
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
