import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Success({ profile }) {
  const [countdown, setCountdown] = useState(5)
  const [isBeta, setIsBeta] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile?.organization_id) return
    supabase
      .from('organizations')
      .select('is_beta')
      .eq('id', profile.organization_id)
      .single()
      .then(({ data }) => setIsBeta(!!data?.is_beta))
  }, [profile])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
        border: '1px solid rgba(152,195,121,0.3)',
        borderRadius: '12px',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '480px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(152,195,121,0.12)',
          border: '1px solid rgba(152,195,121,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          margin: '0 auto 1.5rem'
        }}>
          ✓
        </div>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '1.8rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          You are all set.
        </h1>
        <p style={{
          color: '#f8f6f1',
          fontSize: '0.98rem',
          lineHeight: '1.75',
          marginBottom: '0.75rem'
        }}>
          {isBeta
            ? "You're officially in the beta. Welcome to The Toolsmith"
            : 'Your 14-day free trial has started. Welcome to The Toolsmith'}
          {' '}CMMS{profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}.
        </p>
        <p style={{
          color: '#9a9db5',
          fontSize: '0.88rem',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          {isBeta
            ? "No card was required to join. You're free through the beta and your six months after it wraps up."
            : 'Your card will not be charged until your trial ends.'}
          {' '}You can cancel any time from your account settings.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '0.9rem 2.5rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '1rem'
          }}
        >
          Go to Dashboard
        </button>
        <p style={{ color: '#9a9db5', fontSize: '0.8rem' }}>
          Redirecting automatically in {countdown} seconds...
        </p>
      </div>
    </div>
  )
}