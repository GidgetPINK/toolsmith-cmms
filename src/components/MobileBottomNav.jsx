import { useNavigate, useLocation } from 'react-router-dom'

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { path: '/m/work-orders', label: 'Orders', icon: '📋' },
    { path: '/m/assets', label: 'Assets', icon: '🔧' },
    { path: '/admin', label: 'Admin', icon: '⚙️' }
  ]

  function isActive(tabPath) {
    if (tabPath === '/admin') {
      return location.pathname.startsWith('/admin')
    }
    return location.pathname.startsWith(tabPath)
  }

  return (
    <nav style={{
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
              padding: '0.65rem 0.5rem 0.85rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.25rem',
              color: active ? '#c9a84c' : '#9a9db5',
              borderTop: active ? '2px solid #c9a84c' : '2px solid transparent',
              marginTop: '-1px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: active ? 600 : 500
            }}
          >
            <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}