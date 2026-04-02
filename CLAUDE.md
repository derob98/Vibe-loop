# Vibe-Loop — Istruzioni Progetto

## Stack
- Next.js 15 + TypeScript + Tailwind CSS + React 19
- Supabase (auth, database, storage)
- MapLibre GL JS (react-map-gl)
- Stripe (monetizzazione)
- Vercel (deploy)

## Dipendenze principali
- State: Zustand
- Data fetching: SWR
- Date: date-fns
- Icons: lucide-react
- Toasts: react-hot-toast
- Clustering: supercluster
- Utils: clsx, tailwind-merge

## Comandi rapidi
```bash
pnpm dev          # avvia dev server (porta 3000)
pnpm build        # build produzione
pnpm lint         # linting
pnpm test         # test
```

## Variabili d'ambiente richieste
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## Architettura
- `/app` — App Router Next.js
- `/components` — componenti React riutilizzabili
- `/lib` — utility, hooks, client Supabase
- `/supabase/migrations` — migrazioni DB
- `middleware.ts` — auth guard

## Regole specifiche
- Usa sempre `pnpm` (mai npm/yarn)
- Row Level Security (RLS) su TUTTE le tabelle Supabase
- TypeScript strict: niente `any`
- Componenti server-side di default, client solo se necessario (`"use client"`)
- Monetizzazione: piani Free / Pro / Enterprise via Stripe

## Sub-agenti suggeriti per task grandi
Quando sviluppi una feature complessa:
```
Task("UI", "Crea il componente React per X in /components/...")
Task("API", "Crea la route /app/api/... con validazione Zod")
Task("DB", "Scrivi la migration Supabase per la tabella ...")
Task("Test", "Scrivi test per il componente X e la route Y")
```
