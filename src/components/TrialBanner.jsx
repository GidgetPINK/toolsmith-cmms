import { useState, useEffect } from 'react'

export default function TrialBanner({ organization, profile, onManage }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('trial_banner_dismissed')
    if (wasDismissed === 'true') {
      setDismissed(true)
    }
  }, [])

  if (dismissed) return null
  if (!organization) return null
  if (!profile) return null
  if (profile.role !== 'manager') return null
  if (organization.is_upgraded) return null
  if (!organization.trial_end) return null

  const trialEnd = new Date(organization.trial_end)
  const now = new Date()
  const msRemaining = trialEnd - now
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  let tier
  if (daysRemaining <= 0) tier = 'expired'
  else if (daysRemaining <= 2) tier = 'urgent'
  else if (daysRemaining <= 7) tier = 'warning'
  else tier = 'info'

  const config = {
    info: {
      border: 'rgba(201,168,76,0.4)',
      bg: 'rgba(201,168,76,0.08)',
      accent: '#c9a84c',
      icon: '◆',
      message: daysRemaining === 14
        ? 'Your 14-day trial is active'
        : `${daysRemaining} days left in your trial`,
      cta: null
    },
    warning: {
      border: 'rgba(232,201,122,0.6)',
      bg: 'rgba(232,201,122,0.12)',
      accent: '#e8c97a',
      icon: '◆',
      message: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left in your trial`,
      cta: 'Manage subscription'
    },
    urgent: {
      border: 'rgba(224,108,117,0.6)',
      bg: 'rgba(224,108,117,0.12)',
      accent: '#e06c75',
      icon: '!',
      message: daysRemaining === 1
        ? 'Trial ends tomorrow'
        : 'Trial ends today',
      cta: 'Add payment method'
    },
    expired: {
      border: 'rgba(224,108,117,0.8)',
      bg: 'rgba(224,108,117,0.18)',
      accent: '#e06c75',
      icon: '!',
      message: 'Your trial has ended',
      cta: 'Reactivate subscription'
    }
  }[tier]

  function handleDismiss() {
    sessionStorage.setItem('trial_banner_dismissed', 'true')
    setDismissed(true)
  }

  function handleCta() {
    if (onManage) {
      onManage()
    }
  }

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderLeft: `3px solid ${config.accent}`,
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      margin: '0 0 1rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.88rem',
      color: '#f8f6f1'
    }}>
      <span style={{
        color: config.accent,
        fontSize: '1rem',
        fontWeight: 700,
        flexShrink: 0,
        width: '1.25rem',
        textAlign: 'center'
      }}>
        {config.icon}
      </span>

      <span style={{ flex: 1, lineHeight: 1.4 }}>
        {config.message}
      </span>

      {config.cta && (
        <button
          onClick={handleCta}
          style={{
            background: 'transparent',
            border: `1px solid ${config.accent}`,
            color: config.accent,
            padding: '0.35rem 0.85rem',
            borderRadius: '5px',
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            whiteSpace: 'nowrap'
          }}
        >
          {config.cta} →
        </button>
      )}

      {tier !== 'expired' && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9a9db5',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '0 0.25rem',
            lineHeight: 1,
            flexShrink: 0
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}