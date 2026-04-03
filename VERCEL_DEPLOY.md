# Deploy su Vercel — Istruzioni

## 1. Collega il repo
1. Vai su https://vercel.com/new
2. Importa il tuo repo GitHub "vibe-loop" (o come si chiama)
3. Framework Preset: **Next.js**

## 2. Environment Variables
In Vercel Dashboard → Settings → Environment Variables aggiungi:

```
NEXT_PUBLIC_SUPABASE_URL=https://gytrrdlkxizzbvuoswnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dHJyZGxreGl6emJ2dW9zd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzU5NzEsImV4cCI6MjA4OTc1MTk3MX0.VWQnKn4AFKv9cPP06WwOm9cOi9KqJCbPQB3-izZy0Gc
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZGVtbyIsImEiOiJkZW1vIn0.demo
```

## 3. Deploy
Clicca **Deploy** — il build partirà automaticamente.

## 4. Post-deploy (da fare su Supabase)
Dopo il deploy, configura:
- **Edge Functions Secrets**: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **OAuth Providers**: Abilita Google/Apple/Facebook in Supabase → Authentication → Providers

---

## Alternativa: Deploy da CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```
