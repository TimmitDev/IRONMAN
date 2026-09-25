# IRONMAN Training Dashboard

Trainingsdashboard richting IRONMAN België (5 september 2027): countdown, periodiseringsfase,
weekvolume per sport en een trainingslog. Vite + React + TypeScript + Tailwind v4, met Supabase voor
login en data. Wordt gehost op GitHub Pages.

## 1. Supabase

1. Maak een project aan op [supabase.com](https://supabase.com).
2. **SQL Editor** → voer de bestanden in [`supabase/migrations/`](supabase/migrations/) in volgorde uit:
   - `001_workouts.sql`: gelogde trainingen
   - `002_plan_goals.sql`: trainingsschema (`planned_workouts`) en weekdoelen (`weekly_goals`)
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

## Als app installeren (PWA)

- **Android (Chrome):** menu ⋮ → *App installeren* / *Toevoegen aan startscherm*.
- **iPhone (Safari):** deelknop → *Zet op beginscherm*.

De app opent dan fullscreen met eigen icoon. `public/sw.js` cachet de app-shell (niet de Supabase-data);
na een nieuwe deploy haalt de app bij de volgende start automatisch de nieuwe versie op.

## Structuur

- `src/lib/race.ts` – racedatum, afstanden en trainingsfases (pas hier aan)
- `src/lib/useWorkouts.ts` – CRUD op de `workouts`-tabel
- `src/lib/usePlan.ts` – weekschema: plannen, afvinken (logt de training), vorige week kopiëren
- `src/lib/useGoals.ts` – weekdoelen per sport
- `src/lib/badges.ts` – badge-definities (voeg hier nieuwe badges toe)
- `src/components/WeekReport.tsx` – weekrapport (zondag op het dashboard)
- `src/pages/` – Login, Dashboard, Schema, Trainingen, Doelen
- `src/components/WeeklyChart.tsx` – gestapelde weekgrafiek per sport met doellijn
