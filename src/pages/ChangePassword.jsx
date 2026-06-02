import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  padding: '0.8rem 3rem 0.8rem 1rem',
  color: '#f8f6f1',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box'
}

const labelStyle = {
  display: 'block',
  color: '#9a9db5',
  fontSize: '0.8rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '0.5rem'
}

const showBtnStyle = {
  position: 'absolute',
  right: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#9a9db5',
  fontSize: '0.78rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  fontFamily: 'Inter, sans-serif',
  padding: '0'
}

export default function ChangePassword({ profile }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleChange(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
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
          Change Password
        </p>

        {success ? (
          <div>
            <div style={{
              background: 'rgba(152,195,121,0.1)',
              border: '1px solid rgba(152,195,121,0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#98c379', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Your password has been updated successfully.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
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
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleChange}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={showBtnStyle}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={showBtnStyle}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid rgba(201,168,76,0.18)',
                color: '#9a9db5',
                borderRadius: '8px',
                padding: '0.9rem',
                fontSize: '0.9rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}