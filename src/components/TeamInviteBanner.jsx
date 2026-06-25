import { useNavigate } from 'react-router-dom'

export default function TeamInviteBanner({ profile, profiles, isPro }) {
  const navigate = useNavigate()

  // Only show for managers
  if (profile?.role !== 'manager') return null

  // Count team members other than the current user
  const otherMembers = (profiles || []).filter(p => p.id !== profile?.id && p.is_active)

  // If they have at least one other team member, hide the banner
  if (otherMembers.length > 0) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(232,201,122,0.06))',
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <div style={{
        fontSize: '1.5rem',
        flexShrink: 0
      }}>
        👥
      </div>
      <div style={{
        flex: 1,
        minWidth: '200px'
      }}>
        <p style={{
          color: '#f8f6f1',
          fontSize: '0.95rem',
          fontWeight: 600,
          margin: '0 0 0.25rem 0',
          fontFamily: 'Inter, sans-serif'
        }}>
          Add your team to get the most out of The Toolsmith
        </p>
        <p style={{
          color: '#9a9db5',
          fontSize: '0.82rem',
          margin: 0,
          lineHeight: 1.5
        }}>
          Invite your technicians from Admin → Team Management so you can assign work orders.
          {!isPro && ' Lite plans include up to 10 team members.'}
        </p>
      </div>
      <button
        onClick={() => navigate('/team')}
        style={{
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 18px',
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(201,168,76,0.25)',
          transition: 'transform 0.15s, box-shadow 0.2s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(201,168,76,0.4)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 6px rgba(201,168,76,0.25)'
        }}
      >
        Invite Team →
      </button>
    </div>
  )
}