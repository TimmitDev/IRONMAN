import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ProfileProvider, useProfile } from './lib/profile'
import { RaceProvider } from './lib/raceContext'
import { isConfigured } from './lib/supabase'
import { ThemeProvider } from './lib/theme'
import { Layout, PageLoader } from './components/Layout'

// Elke pagina is een eigen chunk: de eerste keer laden haalt alleen op wat nodig is.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })))
const Hub = lazy(() => import('./pages/Hub').then((m) => ({ default: m.Hub })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Workouts = lazy(() => import('./pages/Workouts').then((m) => ({ default: m.Workouts })))
const Plan = lazy(() => import('./pages/Plan').then((m) => ({ default: m.Plan })))
const Goals = lazy(() => import('./pages/Goals').then((m) => ({ default: m.Goals })))
const Leaderboard = lazy(() => import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })))
const Player = lazy(() => import('./pages/Player').then((m) => ({ default: m.Player })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Records = lazy(() => import('./pages/Records').then((m) => ({ default: m.Records })))
const Challenges = lazy(() => import('./pages/Challenges').then((m) => ({ default: m.Challenges })))

function FullPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

/** Ingelogd; via een herstellink eerst een nieuw wachtwoord. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, recovery } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (recovery) return <FullPage><ResetPassword /></FullPage>
  return children
}

/** Wie nog geen profiel heeft, gaat eerst door de onboarding. */
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile()
  if (loading) return <PageLoader />
  return profile ? children : <Navigate to="/welkom" replace />
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-lg p-8 text-sm">
      <h1 className="mb-2 text-lg font-semibold">Supabase is niet geconfigureerd</h1>
      <p className="text-fg-2">
        Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (lokaal) of
        als GitHub Actions secrets (productie). Zie README.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      {isConfigured ? (
        <AuthProvider>
          <ProfileProvider>
            <RaceProvider>
              <HashRouter>
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <FullPage>
                        <Login />
                      </FullPage>
                    }
                  />
                  <Route
                    path="/welkom"
                    element={
                      <RequireAuth>
                        <FullPage>
                          <Onboarding />
                        </FullPage>
                      </RequireAuth>
                    }
                  />
                  <Route
                    element={
                      <RequireAuth>
                        <RequireOnboarded>
                          <Layout />
                        </RequireOnboarded>
                      </RequireAuth>
                    }
                  >
                    <Route index element={<Hub />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="plan" element={<Plan />} />
                    <Route path="workouts" element={<Workouts />} />
                    <Route path="goals" element={<Goals />} />
                    <Route path="leaderboard" element={<Leaderboard />} />
                    <Route path="leaderboard/:userId" element={<Player />} />
                    <Route path="instellingen" element={<Settings />} />
                    <Route path="records" element={<Records />} />
                    <Route path="uitdagingen" element={<Challenges />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </HashRouter>
            </RaceProvider>
          </ProfileProvider>
        </AuthProvider>
      ) : (
        <NotConfigured />
      )}
    </ThemeProvider>
  )
}
