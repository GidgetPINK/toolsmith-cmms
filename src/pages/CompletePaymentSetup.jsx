import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompletePaymentSetup({ profile }) {
  const [plan, setPlan] = useState('lite_monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const plans = [
    { id: 'lite_monthly', name: 'Lite', price: '$19/mo', priceId: import.meta.env.VITE_STRIPE_LITE_MONTHLY },
    { id: 'lite_yearly', name: 'Lite Annual', price: '$190/yr', priceId: import.meta.env.VITE_STRIPE_LITE_YEARLY },
    { id: 'pro_monthly', name: 'Pro', price: '$49/mo', priceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY },
    { id: 'pro_yearly', name: 'Pro Annual', price: '$490/yr', priceId: import.meta.env.VITE_STRIPE_PRO_YEARLY }
  ]

  async function handleStartCheckout() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Your session expired. Please log in again.')
        setLoading(false)
        return
      }

      const selectedPlan = plans.find(p => p.id === plan)

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ priceId: selectedPlan.priceId })
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      padding: '3rem 5%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '2rem',
          marginBottom: '0.5rem',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          Complete Your Payment Setup
        </h1>
        <p style={{
          color: '#9a9db5',
          fontSize: '0.95rem',
          marginBottom: '2rem',
          textAlign: 'center',
          lineHeight: '1.6'
        }}>
          A payment method on file is required to start your 14-day free trial.
          You will not be charged until your trial ends.
        </p>

        <div style={{
          background: '#1e2245',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <label style={{
            display: 'block',
            color: '#9a9db5',
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            fontWeight: '500'
          }}>
            Select Your Plan
          </label>
          {plans.map(p => (
            <div
              key={p.id}
              onClick={() => setPlan(p.id)}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                background: plan === p.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                border: '1px solid ' + (plan === p.id ? '#c9a84c' : 'rgba(201,168,76,0.18)'),
                marginBottom: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <p style={{ color: '#f8f6f1', fontSize: '0.95rem', margin: 0 }}>
                {p.name} <span style={{ color: '#9a9db5' }}>— {p.price}</span>
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p style={{
            color: '#e06c75',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'rgba(224,108,117,0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(224,108,117,0.2)'
          }}>
            {error}
          </p>
        )}

        <button
          onClick={handleStartCheckout}
          disabled={loading}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '0.9rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '1rem',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {loading ? 'Redirecting...' : 'Continue to Payment Setup'}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(201,168,76,0.18)',
            color: '#9a9db5',
            borderRadius: '8px',
            padding: '0.9rem',
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