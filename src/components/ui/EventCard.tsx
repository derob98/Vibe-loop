"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MapPin, Calendar, Bookmark, BookmarkCheck, Users, Tag } from "lucide-react";
import { clsx } from "clsx";
import { CategoryBadge } from "./CategoryBadge";
import type { Event } from "@/lib/supabase/types";

interface EventCardProps {
  event: Event;
  variant?: "default" | "hero" | "compact";
  distanceKm?: number;
  isSaved?: boolean;
  onSaveToggle?: (eventId: string, saved: boolean) => void;
  className?: string;
}

export function EventCard({
  event,
  variant = "default",
  distanceKm,
  isSaved = false,
  onSaveToggle,
  className,
}: EventCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    setSaved((prev) => !prev);
    onSaveToggle?.(event.id, !saved);
    setTimeout(() => setSaving(false), 500);
  };

  const startsAt = new Date(event.starts_at);
  const dateStr = format(startsAt, "EEE d MMM · HH:mm", { locale: it });

  if (variant === "hero") {
    return (
      <Link
        href={`/event/${event.slug}`}
        className={clsx(
          "group relative block rounded-3xl overflow-hidden h-72 sm:h-96 cursor-pointer",
          className
        )}
      >
        {/* Cover image */}
        <div className="absolute inset-0">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/60 to-cyan-900/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={clsx(
            "absolute top-4 right-4 z-10 p-2 rounded-full glass transition-all",
            saved ? "text-violet-400" : "text-white/70 hover:text-white"
          )}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <CategoryBadge category={event.category} size="sm" />
          <h2 className="mt-2 font-heading text-xl sm:text-2xl font-bold text-white leading-tight line-clamp-2">
            {event.title}
          </h2>
          <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {dateStr}
            </span>
            {event.city && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {event.city}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/event/${event.slug}`}
        className={clsx(
          "group flex gap-3 p-3 rounded-xl glass hover:bg-white/8 transition-colors",
          className
        )}
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          {event.cover_image_url ? (
            <Image
              src={event.cover_image_url}
              alt={event.title}
              width={56}
              height={56}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-800 to-cyan-800" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-white line-clamp-1 group-hover:text-violet-300 transition-colors">
            {event.title}
          </p>
          <p className="text-xs text-white/50 mt-0.5">{dateStr}</p>
          {event.venue_name && (
            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
              {event.venue_name}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // default card
  return (
    <Link
      href={`/event/${event.slug}`}
      className={clsx(
        "group block glass rounded-2xl overflow-hidden card-hover",
        className
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {event.cover_image_url ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/60 via-purple-900/40 to-cyan-900/30 flex items-center justify-center">
            <span className="text-4xl opacity-30">🎉</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={clsx(
            "absolute top-3 right-3 p-2 rounded-full glass transition-all z-10",
            saved
              ? "text-violet-400 bg-violet-500/20"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3">
          <CategoryBadge category={event.category} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-white line-clamp-2 group-hover:text-violet-300 transition-colors">
          {event.title}
        </h3>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Calendar size={13} className="text-violet-400 flex-shrink-0" />
            <span className="line-clamp-1">{dateStr}</span>
          </div>

          {event.venue_name && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <MapPin size={13} className="text-cyan-400 flex-shrink-0" />
              <span className="line-clamp-1">
                {event.venue_name}
                {event.city ? `, ${event.city}` : ""}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {event.price_label && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <Tag size={11} />
                {event.price_label}
              </span>
            )}
            {distanceKm !== undefined && (
              <span className="text-xs text-white/40">{distanceKm.toFixed(1)} km</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-white/40">
            <Users size={11} />
            <span>RSVP</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
