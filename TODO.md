# Todo — Personal Statement Studio

Aggiornato: 07 giugno 2026

---

## ✅ Completato

- [x] Setup progetto (Astro, Tailwind, Supabase, Vercel)
- [x] Auth con Supabase (email/password + Google OAuth)
- [x] Ruoli utente: `user` e `admin`
- [x] Dashboard utente con prodotti acquistati e download PDF sicuro
- [x] Dashboard admin con form creazione/modifica articoli e prodotti
- [x] Editor WYSIWYG (Quill.js) per articoli e prodotti
- [x] Pagamento PayPal (Smart Buttons + Webhook)
- [x] Protezione download: solo utenti che hanno acquistato
- [x] Blog pubblico con articoli
- [x] Shop pubblico con prodotti digitali (PDF)
- [x] Pagine individuali blog e shop con lettore integrato
- [x] Condivisione articoli/prodotti con anteprima OG
- [x] SEO: meta title, meta description, OG image (upload o URL esterno)
- [x] Slug personalizzabili per articoli e prodotti (con redirect 301 da UUID)
- [x] Prezzo originale barrato per prodotti in sconto
- [x] Logo e branding coerente su tutte le pagine
- [x] Dark mode
- [x] Lettore a pagine scorrevoli (`BookViewer`) con copertina, navigazione e swipe mobile
- [x] Reader full-screen su mobile, compatto su desktop
- [x] Navigazione circolare nel reader (frecce sempre attive)

---

## 🔴 Alta priorità

- [x] **Pagina Impostazioni utente** — nome, telefono, email (read-only), lingua preferita
- [ ] **Email di conferma acquisto** — inviata automaticamente dopo PayPal con link download (Resend o SendGrid)
- [x] **SEO tecnico** — `sitemap.xml` dinamica (articoli + prodotti) + `robots.txt` + structured data schema.org (BlogPosting, Product) + Twitter Card + og:type dinamico
- [x] **Pagina 404 personalizzata** — branded, con link utili

---

## 🟡 Medio termine

- [ ] **Tempo di lettura stimato** sugli articoli del blog (es. "5 min di lettura")
- [ ] **Ricerca** — barra di ricerca su blog e shop, filtro per parola chiave
- [x] **Articoli/prodotti correlati** in fondo alle pagine singole (stessa categoria)
- [ ] **Newsletter** — form di iscrizione (email salvata su Supabase)
- [x] **Categorie/tag** per blog e prodotti — pagine dedicate, filtri, correlati, sitemap
- [ ] **Test PayPal sandbox** — validare flusso acquisto completo prima del go-live
- [ ] **Pagine legali** — Privacy Policy, Cookie Banner (GDPR), Termini di servizio, Condizioni di vendita (obbligatorie per e-commerce italiano)
- [ ] **Pagina Chi sono** — presentazione della coach, bio, approccio metodologico
- [ ] **Codici sconto** — coupon applicabili al checkout PayPal (es. -20%, importo fisso)
- [ ] **Anteprima gratuita** — prime N pagine del PDF visibili senza acquisto come lead magnet
- [ ] **Form di contatto** — pagina /contatti con invio email (Resend/SendGrid)

---

## 🤖 AI & Automazione

- [ ] **Generazione articoli blog con AI** — form admin con prompt/idea iniziale → articolo completo generato via OpenAI/Anthropic, inserito nell'editor Quill per revisione e pubblicazione
- [ ] **Suggerimenti SEO AI** — meta title e description generati automaticamente dal contenuto dell'articolo/prodotto
- [ ] **AI per descrizioni prodotto** — generazione automatica di descrizione breve e anteprima da titolo + note
- [ ] **Tagging automatico** — suggerimento tag rilevanti basato sul contenuto tramite AI

---

## 🟢 Futuro / Nice to have

- [x] **Analytics admin** — KPI revenue/conversione, vendite per prodotto, andamento mensile, lista utenti completa con email + telefono esportabile in CSV
- [ ] **Multilinguismo** — sezione impostazioni per lingua preferita + traduzioni manuali/AI
- [ ] **Sistema commenti** per articoli del blog (Supabase)
- [ ] **Notifiche admin** — avviso in dashboard quando arriva un nuovo acquisto
- [ ] **Bundle prodotti** — vendita di più PDF insieme con prezzo scontato
- [ ] **Testimonianze/recensioni** — sezione pubblica con feedback degli utenti
- [ ] **Gestione ordini admin** — pagina dedicata con storico acquisti, possibilità di rimborso manuale
- [ ] **PWA** — installazione come app mobile (manifest + service worker)

---

## 📝 Note tecniche

- Stack: Astro · Tailwind CSS · Supabase (Auth, DB, Storage) · Vercel · PayPal REST API
- Migrazioni DB in `supabase/migrations/` (001 → 010)
- Librerie locali: `public/js/jquery.min.js`, `public/js/turn.min.js` (non più usate, da rimuovere)
- Variabili d'ambiente in `.env.local` (non committare)
