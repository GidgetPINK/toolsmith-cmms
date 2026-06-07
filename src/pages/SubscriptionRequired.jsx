import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SubscriptionRequired({ profile, organization }) {
  const navigate = useNavigate()
  const [portalLoading, setPortalLoading] = useState(false)

  const isManager = profile?.role === 'manager'

  async function handleOpenPortal() {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in again')
        setPortalLoading(false)
        return
      }

      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Could not open billing portal')
        setPortalLoading(false)
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err)
      alert('Could not open billing portal. Please try again.')
      setPortalLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      color: '#f8f6f1',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: '#16213e',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: '14px',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 1.5rem',
          background: 'rgba(232,201,122,0.12)',
          border: '1px solid rgba(232,201,122,0.4)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          color: '#e8c97a',
          fontWeight: 700
        }}>
          !
        </div>

        <p style={{
          fontSize: '0.72rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#c9a84c',
          fontWeight: 500,
          marginBottom: '0.75rem'
        }}>
          Subscription Required
        </p>

        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '1.8rem',
          fontWeight: 600,
          marginBottom: '1rem',
          lineHeight: 1.25
        }}>
          Your subscription needs attention
        </h1>

        <p style={{
          color: '#9a9db5',
          fontSize: '0.95rem',
          lineHeight: 1.7,
          marginBottom: '2rem'
        }}>
          {isManager ? (
            <>
              Your subscription is no longer active. This usually happens when a payment fails or a subscription is canceled. Open the billing portal to update your payment method or reactivate your subscription.
            </>
          ) : (
            <>
              Your organization's subscription is no longer active. Please contact your manager to restore access. The Toolsmith account manager can update billing through their account settings.
            </>
          )}
        </p>

        {isManager ? (
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              padding: '0.85rem 2rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: portalLoading ? 'wait' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              width: '100%',
              opacity: portalLoading ? 0.6 : 1,
              marginBottom: '0.75rem'
            }}
          >
            {portalLoading ? 'Opening...' : 'Manage Subscription'}
          </button>
        ) : null}

        <button
          onClick={handleSignOut}
          style={{
            background: 'transparent',
            color: '#9a9db5',
            border: '1px solid rgba(154,157,181,0.3)',
            borderRadius: '8px',
            padding: '0.75rem 2rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            width: '100%'
          }}
        >
          Sign Out
        </button>

        <p style={{
          marginTop: '2rem',
          fontSize: '0.78rem',
          color: '#6a6d85',
          lineHeight: 1.6
        }}>
          Need help? Contact us at <a
            href="mailto:gidgetpink@gmail.com"
            style={{ color: '#c9a84c', textDecoration: 'underline' }}
          >gidgetpink@gmail.com</a>
        </p>
      </div>
    </div>
  )
}