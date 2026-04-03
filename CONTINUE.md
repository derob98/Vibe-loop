# CONTINUAZIONE SVILUPPO VIBE LOOP

## Data: 3 Aprile 2026 (Sessione 7 - Completamento Deploy)

### Stack
- Next.js 16.2.2 + React 19 + TypeScript strict + Tailwind CSS
- Supabase (auth, DB PostgreSQL, Edge Functions, Storage)
- MapLibre GL JS (react-map-gl) per le mappe
- Stripe per monetizzazione (Free / Pro / Enterprise)
- **Storybook RIMOSSO** (dipendenze + script eliminati)
- Package manager: **pnpm** (mai npm/yarn)

### Feature COMPLETATE (17 totali)
1. **Auth** — Login/signup email + OAuth (Google, Apple, Facebook)
2. **Eventi** — CRUD, slug, RSVP, save, foto UGC, ricerca full-text, categorie
3. **Mappa interattiva** — MapLibre con clustering via supercluster
4. **Feed personalizzato** — Interessi utente, filtri categoria/sort, infinite scroll, realtime
5. **Chat & DM** — Chat rooms per evento + messaggi diretti
6. **Amicizie** — Richieste, accettazione, lista amici
7. **AI Recommendations** — Claude Haiku classifica eventi per rilevanza (solo Pro)
8. **Monetizzazione Stripe** — Piani Free/Pro/Enterprise, checkout, webhook, portale gestione
9. **Limitazioni piano** — 5 eventi/mese per Free, badge Pro, banner upgrade
10. **Analytics eventi** — Tracking view/rsvp/save/share, dashboard per creator con grafico 14gg
11. **Sidebar dinamica** — User info reale, piano corrente, logout, badge Pro
12. **Pricing page** — Piano corrente evidenziato, FAQ, toggle mensile/annuale, gestione abbonamento
13. **Pagina 404 custom** — not-found.tsx in App Router
14. **Notifiche real-time** — Bell icon + dropdown + mark as read
15. **Profilo edit** — Upload avatar su Supabase Storage, editor interessi con chip
16. **SEO** — generateMetadata per pagine evento con OpenGraph
17. **UI Improvements** — OAuth grid 2x2, animazioni fade-in, skeleton loaders

### Edge Functions DEPLOYATE su Supabase
- `recommend-events` — AI recommendations via Anthropic API
- `create-checkout` — Stripe Checkout session
- `create-portal` — Stripe Billing Portal session
- `stripe-webhook` — Processa webhook Stripe

---

## LAVORI SVOLTI — Sessione 7 (3 Aprile 2026)

### 1. Fix Build Error BLOCCANTE
- **Problema**: `<Html> should not be imported outside of pages/_document` su /_error e /404
- **Causa**: `NODE_ENV=development` nella shell interferiva con Next.js 15 Pages Router built-in pages
- **Soluzione**: Build script aggiornato a `NODE_ENV=production next build` in package.json
- **Risultato**: Build OK — 20/20 pagine (13 statiche + 7 dinamiche)

### 2. Pulizia residui Storybook
- Rimossi script `storybook` e `build-storybook` da package.json
- Aggiunto script `typecheck:watch` al loro posto

---

## BUG NOTI

### ~~Build error `<Html>`~~ → **RISOLTO (sessione 7)**

### ~~Mappa bbox errato~~ → **RISOLTO (sessione precedente)**

### Warnings (non bloccanti)
```
src/components/map/MapView.tsx
- useCallback has a missing dependency: 'CITY_CENTERS'
```

---

## ENV VARS

Già configurato:
```env
NEXT_PUBLIC_SUPABASE_URL=https://gytrrdlkxizzbvuoswnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZGVtbyIsImEiOiJkZW1vIn0.demo
```

Secrets configurate su Supabase:
- `ANTHROPIC_API_KEY` ✅
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅

---

## VERCEL

- URL: https://vibe-loop-chi.vercel.app
- Progetto: boredderobs-projects/vibe-loop
- Environment vars configurate: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MAPBOX_TOKEN

---

## CONFIGURAZIONE OAUTH

I provider OAuth sono nel codice ma **devono essere abilitati su Supabase**:
- Authentication → Providers → Google/Apple/Facebook → Enable
- URL Callback: `https://gytrrdlkxizzbvuoswnq.supabase.co/auth/v1/callback`

---

## COMANDI
```bash
pnpm dev          # Dev server :3000
pnpm build        # Build produzione (NODE_ENV=production automatico)
pnpm lint         # Linting
pnpm typecheck    # Type check
```

---

## SUPABASE
- Project ID: `gytrrdlkxizzbvuoswnq`
- Region: `eu-west-1`
- URL: `https://gytrrdlkxizzbvuoswnq.supabase.co`

---

## REGOLE DI SVILUPPO
- TypeScript strict: **mai `any`**
- `pnpm` sempre (mai npm/yarn)
- RLS su TUTTE le tabelle Supabase
- Mobile-first design
- Dark theme: bg `#0a0a0f`, accent `violet-600`
- Commit in italiano: `feat:`, `fix:`, `refactor:`

---

## PROSSIMI PASSI
1. Testare l'app in produzione → https://vibe-loop-chi.vercel.app
2. Finire eventuali bug trovati
3. Aggiungere dominio custom (opzionale)
