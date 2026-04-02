import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEventDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  if (isSameDay(d, now)) return `Oggi, ${format(d, 'HH:mm')}`
  return format(d, "EEE d MMM, HH:mm", { locale: it })
}

export function formatRelativeTime(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it })
}

export const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  music:      { label: 'Musica',     color: 'bg-pink-500/20 text-pink-300 border-pink-500/30',     emoji: '🎵' },
  art:        { label: 'Arte',       color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', emoji: '🎨' },
  tech:       { label: 'Tech',       color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',      emoji: '💻' },
  food:       { label: 'Food',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', emoji: '🍕' },
  sport:      { label: 'Sport',      color: 'bg-green-500/20 text-green-300 border-green-500/30',   emoji: '⚽' },
  culture:    { label: 'Cultura',    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', emoji: '🏛️' },
  nightlife:  { label: 'Nightlife',  color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', emoji: '🌙' },
  wellness:   { label: 'Wellness',   color: 'bg-teal-500/20 text-teal-300 border-teal-500/30',      emoji: '🧘' },
  business:   { label: 'Business',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',      emoji: '💼' },
  other:      { label: 'Altro',      color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',      emoji: '✨' },
}

export function getCategoryConfig(category: string | null) {
  return CATEGORY_CONFIG[category?.toLowerCase() ?? ''] ?? CATEGORY_CONFIG.other
}
