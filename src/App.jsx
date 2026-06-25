import TemplateSuccess from './pages/TemplateSuccess'
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
import Register from './pages/Register'
import Success from './pages/Success'
import Upgrade from './pages/Upgrade'
import Assets from './pages/Assets'
import CustomFields from './pages/CustomFields'
import Parts from './pages/Parts'
import Admin from './pages/Admin'
import Reports from './pages/Reports'
import MobileWorkOrders from './pages/MobileWorkOrders'
import MobileAssets from './pages/MobileAssets'
import MobileAssetDetail from './pages/MobileAssetDetail'
import CompletePaymentSetup from './pages/CompletePaymentSetup'
import SubscriptionRequired from './pages/SubscriptionRequired'
import GidgetButton from './components/GidgetButton'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return isMobile
}

function DisabledScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        background: '#1e2245',
        border: '1px solid rgba(224,108,117,0.3)',
        borderRadius: '12px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '460px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(224,108,117,0.12)',
          border: '1px solid rgba(224,108,117,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          margin: '0 auto 1.5rem'
        }}>
          ⚠
        </div>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          The Toolsmith CMMS
        </h1>
        <p style={{
          color: '#f8f6f1',
          fontSize: '0.98rem',
          lineHeight: '1.75',
          marginBottom: '2rem'
        }}>
          Your account has been deactivated. If you have questions, please
          contact your administrator or manager. Thank you.
        </p>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#9a9db5',
            borderRadius: '8px',
            padding: '0.75rem 2rem',
            fontSize: '0.85rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [organization, setOrganization] = useState(undefined)
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setOrganization(null)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (!session) {
          setProfile(null)
          setOrganization(null)
        }
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

  useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()
        .then(({ data }) => setOrganization(data))
    } else if (profile === null) {
      setOrganization(null)
    }
  }, [profile])

  if (session === undefined || profile === undefined || organization === undefined) {
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

  if (session && profile && profile.is_active === false) {
    return <DisabledScreen />
  }

  // Payment gate: if logged in but setup not complete, force them to CompletePaymentSetup
  // Managers only since they're the ones who handle billing
  const needsPaymentSetup = session && profile && organization &&
    profile.role === 'manager' &&
    organization.setup_complete === false

  // Subscription gate: only block if setup is complete AND subscription is truly inactive
  // Active states: Pro user (is_upgraded=true), active trial (trial_end in future),
  // or any active subscription (stripe_subscription_id exists, meaning subscription wasn't canceled)
  // This catches canceled subscriptions and failed trial-end charges for both Lite and Pro users
  const trialEndDate = organization?.trial_end ? new Date(organization.trial_end) : null
  const hasActiveTrial = trialEndDate && trialEndDate > new Date()
  const hasActiveSubscription = !!organization?.stripe_subscription_id

  const needsSubscription = session && profile && organization &&
    organization.setup_complete === true &&
    organization.is_upgraded === false &&
    !hasActiveTrial &&
    !hasActiveSubscription

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
          path="/register"
          element={
            session ? <Navigate to="/" replace /> : <Register />
          }
        />
        <Route
          path="/subscription-required"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : !needsSubscription ? (
              <Navigate to="/" replace />
            ) : (
              <SubscriptionRequired profile={profile} organization={organization} />
            )
          }
        />
        <Route
          path="/complete-setup"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : !needsPaymentSetup ? (
              <Navigate to="/" replace />
            ) : (
              <CompletePaymentSetup profile={profile} />
            )
          }
        />
        <Route
          path="/success"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <Success profile={profile} />
            )
          }
        />
        <Route
          path="/upgrade"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : (
              <Upgrade profile={profile} />
            )
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
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Queue profile={profile} />
            ) : isMobile ? (
              <Navigate to="/m/work-orders" replace />
            ) : (
              <Dashboard profile={profile} />
            )
          }
        />
        <Route
          path="/work-order/new"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
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
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
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
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <Team profile={profile} />
            )
          }
        />
        <Route
          path="/assets"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <Assets profile={profile} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : (
              <Admin profile={profile} />
            )
          }
        />
        <Route
          path="/parts"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <Parts profile={profile} />
            )
          }
        />
        <Route
          path="/admin/custom-fields"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <CustomFields profile={profile} />
            )
          }
        />
        <Route
          path="/m/work-orders"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <MobileWorkOrders profile={profile} />
            )
          }
        />
        <Route
          path="/m/assets"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : (
              <MobileAssets profile={profile} />
            )
          }
        />
        <Route
          path="/m/assets/new"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : (
              <MobileAssetDetail profile={profile} />
            )
          }
        />
        <Route
          path="/m/assets/:id"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : (
              <MobileAssetDetail profile={profile} />
            )
          }
        />
        <Route
          path="/template-success"
          element={<TemplateSuccess />}
        />
        <Route
          path="/reports"
          element={
            !session ? (
              <Navigate to="/login" replace />
            ) : needsPaymentSetup ? (
              <Navigate to="/complete-setup" replace />
            ) : needsSubscription ? (
              <Navigate to="/subscription-required" replace />
            ) : profile?.role !== 'manager' ? (
              <Navigate to="/" replace />
            ) : (
              <Reports profile={profile} />
            )
          }
        />
      </Routes>
      {session && profile && organization && (
        <GidgetButton
          profile={profile}
          isPro={organization?.is_upgraded === true}
        />
      )}
    </BrowserRouter>
  )
}

export default App