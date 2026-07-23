import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Home, Wrench, Package, BarChart3, Shield, LogOut } from 'lucide-react'

export default function Sidebar({ profile, organization }) {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isPro = organization?.is_upgraded === true

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { path: '/', label: 'Home', Icon: Home, proOnly: false },
    { path: '/assets', label: 'Assets', Icon: Wrench, proOnly: true },
    { path: '/parts', label: 'Parts', Icon: Package, proOnly: true },
    { path: '/reports', label: 'Reports', Icon: BarChart3, proOnly: true },
  ]

  const bottomItems = [
    { path: '/admin', label: 'Admin', Icon: Shield, proOnly: false },
  ]

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const NavLink = ({ item }) => {
    const active = isActive(item.path)
    const locked = item.proOnly && !isPro
    const Icon = item.Icon
    return (
      <a
        onClick={() => navigate(locked ? '/upgrade' : item.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          borderRadius: '8px',
          background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
          color: active ? '#e8c97a' : '#9a9db5',
          fontSize: '14px',
          fontWeight: active ? 600 : 400,
          textDecoration: 'none',
          marginBottom: '2px',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: 'Inter, sans-serif',
          position: 'relative'
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.color = '#e8c97a'
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9a9db5'
          }
        }}
      >
        {active && (
          <span style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '20px',
            borderRadius: '0 3px 3px 0',
            background: '#c9a84c'
          }} />
        )}
        <Icon size={18} strokeWidth={active ? 2.4 : 2} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {locked && (
          <span style={{
            fontSize: '9px',
            color: '#c9a84c',
            background: 'rgba(201,168,76,0.15)',
            padding: '2px 7px',
            borderRadius: '5px',
            fontWeight: 700,
            letterSpacing: '0.05em'
          }}>PRO</span>
        )}
      </a>
    )
  }

  return (
    <div
      className="desktop-sidebar"
      style={{
        width: '232px',
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
      <div style={{ padding: '16px 12px', flex: 1 }}>
        <p style={{
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6a6d85',
          fontWeight: 600,
          margin: '0 0 10px 12px'
        }}>Menu</p>

        {navItems.map(item => <NavLink key={item.path} item={item} />)}

        <div style={{
          height: '1px',
          background: 'rgba(201,168,76,0.1)',
          margin: '14px 4px'
        }} />

        {bottomItems.map(item => <NavLink key={item.path} item={item} />)}
      </div>

      {/* User profile + sign out */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid rgba(201,168,76,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 8px 10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
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
              fontSize: '13px',
              fontWeight: 500,
              margin: '0 0 1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {profile?.full_name || 'User'}
            </p>
            <p style={{
              color: '#6a6d85',
              fontSize: '11px',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            background: 'none',
            border: '1px solid rgba(201,168,76,0.2)',
            color: '#9a9db5',
            padding: '9px',
            borderRadius: '7px',
            fontSize: '11px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'color 0.15s, border-color 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#e8c97a'
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#9a9db5'
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
          }}
        >
          <LogOut size={13} strokeWidth={2} />
          Sign out
        </button>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .desktop-sidebar { display: none !important; }
        }
      `}</style>
    </div>
  )
}
