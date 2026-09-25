import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Workouts } from './pages/Workouts'
import { Plan } from './pages/Plan'
import { Goals } from './pages/Goals'
import { Leaderboard } from './pages/Leaderboard'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-sm text-zinc-500">Laden…</div>
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
          <Route path="/login" element={<Login />} />
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
