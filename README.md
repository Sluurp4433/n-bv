# N-BV

Internt medlemsverktyg – loggbok, observationer, fordonsdatabas och sökning.
Byggd som en statisk webbapp (React) på **GitHub Pages** med **Supabase** som backend.
Allt gränssnitt är på svenska. All åtkomst kräver inloggning och skyddas av Row Level Security (RLS).

> **Om personuppgifter:** Systemet kan innehålla känsliga uppgifter (t.ex. registreringsnummer och
> observationer). Ingen data är publik. Samla bara in det som är nödvändigt och följ föreningens
> GDPR-rutiner. Gallringstid och redigeringsfönster ställs in under **Administration → GDPR & gallring**.

## Teknik

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, React Router (HashRouter), TanStack Query, react-hook-form + zod
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions), RLS på alla tabeller
- **Hosting:** GitHub Pages (statisk), CI/CD via GitHub Actions

## Projektstruktur

```
src/
  auth/           Autentisering (AuthProvider)
  components/     UI-kit, layout, modaler, toast
  lib/            Supabase-klient, hjälpfunktioner, hooks
  pages/          Alla sidor (login, dashboard, loggbok, observationer, fordon, sök, admin …)
  types/          Genererade databastyper
supabase/
  migrations/     SQL-schema (tabeller, RLS, triggers, funktioner)
  functions/      Edge Functions (admin-create-user, bootstrap-admin)
.github/workflows/deploy.yml   Bygger och publicerar till GitHub Pages
```

## Kom igång lokalt

```bash
cp .env.example .env   # värdena är redan ifyllda för det befintliga Supabase-projektet
npm install
npm run dev
```

Appen körs på http://localhost:5173. `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` är
publika värden som skyddas av RLS – de får finnas i frontend.

## Databas

Schemat är redan applicerat i Supabase-projektet. För en ny miljö: kör filerna i
`supabase/migrations/` i ordning (via Supabase SQL Editor eller `supabase db push`).

## Administratörer och medlemmar

Den första administratören är redan skapad. Nya medlemmar läggs till i appen under
**Administration → Medlemmar → + Ny medlem** – du får då ett tillfälligt lösenord att dela,
som medlemmen byter under **Min profil**.

> För en helt ny miljö finns Edge Functionen `bootstrap-admin` som skapar den första
> administratören och sedan inaktiveras automatiskt. Se `supabase/functions/bootstrap-admin/`
> för anropsdetaljer (kräver projektets anon-nyckel).

## Publicera till GitHub Pages

1. Skapa ett GitHub-repo och pusha koden till grenen `main`.
2. I repot: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Varje push till `main` bygger och publicerar automatiskt (se `.github/workflows/deploy.yml`).
   URL blir `https://<användare>.github.io/<repo>/`.

Tack vare `base: './'` och HashRouter fungerar appen oavsett repo-namn, och deep links/omladdningar
ger aldrig 404.

## Supabase Auth – redirect-URL:er (viktigt för lösenordsåterställning)

I Supabase: **Authentication → URL Configuration**:

- **Site URL:** din Pages-URL, t.ex. `https://<användare>.github.io/<repo>/`
- **Redirect URLs:** lägg till
  - `https://<användare>.github.io/<repo>/`
  - `http://localhost:5173/` (för lokal utveckling)

E-post för inbjudan/återställning använder Supabase inbyggda e-post (begränsad). För skarp drift:
konfigurera egen SMTP under **Authentication → Emails**.

## Roller och behörigheter

- **Medlem:** läser loggbok/observationer/fordon, skapar egna inlägg, redigerar egna inom
  redigeringsfönstret, söker.
- **Administratör:** allt ovan + hanterar medlemmar och roller, redigerar/tar bort innehåll,
  ser ändringslogg och styr gallring.

Behörigheterna framtvingas i databasen via RLS – inte bara i gränssnittet.
