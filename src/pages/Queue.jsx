import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useUnreadMessages from '../hooks/useUnreadMessages'
import WorkOrderCard from '../components/WorkOrderCard'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'

const PRIORITY_COLOR = {
  critical: '#e06c75',
  high: '#e8c97a',
  standard: '#9a9db5',
  routine: '#6a6d85'
}

const PRIORITY_BG = {
  critical: 'rgba(224,108,117,0.12)',
  high: 'rgba(232,201,122,0.12)',
  standard: 'rgba(154,157,181,0.12)',
  routine: 'rgba(106,109,133,0.12)'
}

const PRIORITY_ORDER = { critical: 0, high: 1, standard: 2, routine: 3 }

const STATUS_COLOR = {
  open: '#c9a84c',
  'in progress': '#6cb6e0',
  completed: '#7bc47f',
  closed: '#6a6d85'
}

const navBtnStyle = {
  background: 'none',
  border: '1px solid rgba(201,168,76,0.18)',
  color: '#9a9db5',
  padding: '0.4rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontFamily: 'Inter, sans-serif'
}

const mobileNavBtnStyle = {
  background: 'none',
  border: '1px solid rgba(201,168,76,0.18)',
  color: '#f8f6f1',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.78rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontFamily: 'Inter, sans-serif',
  textAlign: 'left',
  width: '100%'
}

export default function Queue({ profile }) {
  const { unreadIds, hasMessagesIds } = useUnreadMessages(profile?.id)
  const [workOrders, setWorkOrders] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (profile?.id) fetchAll()
  }, [profile?.id])

  async function fetchAll() {
    if (!profile?.id) return
    setLoading(true)
    const [woRes, assetRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*')
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('assets').select('*')
    ])
    setWorkOrders(woRes.data || [])
    setAssets(assetRes.data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function getAssetName(id) {
    const asset = assets.find(a => a.id === id)
    return asset ? asset.name : 'No asset'
  }

  function getTechName(id) {
    if (id === profile?.id) return profile?.full_name || 'You'
    return 'Unassigned'
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const isFinished = wo => wo.status === 'completed' || wo.status === 'closed'

  const q = searchQuery.trim().toLowerCase()

  const STATUS_WORDS = ['open', 'in progress', 'completed', 'closed']
  const filtered = (q
    ? workOrders.filter(wo =>
        (q.length >= 2 && STATUS_WORDS.filter(w => w.startsWith(q)).length === 1)
          ? (wo.status || '').toLowerCase() === STATUS_WORDS.filter(w => w.startsWith(q))[0]
          : (wo.title || '').toLowerCase().includes(q) ||
            (wo.description || '').toLowerCase().includes(q)
      )
    : workOrders.filter(wo => {
        if (filter === 'open') return !isFinished(wo)
        if (filter === 'finished') return isFinished(wo)
        return true
      })
  ).sort((a, b) => {
    if (!q && filter === 'open') {
      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    }
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const openCount = workOrders.filter(wo => !isFinished(wo)).length
  const criticalCount = workOrders.filter(
    wo => wo.priority === 'critical' && !isFinished(wo)
  ).length
  const finishedCount = workOrders.filter(isFinished).length

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1'
    }}>
      <Sidebar profile={profile} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>

      {/* NAV */}
      <nav style={{
        background: 'rgba(26,26,46,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 5%'
        }}>
          <span style={{
            fontFamily: 'Georgia, serif',
            color: '#c9a84c',
            fontSize: '1.3rem',
            fontWeight: '600'
          }}>
            The Toolsmith CMMS
          </span>
          <div
            className="desktop-nav"
            style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <button
              onClick={() => navigate('/change-password')}
              style={navBtnStyle}
            >
              Change Password
            </button>
            <button onClick={handleSignOut} style={navBtnStyle}>
              Sign Out
            </button>
          </div>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="mobile-hamburger"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flexDirection: 'column',
              gap: '4px',
              padding: '4px'
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                display: 'block',
                width: '20px',
                height: '2px',
                background: '#9a9db5',
                borderRadius: '1px'
              }} />
            ))}
          </button>
        </div>

        {mobileNavOpen && (
          <div
            className="mobile-nav-dropdown"
            style={{
              display: 'none',
              flexDirection: 'column',
              gap: '6px',
              padding: '0.75rem 5%',
              borderTop: '1px solid rgba(201,168,76,0.12)'
            }}
          >
            <button
              onClick={() => { navigate('/change-password'); setMobileNavOpen(false) }}
              style={mobileNavBtnStyle}
            >
              Change Password
            </button>
            <button onClick={handleSignOut} style={mobileNavBtnStyle}>
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .mobile-nav-dropdown { display: flex !important; }
          .queue-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ padding: '2rem 2.5rem' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '0.35rem',
            fontWeight: '500'
          }}>
            Technician Queue
          </p>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1.4rem',
            fontWeight: '400',
            color: '#f8f6f1',
            marginBottom: '0.25rem'
          }}>
            Hi, {firstName}!
          </h1>
          <p style={{ color: '#9a9db5', fontSize: '0.88rem' }}>
            Your assigned work orders, sorted by priority
          </p>
        </div>

        {/* STAT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '0.75rem',
          marginBottom: '2rem'
        }} className="queue-stat-grid">
          {[
            { label: 'Open', value: openCount, color: '#c9a84c' },
            { label: 'Critical', value: criticalCount, color: '#e06c75' },
            { label: 'Completed', value: finishedCount, color: '#9a9db5' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                color: stat.color,
                marginBottom: '0.2rem'
              }}>
                {stat.value}
              </p>
              <p style={{
                fontSize: '0.7rem',
                color: '#9a9db5',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* SEARCH */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all work orders by title or description..."
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '8px',
              color: '#f8f6f1',
              fontSize: '0.9rem',
              fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery.trim() && (
            <p style={{ fontSize: '0.72rem', color: '#9a9db5', margin: '0.4rem 0 0' }}>
              Searching all work orders including completed and closed. Clear the search to return to your queue.
            </p>
          )}
        </div>

        {/* FILTERS + NEW WO BUTTON */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { value: 'open', label: 'Open' },
              { value: 'finished', label: 'Completed' },
              { value: 'all', label: 'All' }
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  padding: '0.35rem 0.9rem',
                  borderRadius: '20px',
                  border: `1px solid ${filter === f.value
                    ? '#c9a84c'
                    : 'rgba(201,168,76,0.18)'}`,
                  background: filter === f.value
                    ? 'rgba(201,168,76,0.08)'
                    : 'none',
                  color: filter === f.value ? '#c9a84c' : '#9a9db5',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/work-order/new')}
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              border: 'none',
              color: '#1a1a2e',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
              whiteSpace: 'nowrap'
            }}
          >
            + New Work Order
          </button>
        </div>

        {/* WORK ORDER LIST */}
        {loading ? (
          <p style={{ color: '#9a9db5' }}>Loading your queue...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#9a9db5'
          }}>
            {filter === 'open'
              ? 'No open work orders assigned to you.'
              : filter === 'closed'
              ? 'No completed work orders yet.'
              : 'No work orders found.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filtered.map(wo => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                hasMessages={hasMessagesIds.has(wo.id)}
                hasUnread={unreadIds.has(wo.id)}
                assetName={getAssetName(wo.asset_id)}
                techName={getTechName(wo.assigned_to)}
                onClick={() => navigate(`/work-order/${wo.id}`)}
              />
            ))}

          </div>
        )}
      </div>
      </div>
      <MobileBottomNav profile={profile} />
    </div>
  )
}