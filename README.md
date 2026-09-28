# IRONMAN Training

Trainingsplatform richting IRONMAN België (5 september 2027): een social hub met feed, kudos en vrienden,
een persoonlijk dashboard, IRONMAN-plan en weekschema, trainingslog, doelen en een leaderboard. Met
onboarding na het aanmelden en light/dark mode. Vite + React + TypeScript + Tailwind v4, met Supabase voor
login en data. Wordt gehost op GitHub Pages.

## 1. Supabase

1. Maak een project aan op [supabase.com](https://supabase.com).
2. **SQL Editor** → voer de bestanden in [`supabase/migrations/`](supabase/migrations/) in volgorde uit:
   - `001_workouts.sql`: gelogde trainingen
   - `002_plan_goals.sql`: trainingsschema (`planned_workouts`) en weekdoelen (`weekly_goals`)
   - `003_leaderboard.sql`: profielen en de leaderboard-functie (alleen totalen)
   - `004_duration_seconds.sql`: duur met seconden
   - `005_ironman_plan.sql`: instellingen van het IRONMAN-plan en herkomst van geplande sessies
   - `006_player_profiles.sql`: spelersprofielen (totalen, records, weekgrafiek; losse trainingen alleen met opt-in)
   - `007_social.sql`: social hub: feed van gedeelde trainingen, kudos, reacties en meldingen
   - `008_follows.sql`: spelers volgen ("vrienden") en de feed filteren op gevolgde spelers
   - `009_strava.sql`: Strava-koppeling (tokens, alleen server-side leesbaar) en `strava_activity_id` op trainingen
3. **Authentication → URL Configuration**
   - Site URL: `https://timmitdev.github.io/IRONMAN/`
   - Redirect URLs: `https://timmitdev.github.io/IRONMAN/**` en `http://localhost:5173/**`
4. Optioneel: **Authentication → Sign In / Providers → Email** → zet "Allow new users to sign up" uit
   nadat je je eigen account hebt aangemaakt, zodat niemand anders kan registreren.
5. **Project Settings → API Keys**: noteer de Project URL en de publishable key (`sb_publishable_...`).

## 2. Lokaal draaien

```powershell
Copy-Item .env.example .env.local   # vul URL + publishable key in
npm install
npm run dev
```

## 3. GitHub Pages

1. Repo → **Settings → Secrets and variables → Actions** → voeg twee repository secrets toe:
   `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Repo → **Settings → Pages** → Source: **GitHub Actions**.
3. Push naar `main`; de workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   bouwt en publiceert naar `https://timmitdev.github.io/IRONMAN/`.

De publishable key komt in de gebundelde JavaScript terecht; dat is zo bedoeld. De data is beschermd door
de RLS-policies: elke gebruiker ziet alleen zijn eigen trainingen.

## 4. Strava-koppeling (optioneel)

Spelers koppelen hun Strava in **Instellingen → Koppelingen**. Zwem-, fiets-, loop- en krachtactiviteiten komen
dan als training binnen (de eerste keer de laatste 90 dagen) en vinken de bijhorende geplande sessie af. Stond
dezelfde sessie er al met de hand in, dan komt er geen dubbel bij. Het client secret en de tokens blijven
server-side in de Edge Functions (`supabase/functions/`); de browser kan ze niet lezen.

1. **Strava-app aanmaken** op [strava.com/settings/api](https://www.strava.com/settings/api).
   *Authorization Callback Domain*: `timmitdev.github.io` (localhost werkt altijd voor lokaal testen).
   Noteer het **Client ID** en **Client Secret**.
   Let op: een nieuwe Strava-app staat in "single player mode" (alleen jijzelf kan koppelen). Vraag via
   hetzelfde scherm een review aan om andere spelers te laten koppelen.
2. **SQL Editor** → voer `supabase/migrations/009_strava.sql` uit.
3. **Edge Functions deployen** met de Supabase CLI (project-ref staat in je Supabase-URL):
   ```powershell
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase secrets set STRAVA_CLIENT_ID=<id> STRAVA_CLIENT_SECRET=<secret> STRAVA_VERIFY_TOKEN=<zelf-gekozen-geheim>
   npx supabase functions deploy strava --no-verify-jwt
   npx supabase functions deploy strava-webhook --no-verify-jwt
   ```
   (`--no-verify-jwt`: `strava` controleert de gebruiker zelf; de webhook krijgt geen Supabase-token van Strava.)
4. **Client ID in de app**: `VITE_STRAVA_CLIENT_ID=<id>` in `.env.local`, en als GitHub-secret `VITE_STRAVA_CLIENT_ID`.
5. **Webhook (aanrader)**: zo komen activiteiten binnen zonder dat iemand de app opent. Eenmalig:
   ```powershell
   Invoke-RestMethod -Method Post -Uri https://www.strava.com/api/v3/push_subscriptions -Body @{
     client_id = '<id>'; client_secret = '<secret>'; verify_token = '<zelf-gekozen-geheim>'
     callback_url = 'https://<project-ref>.supabase.co/functions/v1/strava-webhook'
   }
   ```
   Zonder webhook synchroniseert de app bij het openen (hooguit elk half uur) en via "Nu synchroniseren".

## Als app installeren (PWA)

- **Android (Chrome):** menu ⋮ → *App installeren* / *Toevoegen aan startscherm*.
- **iPhone (Safari):** deelknop → *Zet op beginscherm*.

De app opent dan fullscreen met eigen icoon. `public/sw.js` cachet de app-shell (niet de Supabase-data);
na een nieuwe deploy haalt de app bij de volgende start automatisch de nieuwe versie op.

## Structuur

**Ontwerp.** Kleuren zijn thematokens in `src/index.css` (`bg-surface`, `text-fg-3`, `border-line` …) die per
thema wisselen; gebruik die in plaats van vaste tinten, dan kloppen light en dark vanzelf. Gedeelde
bouwstenen: `src/lib/ui.ts` (knop- en invoerklassen), `Card`, `PageHeader`, `Stat`, `EmptyState`, `Switch`,
`Icon`, `Segmented`, `Modal`, `Avatar` in `src/components/`.

- `src/lib/theme.tsx` – licht/donker/systeem (bewaard in de browser; `index.html` zet het vóór de eerste paint)
- `src/lib/profile.tsx` – eigen profiel voor de hele app; zonder profiel stuurt de router naar de onboarding
- `src/pages/Onboarding.tsx` – welkom, profiel en privacy, trainingsweek (plan), weekdoelen, spelers volgen
- `src/pages/Settings.tsx` – profiel, privacy, weergave, account (wachtwoord, uitloggen)
- `src/components/Layout.tsx` – app-shell: zijbalk op desktop, bovenbalk en tabbalk op mobiel

- `src/lib/race.ts` – racedatum, afstanden en trainingsfases (pas hier aan)
- `src/lib/useWorkouts.ts` – CRUD op de `workouts`-tabel
- `src/lib/usePlan.ts` – weekschema: plannen, afvinken (logt de training), vorige week kopiëren
- `src/lib/useGoals.ts` – weekdoelen per sport
- `src/lib/badges.ts` – badge-definities (voeg hier nieuwe badges toe)
- `src/lib/ironmanPlan.ts` – generator van het IRONMAN-plan (belasting per fase, sessietitels, dagverdeling)
- `src/components/WeekReport.tsx` – weekrapport (zondag op het dashboard)
- `src/lib/players.ts` – spelers zoeken en een spelersprofiel ophalen (`player_profile`)
- `src/lib/social.ts` – feed, meldingen, kudos, reacties en volgen (`social_feed`, `social_inbox`, `my_follows`)
- `src/lib/presence.tsx` – wie er online is (Supabase Realtime Presence, geen tabel)
- `src/lib/follows.tsx` – gedeelde volg-toestand (zijbalk, hub en spelerspagina's lopen gelijk)
- `src/lib/strava.ts` – Strava koppelen/synchroniseren vanuit de app; `supabase/functions/` – de server-kant
- `public/strava-callback.html` – landingspagina na Strava-login; geeft de code door aan `#/instellingen`
- `src/pages/` – Login, ResetPassword, Onboarding, Hub (home), Dashboard, Schema, Trainingen, Doelen, Leaderboard, Speler, Instellingen
- `src/components/WeeklyChart.tsx` – gestapelde weekgrafiek per sport met doellijn
