import { useState } from 'react'
import { supabase } from '../lib/supabase'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  padding: '0.8rem 1rem',
  color: '#f8f6f1',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box'
}

const labelStyle = {
  display: 'block',
  color: '#9a9db5',
  fontSize: '0.78rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '0.5rem',
  fontWeight: '500'
}

export default function Register() {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [plan, setPlan] = useState('lite_monthly')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const plans = [
    {
      id: 'lite_monthly',
      name: 'Lite',
      price: '$19',
      period: 'per month',
      priceId: import.meta.env.VITE_STRIPE_LITE_MONTHLY,
      features: [
        'Work order management',
        'Technician management',
        'Manager dashboard',
        'Up to 10 team members'
      ]
    },
    {
      id: 'lite_yearly',
      name: 'Lite — Annual',
      price: '$190',
      period: 'per year',
      priceId: import.meta.env.VITE_STRIPE_LITE_YEARLY,
      features: [
        'Everything in Lite Monthly',
        '2 months free',
        'Best value for committed teams'
      ]
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: '$49',
      period: 'per month',
      priceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY,
      features: [
        'Everything in Lite',
        'Asset management',
        'PM scheduling',
        'Reporting and analytics',
        'Parts tracking'
      ]
    },
    {
      id: 'pro_yearly',
      name: 'Pro — Annual',
      price: '$490',
      period: 'per year',
      priceId: import.meta.env.VITE_STRIPE_PRO_YEARLY,
      features: [
        'Everything in Pro Monthly',
        '2 months free',
        'Best value for committed teams'
      ]
    }
  ]

  const selectedPlan = plans.find(p => p.id === plan)

  async function handleRegister(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // Step 1 — create manager account and organization
      // via database function so session is not affected
      const { data, error: fnError } = await supabase.rpc(
        'create_manager_account',
        {
          manager_email: email,
          manager_password: password,
          manager_name: fullName,
          org_name: orgName
        }
      )

      if (fnError) throw fnError
      if (!data) throw new Error('Account creation failed.')

      const organizationId = data.organization_id

      // Step 2 — create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPlan.priceId,
          organizationId,
          email
        })
      })

      const { url, error: stripeError } = await response.json()
      if (stripeError) throw new Error(stripeError)

      // Step 3 — redirect to Stripe checkout
      window.location.href = url

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      padding: '3rem 5%'
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            color: '#c9a84c',
            fontSize: '2rem',
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            The Toolsmith CMMS
          </h1>
          <p style={{ color: '#9a9db5', fontSize: '0.95rem' }}>
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        {/* STEP INDICATOR */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem',
          alignItems: 'center'
        }}>
          {[1, 2].map(s => (
            <div
              key={s}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: step >= s
                  ? 'linear-gradient(135deg, #c9a84c, #e8c97a)'
                  : 'rgba(255,255,255,0.05)',
                border: step >= s
                  ? 'none'
                  : '1px solid rgba(201,168,76,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.82rem',
                fontWeight: '700',
                color: step >= s ? '#1a1a2e' : '#9a9db5'
              }}>
                {s}
              </div>
              <span style={{
                fontSize: '0.82rem',
                color: step >= s ? '#f8f6f1' : '#9a9db5',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                {s === 1 ? 'Choose Plan' : 'Create Account'}
              </span>
              {s < 2 && (
                <div style={{
                  width: '40px',
                  height: '1px',
                  background: 'rgba(201,168,76,0.18)'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1 — PLAN SELECTION */}
        {step === 1 && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {plans.map(p => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  style={{
                    background: plan === p.id
                      ? 'rgba(201,168,76,0.08)'
                      : '#1e2245',
                    border: '1px solid ' + (plan === p.id
                      ? '#c9a84c'
                      : 'rgba(201,168,76,0.18)'),
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: '#c9a84c',
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                  }}>
                    {p.name}
                  </p>
                  <p style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    color: '#f8f6f1',
                    marginBottom: '0.15rem'
                  }}>
                    {p.price}
                  </p>
                  <p style={{
                    fontSize: '0.78rem',
                    color: '#9a9db5',
                    marginBottom: '1.25rem'
                  }}>
                    {p.period}
                  </p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {p.features.map((f, i) => (
                      <p key={i} style={{
                        fontSize: '0.82rem',
                        color: '#9a9db5',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ color: '#c9a84c', flexShrink: 0 }}>
                          ✓
                        </span>
                        {f}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: '#9a9db5',
                fontSize: '0.82rem',
                marginBottom: '1.5rem'
              }}>
                14-day free trial on all plans. Cancel any time.
              </p>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.9rem 3rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Continue with {selectedPlan.name}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — ACCOUNT CREATION */}
        {step === 2 && (
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#c9a84c',
                marginBottom: '0.25rem',
                fontWeight: '500'
              }}>
                Selected Plan
              </p>
              <p style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.1rem',
                color: '#f8f6f1'
              }}>
                {selectedPlan.name} — {selectedPlan.price} {selectedPlan.period}
              </p>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Your Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  required
                  placeholder="Acme Maintenance Co."
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="jane@company.com"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  style={inputStyle}
                />
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
                type="submit"
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
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: '1rem'
                }}
              >
                {loading ? 'Creating your account...' : 'Start Free Trial'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
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
                Back to Plan Selection
              </button>
            </form>

            <p style={{
              color: '#9a9db5',
              fontSize: '0.78rem',
              textAlign: 'center',
              marginTop: '1.25rem',
              lineHeight: '1.6'
            }}>
              By starting your trial you agree to our terms of service.
              Your card will not be charged until your 14-day trial ends.
            </p>
          </div>
        )}

        <p style={{
          textAlign: 'center',
          color: '#9a9db5',
          fontSize: '0.85rem',
          marginTop: '2rem'
        }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#c9a84c', textDecoration: 'none' }}>
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}