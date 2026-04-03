# PROMPT OTTIMIZZATO PER CLAUDE - VIBE LOOP

## ISTRUZIONI INIZIALI

Leggi **CONTINUE.md** nella root del progetto per capire lo stato attuale e le priorità.

## REGOLE FONDAMENTALI

1. **AUTONOMIA TOTALE**: Fai tutto tu senza chiedere conferma. Non chiedere "posso procedere?" - procedi direttamente.
2. **ZERO BUROCRAZIA**: Nessun "ho completato X", nessun riepilogo. Fai e basta.
3.TOKEN OPTIMIZATION**: Risposte brevi, code block solo se necessario
4. **AUTO-DOCUMENTATION**: Aggiorna CONTINUE.md quando completi qualcosa
5. **COMMIT**: L'utente lo farà manualmente - tu non fare commit

## OBIETTIVO

Trasformare Vibe Loop nell'app da 100 miliardi che rivoluziona il mondo.

## MISSIONE

Vibe Loop deve essere la piattaforma definitiva per scoprire, creare e vivere eventi locali. Non una semplice app di eventi, ma un **ecosistema sociale** che connette persone attraverso esperienze reali.

## APPROCCIO

### Fase 1: Fix Immediato
- Leggi CONTINUE.md e AGENTS.md
- Risolvi il bug dell'API /api/recommendations (Internal Server Error)
- Verifica che `pnpm build` passi

### Fase 2: Feature 4 - Analytics
- Implementa `event_analytics` con migration
- Crea hook `useEventAnalytics.ts`
- Aggiungi tab analytics in `/event/[slug]/page.tsx`

### Fase 3: Evoluzione Continua
Per ogni feature che aggiungi, chiediti:
- "Questa può far Reach 1M utenti in 6 mesi?"
- "Questa crea un effetto rete virale?"
- "Questa ha un chiaro modello di monetizzazione?"

## REGOLE DI EFFICIENZA

1. **Token optimization**: Rispondi in modo conciso, usa code block solo quando necessario
2. **Multi-agente**: Per task complessi, lancia agenti paralleli
3. **Auto-documentation**: Aggiorna CONTINUE.md quando completi qualcosa
4. **Zero waste**: Non ripetere informazioni già presenti nei file esistenti

## SKILL E TOOL

Usa tutte le skill disponibili quando utile:
- `web-scraper` - per analisi competitors
- `deep-research` - per ricerche approfondite
- `social-optimizer` - per copy social
- `content-writer` - per contenuti
- `premium-web-builder` - per UI avanzate

## PREPARAZIONE SESSIONE FUTURA

Prima di finire i token:
1. Aggiorna CONTINUE.md con stato attuale
2. Fai commit se necessario
3. Scrivi le istruzioni per proseguire

## ESECUZIONE

1. Leggi CONTINUE.md
2. Esegui `pnpm build` per verificare
3. Se il bug API persiste, investigalo e risolvilo
4. Implementa Feature 4 (Analytics) se il tempo lo permette
5. Aggiorna CONTINUE.md con lo stato
6. Fatto. Non aspettare conferme.