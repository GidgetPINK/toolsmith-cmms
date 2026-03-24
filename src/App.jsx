import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Queue from './pages/Queue'
import WorkOrderForm from './pages/WorkOrderForm'
import Team from './pages/Team'
import ResetPassword from './pages/ResetPassword'
import ChangePassword from './pages/ChangePassword'

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setProfile(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (!session) setProfile(null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setProfile(data))
    }
  }, [session])

  if (session === undefined || profile === undefined) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <p style={{ color: '#9a9db5' }}>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            session ? <Navigate to="/" replace /> : <Login />
          }
        />
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="/change-password"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <ChangePassword profile={profile} />
            )
          }
        />
        <Route
          path="/"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : profile?.role === 'manager' ? (
              <Dashboard profile={profile} />
            ) : (
              <Queue profile={profile} />
            )
          }
        />
        <Route
          path="/work-order/new"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <WorkOrderForm profile={profile} />
            )
          }
        />
        <Route
          path="/work-order/:id"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <WorkOrderForm profile={profile} />
            )
          }
        />
        <Route
          path="/team"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <Team profile={profile} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App