import { useState } from 'react'
import { supabase } from '../lib/supabase'

const forgotLinkStyle = {
  display: 'block',
  textAlign: 'center',
  color: '#9a9db5',
  fontSize: '0.85rem',
  textDecoration: 'none',
  marginTop: '0.5rem'
}

const registerLinkStyle = {
  display: 'block',
  textAlign: 'center',
  color: '#c9a84c',
  fontSize: '0.85rem',
  textDecoration: 'none',
  marginTop: '0.75rem'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
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
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#1e2245',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: '12px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '1.8rem',
          marginBottom: '0.25rem',
          fontWeight: '600'
        }}>
          The Toolsmith
        </h1>
        <p style={{
          color: '#9a9db5',
          fontSize: '0.88rem',
          marginBottom: '2rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase'
        }}>
          CMMS — Sign In
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              color: '#9a9db5',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
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
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#9a9db5',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
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
              }}
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <a href="/reset-password" style={forgotLinkStyle}>
            Forgot your password?
          </a>

          <a href="/register" style={registerLinkStyle}>
            Don't have an account? Start your free trial
          </a>

        </form>
      </div>
    </div>
  )
}