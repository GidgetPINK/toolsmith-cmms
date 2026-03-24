import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
  closed: '#6a6d85'
}

export default function Queue({ profile }) {
  const [workOrders, setWorkOrders] = useState([])
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')
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

  const filtered = workOrders
    .filter(wo => {
      if (filter === 'open') return wo.status !== 'closed'
      if (filter === 'closed') return wo.status === 'closed'
      return true
    })
    .sort((a, b) => {
      if (filter === 'open') {
        return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const openCount = workOrders.filter(wo => wo.status !== 'closed').length
  const criticalCount = workOrders.filter(
    wo => wo.priority === 'critical' && wo.status !== 'closed'
  ).length
  const closedCount = workOrders.filter(wo => wo.status === 'closed').length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1'
    }}>

      {/* NAV */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 5%',
        background: 'rgba(26,26,46,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <span style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          The Toolsmith CMMS
        </span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/work-order/new')}
            style={{
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              border: 'none',
              color: '#1a1a2e',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            + New Work Order
          </button>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: '#9a9db5',
              cursor: 'pointer',
              fontSize: '0.82rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Sign Out
          </button>

        <button
  onClick={() => navigate('/change-password')}
  style={{
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
  }}
>
  Change Password
</button>  
        </div>
      </nav>

      <div style={{ padding: '2.5rem 5%' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '0.4rem',
            fontWeight: '500'
          }}>
            Technician Queue
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600',
            color: '#f8f6f1',
            marginBottom: '0.25rem'
          }}>
            {profile?.full_name}
          </h1>
          <p style={{ color: '#9a9db5', fontSize: '0.88rem' }}>
            Your assigned work orders, sorted by priority
          </p>
        </div>

        {/* STAT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem'
        }}>
          {[
            { label: 'Open', value: openCount, color: '#c9a84c' },
            { label: 'Critical', value: criticalCount, color: '#e06c75' },
            { label: 'Completed', value: closedCount, color: '#9a9db5' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: stat.color,
                marginBottom: '0.25rem'
              }}>
                {stat.value}
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: '#9a9db5',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={{
          display: 'flex',
          gap: '0.65rem',
          marginBottom: '1.75rem',
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Completed' },
            { value: 'all', label: 'All' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: '0.4rem 1.1rem',
                borderRadius: '20px',
                border: `1px solid ${filter === f.value
                  ? '#c9a84c'
                  : 'rgba(201,168,76,0.18)'}`,
                background: filter === f.value
                  ? 'rgba(201,168,76,0.08)'
                  : 'none',
                color: filter === f.value ? '#c9a84c' : '#9a9db5',
                fontSize: '0.82rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {f.label}
            </button>
          ))}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(wo => (
              <div
                key={wo.id}
                onClick={() => navigate(`/work-order/${wo.id}`)}
                style={{
                  background: '#1e2245',
                  border: `1px solid ${wo.priority === 'critical' && wo.status !== 'closed'
                    ? 'rgba(224,108,117,0.4)'
                    : 'rgba(201,168,76,0.18)'}`,
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: '0.65rem',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: PRIORITY_COLOR[wo.priority] || '#9a9db5',
                    background: PRIORITY_BG[wo.priority] || 'rgba(154,157,181,0.12)',
                    border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}`
                  }}>
                    {wo.priority}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    letterSpacing: '0.08em',
                    textTransform: 'capitalize',
                    color: STATUS_COLOR[wo.status] || '#9a9db5',
                    border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}`,
                    background: 'transparent'
                  }}>
                    {wo.status}
                  </span>
                  {wo.priority === 'critical' && wo.status !== 'closed' && (
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#e06c75',
                      fontWeight: '600'
                    }}>
                      ⚠ Needs immediate attention
                    </span>
                  )}
                </div>

                <h3 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#f8f6f1',
                  marginBottom: '0.4rem'
                }}>
                  {wo.title}
                </h3>

                {wo.description && (
                  <p style={{
                    color: '#9a9db5',
                    fontSize: '0.87rem',
                    lineHeight: '1.6',
                    marginBottom: '0.75rem'
                  }}>
                    {wo.description.length > 120
                      ? wo.description.slice(0, 120) + '...'
                      : wo.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                    <span style={{ color: '#c9a84c' }}>Asset:</span> {getAssetName(wo.asset_id)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                    <span style={{ color: '#c9a84c' }}>Created:</span> {new Date(wo.created_at).toLocaleDateString()}
                  </span>
                  {wo.closed_at && (
                    <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                      <span style={{ color: '#c9a84c' }}>Closed:</span> {new Date(wo.closed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}