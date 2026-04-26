import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TemplateSuccess() {
  const [countdown, setCountdown] = useState(10)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = 'https://thetoolsmithapp.com'
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
        maxWidth: '520px',
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
          Your purchase is confirmed.
        </h1>
        <p style={{
          color: '#f8f6f1',
          fontSize: '0.98rem',
          lineHeight: '1.75',
          marginBottom: '0.75rem'
        }}>
          Your Preventive Maintenance Scheduler is on its way. Check your inbox for an email from{' '}
          <span style={{ color: '#c9a84c' }}>orders@thetoolsmithapp.com</span>{' '}
          with your Google Sheets link and setup instructions.
        </p>
        <p style={{
          color: '#9a9db5',
          fontSize: '0.88rem',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          If you do not see the email within a few minutes check your spam folder.
          Reply to the email if you need any help getting set up.
        </p>
        
          href="https://thetoolsmithapp.com"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '0.9rem 2.5rem',
            fontSize: '0.9rem',
            fontWeight: '700',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '1rem',
            display: 'block'
          }}
        >
          Back to The Toolsmith
        </a>
        <p style={{ color: '#9a9db5', fontSize: '0.8rem' }}>
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  )
}