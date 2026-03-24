import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Upgrade({ profile }) {
  const [plan, setPlan] = useState('pro_monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const plans = [
    {
      id: 'pro_monthly',
      name: 'Pro — Monthly',
      price: '$49',
      period: 'per month',
      priceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY
    },
    {
      id: 'pro_yearly',
      name: 'Pro — Annual',
      price: '$490',
      period: 'per year',
      priceId: import.meta.env.VITE_STRIPE_PRO_YEARLY,
      savings: 'Save $98 — 2 months free'
    }
  ]

  const selectedPlan = plans.find(p => p.id === plan)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPlan.priceId,
          organizationId: profile.organization_id,
          email: null
        })
      })

      const { url, error: stripeError } = await response.json()
      if (stripeError) throw new Error(stripeError)
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
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
        width: '100%',
        maxWidth: '560px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '0.75rem',
            fontWeight: '500'
          }}>
            Upgrade to Pro
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600',
            color: '#f8f6f1',
            marginBottom: '0.75rem'
          }}>
            Unlock the Full CMMS
          </h1>
          <p style={{ color: '#9a9db5', fontSize: '0.95rem', lineHeight: '1.7' }}>
            Asset management, PM scheduling, reporting, and parts tracking —
            everything your maintenance team needs to run at full capacity.
          </p>
        </div>

        {/* WHAT YOU GET */}
        <div style={{
          background: '#1e2245',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '1.25rem',
            fontWeight: '500'
          }}>
            What unlocks with Pro
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}>
            {[
              'Full asset management',
              'Add, edit and delete assets',
              'PM scheduling',
              'Recurring maintenance tasks',
              'Reporting dashboard',
              'Downtime and compliance reports',
              'Parts tracking',
              'Cost per asset analysis'
            ].map((feature, i) => (
              <p key={i} style={{
                fontSize: '0.85rem',
                color: '#9a9db5',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start'
              }}>
                <span style={{ color: '#c9a84c', flexShrink: 0 }}>✓</span>
                {feature}
              </p>
            ))}
          </div>
        </div>

        {/* PLAN SELECTION */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {plans.map(p => (
            <div
              key={p.id}
              onClick={() => setPlan(p.id)}
              style={{
                background: plan === p.id
                  ? 'rgba(201,168,76,0.08)'
                  : '#1e2245',
                border: `1px solid ${plan === p.id
                  ? '#c9a84c'
                  : 'rgba(201,168,76,0.18)'}`,
                borderRadius: '10px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <p style={{
                fontSize: '0.78rem',
                color: '#c9a84c',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
                fontWeight: '500'
              }}>
                {p.name}
              </p>
              <p style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.6rem',
                fontWeight: '700',
                color: '#f8f6f1',
                marginBottom: '0.15rem'
              }}>
                {p.price}
              </p>
              <p style={{
                fontSize: '0.78rem',
                color: '#9a9db5',
                marginBottom: p.savings ? '0.5rem' : '0'
              }}>
                {p.period}
              </p>
              {p.savings && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#98c379',
                  fontWeight: '500'
                }}>
                  {p.savings}
                </p>
              )}
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
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '1rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'Inter, sans-serif',
            marginBottom: '1rem'
          }}
        >
          {loading ? 'Redirecting to checkout...' : `Upgrade to ${selectedPlan.name}`}
        </button>

        <button
          onClick={() => navigate('/')}
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
          Maybe Later
        </button>

        <p style={{
          color: '#9a9db5',
          fontSize: '0.78rem',
          textAlign: 'center',
          marginTop: '1.25rem',
          lineHeight: '1.6'
        }}>
          Cancel any time. No contracts.
        </p>
      </div>
    </div>
  )
}