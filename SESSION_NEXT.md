# Vibe Loop — Sessione di Sviluppo

## Stato Attuale

### Completato ✅
- **Fase 5: AI Discovery**
  - Tabella `recommendations` creata
  - Edge Function `recommend-events` deployata
  - Hook `useRecommendations.ts` creato
  - UI "AI Picks" nel feed

- **Fase 8: Monetizzazione Stripe**
  - Tabelle `subscription_plans`, `subscriptions` create
  - Edge Functions deployate: `create-checkout`, `stripe-webhook`, `create-portal`
  - API routes: `/api/stripe/checkout`, `/api/stripe/portal`
  - Hook `useSubscription.ts` creato
  - Pagina `/pricing` creata

- **Build**: pulita, `pnpm build` passa

### Da Completare Manualmente

#### 1. Secrets per Edge Functions (Supabase Dashboard)
Vai su: **Dashboard > Edge Functions > Secrets** e aggiungi:
```
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 2. Prodotti Stripe
In **Stripe Dashboard**:
1. Crea 3 prodotti: Free (€0), Pro (€9.99/mese), Enterprise (€49.99/mese)
2. Per Pro e Enterprise, crea prezzi monthly e yearly
3. Copia i `price_id` (es. `price_123...`)
4. Esegui SQL nel Supabase SQL Editor:
```sql
UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_pro_monthly_id',
    stripe_price_id_yearly = 'price_pro_yearly_id'
WHERE id = 'pro';

UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_enterprise_monthly_id',
    stripe_price_id_yearly = 'price_enterprise_yearly_id'
WHERE id = 'enterprise';
```

#### 3. Webhook Stripe
In **Stripe Dashboard > Developers > Webhooks**:
- Endpoint: `https://gytrrdlkxizzbvuoswnq.supabase.co/functions/v1/stripe-webhook`
- Eventi: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

## Prossime Feature da Implementare

### Alta Priorità
1. **Limitationi piano** — Usa `useSubscription` per limitare funzionalità (es. max 5 eventi/mese per Free)
2. **Badge Pro** — Mostra badge "Pro" nel profilo utenti paganti
3. **Redirect AI Picks** — Se utente Free, mostra banner upgrade prima di mostrare AI Picks

### Media Priorità
4. **Analytics base** — Statistiche visualizzazioni/RSVP per evento
5. **Eventi sponsorizzati** — Posizionamento premium nel feed
6. **Report eventi** — Flag contenuti inappropriati

### Bassa Priorità
7. **Dark mode toggle** — Tema chiaro/scuro
8. **Push notifications** — Notifiche per eventi preferiti
9. **Export calendar** — Esporta eventi in ICS

## Comandi Utili
```bash
pnpm dev          # Dev server (porta 3000)
pnpm build        # Build produzione
pnpm lint         # Linting
npx supabase functions deploy <nome>  # Deploy Edge Function
npx supabase db push                  # Push migrations
```

## Architettura Note
- **State**: Zustand per state management globale
- **Data fetching**: SWR hooks in `/src/hooks/`
- **RLS**: Tutte le tabelle hanno Row Level Security
- **TypeScript strict**: niente `any` nel codice
