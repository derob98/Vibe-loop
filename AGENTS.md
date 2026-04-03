# AGENTS.md — Vibe-Loop Developer Guide

**Ultimo aggiornamento**: 2 Aprile 2026
**Stato**: Feature 1-3 completate, bug da risolvere

---

## 1. Build Commands

```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
```

---

## 2. Project Structure

```
/app                    # Next.js App Router
/src/components/ui/     # React UI components
/src/hooks/             # Custom React hooks
/src/lib/               # Utilities, Supabase client
/supabase/migrations/   # DB migrations
/supabase/functions/    # Edge Functions
```

---

## 3. Implemented Features (da completare)

### Feature 1: Limitazioni Piano ✅
- Hook `useEventLimit.ts` - controlla eventi mensili
- Limite: 5 eventi/mese per utenti Free
- Controllo in `/create/page.tsx`

### Feature 2: Badge Pro ✅
- Componente `BadgePro.tsx`
- Visibile in profilo utente e profili pubblici

### Feature 3: Banner Upgrade ✅
- Componente `BannerUpgrade.tsx`
- Mostra banner invece di AI Picks per utenti Free

---

## 4. Bug da risolvere

### API /api/recommendations dà Internal Server Error
- Error: `[useRecommendations] refresh API error: "Internal Server Error"`
- Verificare Edge Function `recommend-events`
- Probabilmente manca `ANTHROPIC_API_KEY` nelle Secrets Supabase

### Fix da fare:
1. Verificare che le Edge Functions siano deployate
2. Controllare Secrets su Supabase Dashboard
3. Testare API `/api/recommendations` manualmente

---

## 5. Feature 4: Analytics (se tempo)

Come da NEXT_SESSION.md:
- Creare tabella `event_analytics` via migration
- Hook `useEventAnalytics.ts`
- Tab in `/event/[slug]/page.tsx`

---

## 6. Stack Tecnologico

- Next.js 15 + React 19 + TypeScript
- Supabase (auth, DB, storage, Edge Functions)
- MapLibre GL + react-map-gl
- Stripe (pagamenti)
- Zustand (state) + SWR (data fetching)

---

## 7. Code Style

- Mai usare `any` - TypeScript strict
- Server Components di default, `"use client"` solo se necessario
- Tailwind con colori custom: `background` (#0a0a0f), `surface` (#13131a), `border` (#1f1f2e)
- Sempre `pnpm` - mai npm/yarn
- Mai commit automatico - l'utente lo fa manualmente
