import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MobileBottomNav({ profile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const isManager = profile?.role === 'manager'
  const tabs = isManager
    ? [
        { path: '/m/work-orders', label: 'Home', icon: '⌂' },
        { path: '/m/assets', label: 'Assets', icon: '⚙' },
        { path: '/parts', label: 'Parts', icon: '▦' },
        { path: '/reports', label: 'Reports', icon: '⊞' }
      ]
    : [
        { path: '/m/work-orders', label: 'Home', icon: '⌂' },
        { path: '/m/assets', label: 'Assets', icon: '⚙' }
      ]

  function isActive(tabPath) {
    return location.pathname.startsWith(tabPath)
  }

  const moreActive = location.pathname.startsWith('/admin')

  async function handleSignOut() {
    setMoreOpen(false)
    await supabase.auth.signOut()
    navigate('/login')
  }

  function goTo(path) {
    setMoreOpen(false)
    navigate(path)
  }

  return (
    <>
      <style>{`
        @media (min-width: 901px) { .mobile-bottom-nav, .mobile-more-menu, .mobile-more-backdrop { display: none !important; } }
        @media (max-width: 900px) { body { padding-bottom: calc(66px + env(safe-area-inset-bottom)) !important; } }
      `}</style>

      {moreOpen && (
        <>
          <div
            className="mobile-more-backdrop"
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 60,
              backdropFilter: 'blur(2px)'
            }}
          />
          <div
            className="mobile-more-menu"
            style={{
              position: 'fixed',
              bottom: 'calc(66px + env(safe-area-inset-bottom))',
              right: '0.75rem',
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '12px',
              padding: '0.5rem',
              minWidth: '180px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 61,
              fontFamily: 'Inter, sans-serif'
            }}
          >
            <button
              onClick={() => goTo('/admin')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: moreActive ? 'rgba(201,168,76,0.1)' : 'none',
                border: 'none',
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#f8f6f1',
                fontSize: '0.9rem',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.05rem', color: '#c9a84c' }}>⚑</span>
              <span>Admin</span>
            </button>
            <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', margin: '0.35rem 0.5rem' }}></div>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'none',
                border: 'none',
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#9a9db5',
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1rem', color: '#9a9db5' }}>⇥</span>
              <span>Sign out</span>
            </button>
          </div>
        </>
      )}

      <nav className="mobile-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#16213e',
        borderTop: '1px solid rgba(201,168,76,0.25)',
        display: 'flex',
        zIndex: 50,
        boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        fontFamily: 'Inter, sans-serif'
      }}>
        {tabs.map(tab => {
          const active = isActive(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                background: active ? 'rgba(201,168,76,0.06)' : 'none',
                border: 'none',
                padding: '0.65rem 0.35rem 0.85rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                color: active ? '#c9a84c' : '#9a9db5',
                borderTop: active ? '2px solid #c9a84c' : '2px solid transparent',
                marginTop: '-1px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.62rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: active ? 600 : 500
              }}
            >
              <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'inherit' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            flex: 0.75,
            background: moreOpen || moreActive ? 'rgba(201,168,76,0.06)' : 'none',
            border: 'none',
            borderLeft: '1px solid rgba(201,168,76,0.15)',
            padding: '0.65rem 0.35rem 0.85rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
            color: moreOpen || moreActive ? '#c9a84c' : '#9a9db5',
            borderTop: moreActive ? '2px solid #c9a84c' : '2px solid transparent',
            marginTop: '-1px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.62rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: moreActive ? 600 : 500
          }}
        >
          <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'inherit' }}>⋯</span>
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
