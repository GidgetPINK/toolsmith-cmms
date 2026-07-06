import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Sidebar({ profile }) {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { path: '/', label: 'Home', icon: '⌂' },
    { path: '/assets', label: 'Assets', icon: '⚙' },
    { path: '/parts', label: 'Parts', icon: '▦' },
    { path: '/reports', label: 'Reports', icon: '⊞' },
  ]

  const bottomItems = [
    { path: '/admin', label: 'Admin', icon: '⚑' },
  ]

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const NavLink = ({ item }) => {
    const active = isActive(item.path)
    return (
      <a
        onClick={() => navigate(item.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '11px 14px',
          borderRadius: '8px',
          background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
          borderLeft: active ? '3px solid #c9a84c' : '3px solid transparent',
          color: active ? '#c9a84c' : '#9a9db5',
          fontSize: '15px',
          fontWeight: active ? 500 : 400,
          textDecoration: 'none',
          marginBottom: '4px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'Inter, sans-serif'
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(201,168,76,0.05)'
            e.currentTarget.style.color = '#c9a84c'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9a9db5'
          }
        }}
      >
        <span style={{ width: '18px', textAlign: 'center', fontSize: '17px' }}>{item.icon}</span>
        <span>{item.label}</span>
      </a>
    )
  }

  return (
    <div
      className="desktop-sidebar"
      style={{
        width: '220px',
        flexShrink: 0,
        background: 'rgba(0,0,0,0.25)',
        borderRight: '1px solid rgba(201,168,76,0.15)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Main nav */}
      <div style={{ padding: '24px 8px 12px', flex: 1 }}>
        {navItems.map(item => <NavLink key={item.path} item={item} />)}

        <div style={{
          height: '1px',
          background: 'rgba(201,168,76,0.1)',
          margin: '12px 4px'
        }}></div>

        {bottomItems.map(item => <NavLink key={item.path} item={item} />)}
      </div>

      {/* User profile + sign out */}
      <div style={{
        padding: '12px 8px',
        borderTop: '1px solid rgba(201,168,76,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a1a2e',
            fontSize: '12px',
            fontWeight: 700,
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: '#f8f6f1',
              fontSize: '12px',
              margin: '0 0 1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {profile?.full_name || 'User'}
            </p>
            <p style={{
              color: '#6a6d85',
              fontSize: '10px',
              margin: 0,
              textTransform: 'capitalize'
            }}>
              {profile?.role || 'Member'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            marginTop: '4px',
            background: 'none',
            border: '1px solid rgba(201,168,76,0.2)',
            color: '#9a9db5',
            padding: '7px',
            borderRadius: '6px',
            fontSize: '11px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'color 0.15s, border-color 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#c9a84c'
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#9a9db5'
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
          }}
        >
          Sign out
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .desktop-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
