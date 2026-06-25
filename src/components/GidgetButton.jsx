import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import GidgetChatPanel from './GidgetChatPanel'

function getPageName(pathname) {
  if (pathname === '/' || pathname === '') return 'Dashboard'
  if (pathname.startsWith('/work-order/new')) return 'New Work Order'
  if (pathname.startsWith('/work-order/')) return 'Work Order Detail'
  if (pathname === '/parts') return 'Parts and Inventory'
  if (pathname === '/team') return 'Team Management'
  if (pathname === '/admin') return 'Admin'
  if (pathname === '/upgrade') return 'Upgrade'
  if (pathname.startsWith('/m/assets/')) return 'Asset Detail'
  if (pathname.startsWith('/m/')) return 'Mobile Dashboard'
  return 'The Toolsmith'
}

export default function GidgetButton({ profile, isPro }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Don't show if not Pro or no profile
  if (!isPro || !profile) return null

  // Hide on certain pages (auth pages, etc.)
  const hideOnPaths = ['/login', '/signup', '/reset-password', '/change-password', '/upgrade']
  if (hideOnPaths.some(p => location.pathname.startsWith(p))) return null

  const buttonStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(201,168,76,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    transition: 'transform 0.2s',
    fontSize: '24px'
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={buttonStyle}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        aria-label="Open Gidget AI Assistant"
        title="Ask Gidget"
      >
        ✨
      </button>

      {open && (
        <GidgetChatPanel
          contextType="general"
          contextData={{ page: getPageName(location.pathname) }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}