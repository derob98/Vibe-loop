# Vibe Loop — Istruzioni per Claude

## ⚠️ ISTRUZIONI INIZIALI

Leggi questo file all'inizio di ogni sessione. Segui le istruzioni nell'ordine indicato.

---

## STEP 1: Verifica Configurazione

Prima di iniziare a scrivere codice, verifica che la configurazione sia completa:

1. Leggi il file `NEXT_SESSION.md` (questo file)
2. Verifica che `pnpm build` passi senza errori: `pnpm build`
3. Se ci sono errori, correggili prima di procedere

---

## STEP 2: Configurazione Manuale (Solo se non ancora fatta)

Se non hai ancora configurato Stripe e Supabase, chiedi all'utente di farlo manualmente:

### Supabase Secrets
Vai su **Dashboard Supabase > Edge Functions > Secrets** e aggiungi:
- `ANTHROPIC_API_KEY=sk-ant-...`
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

### Stripe
1. Crea 3 prodotti in Stripe (Free, Pro €9.99, Enterprise €49.99)
2. Copia i price_id e aggiornali nel database

---

## STEP 3: Implementa le Feature

Implementa le feature nell'ordine indicato. Per ogni feature:

1. **Leggi il codice esistente** prima di modificare
2. **Crea il file/hook/componente** come indicato
3. **Verifica con `pnpm build`** prima di proseguire
4. **Non fare commit** - l'utente lo farà manualmente

---

### Feature 1: Limitazioni Piano (5 eventi/mese per Free)

**Obiettivo**: Utenti Free possono creare massimo 5 eventi al mese

**Azioni da compiere**:

1. **Crea hook** `/src/hooks/useEventLimit.ts`:
   - Controlla quanti eventi ha creato l'utente nel mese corrente
   - Ritorna `monthlyCount` e `limit`
   - Usa la tabella `events` con `creator_id = user.id`

2. **Modifica** `/src/app/(app)/create/page.tsx`:
   - Importa `useSubscription` e `useEventLimit`
   - Prima di salvare l'evento, verifica se l'utente ha raggiunto il limite
   - Se `!isPro && monthlyCount >= limit`, mostra messaggio e reindirizza a `/pricing`

3. **Verifica**: `pnpm build`

---

### Feature 2: Badge Pro nel Profilo

**Obiettivo**: Mostra badge "Pro" accanto al nome degli utenti paganti

**Azioni da compiere**:

1. **Crea componente** `/src/components/ui/BadgePro.tsx`:
   - Badge visivo con stile Pro (colore violetto)
   - Props: `size` (sm, md, lg)

2. **Modifica** `/src/app/(app)/profile/page.tsx`:
   - Importa `useSubscription` e `BadgePro`
   - Accanto al nome utente, se `isPro` mostra il badge

3. **Modifica** `/src/app/(app)/profile/[username]/page.tsx`:
   - Stessa logica per profili pubblici

4. **Verifica**: `pnpm build`

---

### Feature 3: AI Picks Upgrade per Free

**Obiettivo**: Utenti Free vedono banner upgrade invece di AI Picks

**Azioni da compiere**:

1. **Crea componente** `/src/components/ui/BannerUpgrade.tsx`:
   - Banner che invita a fare upgrade a Pro
   - Link a `/pricing`
   - Design accattivante (gradiente violetto)

2. **Modifica** `/src/app/(app)/feed/page.tsx`:
   - Importa `useSubscription` e `BannerUpgrade`
   - Se `!isPro` mostra `BannerUpgrade` invece della sezione AI Picks
   - oppure mostra AI Picks ma con un lucchetto/blocco

3. **Verifica**: `pnpm build`

---

### Feature 4: Analytics Base (se hai tempo)

**Obiettivo**: Statistiche per ogni evento

**Azioni**:

1. **Crea tabella** (migration) `event_analytics`:
   ```sql
   CREATE TABLE public.event_analytics (
     event_id UUID PRIMARY KEY REFERENCES events(id),
     view_count INT DEFAULT 0,
     rsvp_count INT DEFAULT 0,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Crea hook** `/src/hooks/useEventAnalytics.ts`

3. **Aggiungi tab** in `/src/app/(app)/event/[slug]/page.tsx`

---

## COMANDI DI VERIFICA

Dopo ogni modifica, esegui SEMPRE:

```bash
pnpm build    # Deve passare senza errori
pnpm lint     # Deve passare senza errori (se configurato)
```

---

## NOTE PER CLAUDE

- **Leggi sempre prima** i file esistenti per capire lo stile del codice
- **Usa TypeScript strict**, mai `any`
- **Usa `"use client"`** solo se il componente usa hooks o state
- **Segui i pattern** del progetto (import da `@/`, naming convensions)
- **Non fare commit** - l'utente lo farà manualmente
- **Chiedi conferma** prima di fare operazioni destructive

---

## FILE DI RIFERIMENTO

- Stack: Next.js 15 + TypeScript + Tailwind + Supabase
- Comandi: `pnpm dev`, `pnpm build`, `pnpm lint`
- CLI Supabase: `npx supabase db push`, `npx supabase functions deploy <nome>`
