import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Suspense, lazy, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import { Layout, PageLoader } from './components/Layout'

// Elke pagina is een eigen chunk: de eerste keer laden haalt alleen op wat nodig is.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Workouts = lazy(() => import('./pages/Workouts').then((m) => ({ default: m.Workouts })))
const Plan = lazy(() => import('./pages/Plan').then((m) => ({ default: m.Plan })))
const Goals = lazy(() => import('./pages/Goals').then((m) => ({ default: m.Goals })))
const Leaderboard = lazy(() => import('./pages/Leaderboard').then((m) => ({ default: m.Leaderboard })))

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  return session ? children : <Navigate to="/login" replace />
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-lg p-8 text-sm">
      <h1 className="mb-2 text-lg font-semibold">Supabase is niet geconfigureerd</h1>
      <p className="text-zinc-300">
        Zet <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (lokaal) of
        als GitHub Actions secrets (productie). Zie README.
      </p>
    </div>
  )
}

export default function App() {
  if (!isConfigured) return <NotConfigured />

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <Login />
              </Suspense>
            }
          />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="plan" element={<Plan />} />
            <Route path="workouts" element={<Workouts />} />
            <Route path="goals" element={<Goals />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
