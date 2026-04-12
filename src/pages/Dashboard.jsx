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

const STATUS_COLOR = {
  open: '#c9a84c',
  'in progress': '#6cb6e0',
  closed: '#6a6d85'
}

export default function Dashboard({ profile }) {
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [assets, setAssets] = useState([])
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [woRes, profRes, assetRes, orgRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*')
        .neq('status', 'closed')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('assets').select('*').order('name'),
      supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()
    ])
    setWorkOrders(woRes.data || [])
    setProfiles(profRes.data || [])
    setAssets(assetRes.data || [])
    setOrganization(orgRes.data || null)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function getTechName(id) {
    const tech = profiles.find(p => p.id === id)
    return tech ? tech.full_name : 'Unassigned'
  }

  function getAssetName(id) {
    const asset = assets.find(a => a.id === id)
    return asset ? asset.name : 'No asset'
  }

  function getAssetWorkOrderCount(assetId) {
    return workOrders.filter(wo => wo.asset_id === assetId).length
  }

  const filtered = filter === 'all'
    ? workOrders
    : workOrders.filter(wo => wo.priority === filter)

  const displayedOrders = selectedAsset
    ? filtered.filter(wo => wo.asset_id === selectedAsset)
    : filtered

  const counts = {
    critical: workOrders.filter(wo => wo.priority === 'critical').length,
    high: workOrders.filter(wo => wo.priority === 'high').length,
    standard: workOrders.filter(wo => wo.priority === 'standard').length,
    routine: workOrders.filter(wo => wo.priority === 'routine').length,
    total: workOrders.length
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1'
    }}>

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

          {/* DESKTOP NAV BUTTONS */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}
            className="desktop-nav"
          >
            <button onClick={() => navigate('/team')} style={navBtnStyle}>Team</button>
            <button onClick={() => navigate('/change-password')} style={navBtnStyle}>Change Password</button>
            <button onClick={handleSignOut} style={navBtnStyle}>Sign Out</button>
          </div>

          {/* MOBILE HAMBURGER */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flexDirection: 'column',
              gap: '4px',
              padding: '4px'
            }}
            className="mobile-hamburger"
          >
            {[0,1,2].map(i => (
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

        {/* MOBILE NAV DROPDOWN */}
        {mobileNavOpen && (
          <div style={{
            display: 'none',
            flexDirection: 'column',
            gap: '6px',
            padding: '0.75rem 5%',
            borderTop: '1px solid rgba(201,168,76,0.12)'
          }}
            className="mobile-nav-dropdown"
          >
            <button onClick={() => { navigate('/team'); setMobileNavOpen(false) }} style={mobileNavBtnStyle}>Team</button>
            <button onClick={() => { navigate('/change-password'); setMobileNavOpen(false) }} style={mobileNavBtnStyle}>Change Password</button>
            <button onClick={handleSignOut} style={mobileNavBtnStyle}>Sign Out</button>
          </div>
        )}
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: flex !important; }
          .mobile-nav-dropdown { display: flex !important; }
          .app-body { flex-direction: column !important; }
          .sidebar { width: 100% !important; min-height: auto !important; border-right: none !important; border-bottom: 1px solid rgba(201,168,76,0.15) !important; }
          .stat-grid-inner { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ display: 'flex' }} className="app-body">

        {/* SIDEBAR */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          background: '#16213e',
          borderRight: '1px solid rgba(201,168,76,0.15)',
          padding: '1.5rem 1rem',
          minHeight: 'calc(100vh - 64px)'
        }} className="sidebar">
          <p style={{
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '1rem',
            fontWeight: '500'
          }}>
            Assets
          </p>

          {assets.length === 0 ? (
            <p style={{ color: '#9a9db5', fontSize: '0.82rem', lineHeight: '1.6' }}>
              No assets yet. Add one when creating a work order.
            </p>
          ) : (
            assets.map(asset => {
              const woCount = getAssetWorkOrderCount(asset.id)
              const isSelected = selectedAsset === asset.id
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(isSelected ? null : asset.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${isSelected ? '#c9a84c' : 'rgba(201,168,76,0.12)'}`,
                    marginBottom: '0.6rem',
                    background: isSelected ? 'rgba(201,168,76,0.08)' : '#1e2245',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ fontSize: '0.88rem', fontWeight: '500', color: '#f8f6f1', marginBottom: '0.2rem' }}>
                    {asset.name}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: '#9a9db5' }}>
                    {asset.location || 'No location'}
                    {asset.category ? ` · ${asset.category}` : ''}
                  </p>
                  {woCount > 0 && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.35rem',
                      fontSize: '0.72rem',
                      color: '#c9a84c',
                      border: '1px solid rgba(201,168,76,0.3)',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {woCount} open {woCount === 1 ? 'WO' : 'WOs'}
                    </span>
                  )}
                </div>
              )
            })
          )}

          {/* PRO UPGRADE LOCK */}
          {!organization?.is_upgraded && (
            <div style={{
              border: '1px dashed rgba(201,168,76,0.2)',
              borderRadius: '8px',
              padding: '1rem',
              textAlign: 'center',
              marginTop: '1rem'
            }}>
              <p style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>🔒</p>
              <p style={{ fontSize: '0.8rem', color: '#9a9db5', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                Full asset management is a Pro feature
              </p>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0 }}>

          {/* PAYMENT BANNER */}
          {!organization?.stripe_subscription_id && (
            <div style={{
              background: 'rgba(232,201,122,0.08)',
              border: '1px solid rgba(232,201,122,0.4)',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <p style={{ color: '#e8c97a', fontSize: '0.88rem', lineHeight: '1.6' }}>
                ⚠ Your payment setup is incomplete. Add a payment method to keep access after your trial ends.
              </p>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap'
                }}
              >
                Complete Setup
              </button>
            </div>
          )}

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
              Manager Dashboard
            </p>
            <h1 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '2rem',
              fontWeight: '600',
              color: '#f8f6f1'
            }}>
              Open Work Orders
            </h1>
          </div>

          {/* STAT CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginBottom: '2rem'
          }} className="stat-grid-inner">
            {[
              { label: 'Total Open', value: counts.total, color: '#c9a84c' },
              { label: 'Critical', value: counts.critical, color: '#e06c75' },
              { label: 'High', value: counts.high, color: '#e8c97a' },
              { label: 'Standard', value: counts.standard, color: '#9a9db5' },
              { label: 'Routine', value: counts.routine, color: '#6a6d85' }
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.8rem', fontWeight: '700', color: stat.color, marginBottom: '0.2rem' }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#9a9db5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {stat.label}
                </p>
              </div>
            ))}
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
              {['all', 'critical', 'high', 'standard', 'routine'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '20px',
                    border: `1px solid ${filter === f ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`,
                    background: filter === f ? 'rgba(201,168,76,0.08)' : 'none',
                    color: filter === f ? '#c9a84c' : '#9a9db5',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                    textTransform: 'capitalize',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
              {selectedAsset && (
                <button
                  onClick={() => setSelectedAsset(null)}
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(108,182,224,0.4)',
                    background: 'rgba(108,182,224,0.08)',
                    color: '#6cb6e0',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {getAssetName(selectedAsset)} ✕
                </button>
              )}
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
            <p style={{ color: '#9a9db5' }}>Loading work orders...</p>
          ) : displayedOrders.length === 0 ? (
            <div style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              color: '#9a9db5'
            }}>
              No open work orders{filter !== 'all' ? ` with ${filter} priority` : ''}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {displayedOrders.map(wo => (
                <div
                  key={wo.id}
                  onClick={() => navigate(`/work-order/${wo.id}`)}
                  style={{
                    background: '#1e2245',
                    border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
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
                    gap: '0.6rem',
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
                  </div>
                  <h3 style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.05rem',
                    fontWeight: '600',
                    color: '#f8f6f1',
                    marginBottom: '0.35rem'
                  }}>
                    {wo.title}
                  </h3>
                  {wo.description && (
                    <p style={{
                      color: '#9a9db5',
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      marginBottom: '0.65rem'
                    }}>
                      {wo.description.length > 120
                        ? wo.description.slice(0, 120) + '...'
                        : wo.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                      <span style={{ color: '#c9a84c' }}>Asset:</span> {getAssetName(wo.asset_id)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                      <span style={{ color: '#c9a84c' }}>Assigned:</span> {getTechName(wo.assigned_to)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#9a9db5' }}>
                      <span style={{ color: '#c9a84c' }}>Created:</span> {new Date(wo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
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