import { useEffect, useState, useMemo, useRef } from 'react'
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

const CATEGORIES = ['Mechanical', 'Electrical', 'HVAC', 'Plumbing', 'Vehicle', 'Safety', 'Other']
const CRITICALITY_LEVELS = ['Low', 'Standard', 'High', 'Critical']

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

const flyoutInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  padding: '0.7rem 0.85rem',
  color: '#f8f6f1',
  fontSize: '0.9rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box'
}

const flyoutLabelStyle = {
  display: 'block',
  color: '#9a9db5',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
  fontWeight: '500'
}

export default function Dashboard({ profile }) {
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [assets, setAssets] = useState([])
  const [organization, setOrganization] = useState(null)
  const [customFieldDefs, setCustomFieldDefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutMode, setFlyoutMode] = useState('create')
  const [flyoutAsset, setFlyoutAsset] = useState(null)
  const [flyoutTab, setFlyoutTab] = useState('details')

  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [woRes, profRes, assetRes, orgRes, cfdRes] = await Promise.all([
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
        .single(),
      supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('display_order', { ascending: true })
    ])
    setWorkOrders(woRes.data || [])
    setProfiles(profRes.data || [])
    setAssets(assetRes.data || [])
    setOrganization(orgRes.data || null)
    setCustomFieldDefs(cfdRes.data || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  function openAddAsset() {
    setFlyoutMode('create')
    setFlyoutAsset(null)
    setFlyoutTab('details')
    setFlyoutOpen(true)
  }

  function openEditAsset(asset) {
    setFlyoutMode('edit')
    setFlyoutAsset(asset)
    setFlyoutTab('details')
    setFlyoutOpen(true)
    setSearchQuery('')
    setSearchFocused(false)
  }

  function closeFlyout() {
    setFlyoutOpen(false)
    setFlyoutAsset(null)
  }

  function getTechName(id) {
    const tech = profiles.find(p => p.id === id)
    return tech ? tech.full_name : 'Unassigned'
  }

  function getAssetName(id) {
    const asset = assets.find(a => a.id === id)
    return asset ? asset.name : 'No asset'
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isPro = organization?.is_upgraded === true

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return assets.filter(a =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.function && a.function.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [searchQuery, assets])

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
      color: '#f8f6f1',
      overflowX: 'hidden'
    }}>

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
          <div className="desktop-nav" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={() => navigate('/settings')} style={navBtnStyle}>Settings</button>
            <button onClick={handleSignOut} style={navBtnStyle}>Sign Out</button>
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
                display: 'block', width: '20px', height: '2px',
                background: '#9a9db5', borderRadius: '1px'
              }} />
            ))}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="mobile-nav-dropdown" style={{
            display: 'none', flexDirection: 'column', gap: '6px',
            padding: '0.75rem 5%', borderTop: '1px solid rgba(201,168,76,0.12)'
          }}>
            <button onClick={() => { navigate('/settings'); setMobileNavOpen(false) }} style={mobileNavBtnStyle}>Settings</button>
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
          .main-content { padding: 1.5rem 1rem !important; }
          .stat-grid-inner { grid-template-columns: repeat(2, 1fr) !important; }
          .asset-flyout { width: 100% !important; max-width: 100vw !important; border-left: none !important; box-sizing: border-box !important; }
          .asset-flyout-grid { grid-template-columns: 1fr !important; }
          .asset-flyout-body { padding: 1rem !important; }
          .asset-flyout-header { padding: 1rem !important; }
          .asset-flyout-tabs { padding: 0 1rem !important; }
        }
      `}</style>

      <div style={{ display: 'flex' }} className="app-body">

        {/* SIDEBAR */}
        <div
          className="sidebar"
          style={{
            width: '260px',
            flexShrink: 0,
            background: '#16213e',
            borderRight: '1px solid rgba(201,168,76,0.15)',
            padding: '1.5rem 1rem',
            minHeight: 'calc(100vh - 64px)',
            boxSizing: 'border-box'
          }}
        >
          <p style={{
            fontSize: '0.7rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#c9a84c',
            marginBottom: '1rem', fontWeight: '500'
          }}>
            Assets
          </p>

          {!isPro ? (
            <div style={{
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '10px', padding: '1.25rem 1rem', textAlign: 'center'
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem', fontSize: '1.2rem'
              }}>🔒</div>
              <p style={{ fontSize: '0.88rem', fontWeight: '500', color: '#f8f6f1', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                Unlock Asset Management
              </p>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e', border: 'none', borderRadius: '6px',
                  padding: '0.6rem', fontSize: '0.78rem', fontWeight: '700',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}
              >
                Upgrade to Pro — $49/mo
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={openAddAsset}
                style={{
                  width: '100%', background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e', border: 'none', borderRadius: '8px',
                  padding: '0.7rem', fontSize: '0.82rem', fontWeight: '700',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '1rem'
                }}
              >
                + Add Asset
              </button>

              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Search assets..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.18)', borderRadius: '8px',
                    padding: '0.55rem 0.85rem', color: '#f8f6f1',
                    fontSize: '0.82rem', outline: 'none',
                    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box'
                  }}
                />
                {searchFocused && searchQuery.trim() && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#1e2245', border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: '8px', marginTop: '0.3rem', maxHeight: '280px',
                    overflowY: 'auto', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}>
                    {searchResults.length === 0 ? (
                      <p style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', color: '#9a9db5' }}>
                        No matches for "{searchQuery}"
                      </p>
                    ) : (
                      searchResults.map(asset => (
                        <div
                          key={asset.id}
                          onClick={() => openEditAsset(asset)}
                          style={{ padding: '0.65rem 0.85rem', cursor: 'pointer', borderBottom: '1px solid rgba(201,168,76,0.08)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <p style={{ fontSize: '0.85rem', color: '#f8f6f1', fontWeight: '500', marginBottom: '0.15rem' }}>
                            {asset.name}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: '#9a9db5' }}>
                            {asset.location || 'No location'}{asset.category ? ` · ${asset.category}` : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <p style={{
                fontSize: '0.68rem', letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#c9a84c',
                marginBottom: '0.65rem', fontWeight: '500'
              }}>
                Maintenance Coming Up · 7 Days
              </p>
              <div style={{
                background: 'rgba(201,168,76,0.04)',
                border: '1px dashed rgba(201,168,76,0.2)',
                borderRadius: '8px', padding: '1rem', textAlign: 'center'
              }}>
                <p style={{ fontSize: '1rem', marginBottom: '0.5rem', opacity: 0.6 }}>🗓️</p>
                <p style={{ fontSize: '0.78rem', color: '#9a9db5', lineHeight: '1.55' }}>
                  PM scheduling launching soon. This list will populate once you create your first PM task.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div
          className="main-content"
          style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0, boxSizing: 'border-box' }}
        >
          {!organization?.stripe_subscription_id && (
            <div style={{
              background: 'rgba(232,201,122,0.08)', border: '1px solid rgba(232,201,122,0.4)',
              borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem'
            }}>
              <p style={{ color: '#e8c97a', fontSize: '0.88rem', lineHeight: '1.6' }}>
                ⚠ Your payment setup is incomplete. Add a payment method to keep access after your trial ends.
              </p>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e',
                  border: 'none', borderRadius: '6px', padding: '0.45rem 1rem',
                  fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.06em',
                  textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap'
                }}
              >
                Complete Setup
              </button>
            </div>
          )}

          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: '500' }}>
                Manager Dashboard
              </p>
              <span style={{
                padding: '0.15rem 0.65rem', borderRadius: '20px',
                fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
                background: isPro ? 'rgba(201,168,76,0.15)' : 'rgba(180,180,180,0.15)',
                border: isPro ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(180,180,180,0.4)',
                color: isPro ? '#c9a84c' : '#b0b0b0'
              }}>
                {isPro ? 'Pro' : 'Lite'}
              </span>
            </div>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.4rem', fontWeight: '400', color: '#f8f6f1', letterSpacing: '0.01em' }}>
              Hi, {firstName}!
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }} className="stat-grid-inner">
            {[
              { label: 'Total Open', value: counts.total, color: '#c9a84c', filterKey: 'all' },
              { label: 'Critical', value: counts.critical, color: '#e06c75', filterKey: 'critical' },
              { label: 'High', value: counts.high, color: '#e8c97a', filterKey: 'high' },
              { label: 'Standard', value: counts.standard, color: '#9a9db5', filterKey: 'standard' },
              { label: 'Routine', value: counts.routine, color: '#6a6d85', filterKey: 'routine' }
            ].map(stat => (
              <div
                key={stat.label}
                onClick={() => setFilter(stat.filterKey)}
                style={{
                  background: filter === stat.filterKey ? 'rgba(201,168,76,0.08)' : '#1e2245',
                  border: `1px solid ${filter === stat.filterKey ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`,
                  borderRadius: '12px', padding: '1rem', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <p style={{ fontSize: '1.8rem', fontWeight: '700', color: stat.color, marginBottom: '0.2rem' }}>{stat.value}</p>
                <p style={{ fontSize: '0.7rem', color: '#9a9db5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {['all', 'critical', 'high', 'standard', 'routine'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.35rem 0.9rem', borderRadius: '20px',
                    border: `1px solid ${filter === f ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`,
                    background: filter === f ? 'rgba(201,168,76,0.08)' : 'none',
                    color: filter === f ? '#c9a84c' : '#9a9db5',
                    fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.05em',
                    textTransform: 'capitalize', fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
              {selectedAsset && (
                <button
                  onClick={() => setSelectedAsset(null)}
                  style={{
                    padding: '0.35rem 0.9rem', borderRadius: '20px',
                    border: '1px solid rgba(108,182,224,0.4)', background: 'rgba(108,182,224,0.08)',
                    color: '#6cb6e0', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {getAssetName(selectedAsset)} ✕
                </button>
              )}
            </div>
            <button
              onClick={() => navigate('/work-order/new')}
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', border: 'none',
                color: '#1a1a2e', padding: '0.5rem 1.25rem', borderRadius: '6px',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap'
              }}
            >
              + New Work Order
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#9a9db5' }}>Loading work orders...</p>
          ) : displayedOrders.length === 0 ? (
            <div style={{
              background: '#1e2245', border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#9a9db5'
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
                    background: '#1e2245', border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: '12px', padding: '1.25rem 1.5rem',
                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.2rem 0.65rem', borderRadius: '20px',
                      fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: PRIORITY_COLOR[wo.priority] || '#9a9db5',
                      background: PRIORITY_BG[wo.priority] || 'rgba(154,157,181,0.12)',
                      border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}`
                    }}>
                      {wo.priority}
                    </span>
                    <span style={{
                      padding: '0.2rem 0.65rem', borderRadius: '20px',
                      fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'capitalize',
                      color: STATUS_COLOR[wo.status] || '#9a9db5',
                      border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}`,
                      background: 'transparent'
                    }}>
                      {wo.status}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', fontWeight: '600', color: '#f8f6f1', marginBottom: '0.35rem' }}>
                    {wo.title}
                  </h3>
                  {wo.description && (
                    <p style={{ color: '#9a9db5', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '0.65rem' }}>
                      {wo.description.length > 120 ? wo.description.slice(0, 120) + '...' : wo.description}
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

      {flyoutOpen && (
        <AssetFlyout
          mode={flyoutMode}
          asset={flyoutAsset}
          tab={flyoutTab}
          setTab={setFlyoutTab}
          workOrders={workOrders}
          organizationId={profile.organization_id}
          customFieldDefs={customFieldDefs}
          onClose={closeFlyout}
          onSaved={() => { fetchAll(); closeFlyout() }}
          onDeleted={() => { fetchAll(); closeFlyout() }}
          getTechName={getTechName}
        />
      )}
    </div>
  )
}

// ── ASSET FLYOUT ──
function AssetFlyout({ mode, asset, tab, setTab, workOrders, organizationId, customFieldDefs, onClose, onSaved, onDeleted, getTechName }) {
  const navigate = useNavigate()

  const [name, setName] = useState(asset?.name || '')
  const [location, setLocation] = useState(asset?.location || '')
  const [category, setCategory] = useState(asset?.category || '')
  const [criticality, setCriticality] = useState(asset?.criticality || 'Standard')
  const [functionText, setFunctionText] = useState(asset?.function || '')
  const [serialNumber, setSerialNumber] = useState(asset?.serial_number || '')
  const [manufacturer, setManufacturer] = useState(asset?.manufacturer || '')
  const [model, setModel] = useState(asset?.model || '')
  const [installDate, setInstallDate] = useState(asset?.install_date || '')
  const [customFieldValues, setCustomFieldValues] = useState(asset?.custom_fields || {})

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(asset?.photo_url || null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function updateCustomFieldValue(defId, value) {
    setCustomFieldValues(prev => ({ ...prev, [defId]: value }))
  }

  function validateRequiredCustomFields() {
    for (const def of customFieldDefs) {
      if (!def.is_required) continue
      const value = customFieldValues[def.id]
      if (def.field_type === 'checkbox') {
        if (value === undefined || value === null) {
          return `${def.field_name} is required`
        }
      } else {
        if (value === undefined || value === null || value === '') {
          return `${def.field_name} is required`
        }
      }
    }
    return null
  }

  function renderCustomFieldInput(def) {
    const value = customFieldValues[def.id]

    if (def.field_type === 'text') {
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={flyoutInputStyle}
        />
      )
    }

    if (def.field_type === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={flyoutInputStyle}
        />
      )
    }

    if (def.field_type === 'date') {
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={flyoutInputStyle}
        />
      )
    }

    if (def.field_type === 'dropdown') {
      return (
        <select
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={{ ...flyoutInputStyle, cursor: 'pointer' }}
        >
          <option value="">Select</option>
          {(def.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (def.field_type === 'checkbox') {
      return (
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          color: '#f8f6f1', fontSize: '0.9rem', cursor: 'pointer',
          padding: '0.5rem 0'
        }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => updateCustomFieldValue(def.id, e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#c9a84c', cursor: 'pointer' }}
          />
          Yes
        </label>
      )
    }

    return null
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadPhoto() {
    if (!photoFile) return asset?.photo_url || null
    setUploadingPhoto(true)
    const ext = photoFile.name.split('.').pop()
    const filename = `${organizationId}/${Date.now()}.${ext}`
    const { data, error: uploadError } = await supabase.storage
      .from('asset-photos')
      .upload(filename, photoFile, { contentType: photoFile.type, upsert: false })
    setUploadingPhoto(false)
    if (uploadError) { setError(`Photo upload failed: ${uploadError.message}`); return null }
    const { data: urlData } = supabase.storage.from('asset-photos').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    const validationError = validateRequiredCustomFields()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    const photoUrl = await uploadPhoto()
    if (error) { setSubmitting(false); return }
    const payload = {
      name, location, category, criticality,
      function: functionText, serial_number: serialNumber,
      manufacturer, model, install_date: installDate || null,
      organization_id: organizationId, photo_url: photoUrl,
      custom_fields: customFieldValues
    }
    let result
    if (mode === 'edit' && asset?.id) {
      result = await supabase.from('assets').update(payload).eq('id', asset.id)
    } else {
      result = await supabase.from('assets').insert(payload)
    }
    if (result.error) { setError(result.error.message); setSubmitting(false); return }
    setSubmitting(false)
    onSaved()
  }

  async function handleDelete() {
    if (!asset?.id) return
    if (!confirm(`Delete ${asset.name}? This cannot be undone.`)) return
    setDeleting(true)
    if (asset.photo_url) {
      const path = asset.photo_url.split('/asset-photos/')[1]
      if (path) await supabase.storage.from('asset-photos').remove([path])
    }
    const { error } = await supabase.from('assets').delete().eq('id', asset.id)
    if (error) { setError(error.message); setDeleting(false); return }
    setDeleting(false)
    onDeleted()
  }

  function handleCreateWorkOrder() {
    onClose()
    navigate(`/work-order/new?asset=${asset.id}`)
  }

  const assetWorkOrders = asset?.id ? workOrders.filter(wo => wo.asset_id === asset.id) : []
  const isSaving = submitting || uploadingPhoto

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}
    >
      <div
        className="asset-flyout"
        onClick={e => e.stopPropagation()}
        style={{
          width: '480px', maxWidth: '100vw', height: '100vh',
          background: '#1a1a2e', borderLeft: '1px solid rgba(201,168,76,0.25)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', boxSizing: 'border-box'
        }}
      >
        {/* HEADER */}
        <div
          className="asset-flyout-header"
          style={{
            padding: '1.5rem', borderBottom: '1px solid rgba(201,168,76,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <div>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '0.25rem', fontWeight: '500' }}>
              {mode === 'edit' ? 'Edit Asset' : 'New Asset'}
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: '600', color: '#f8f6f1' }}>
              {mode === 'edit' ? asset?.name : 'Add a new asset'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9a9db5', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        {mode === 'edit' && (
          <div className="asset-flyout-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.18)', padding: '0 1.5rem' }}>
            {[
              { id: 'details', label: 'Details' },
              { id: 'history', label: 'Work Order History' },
              { id: 'pm', label: 'PM Schedule' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: 'none', border: 'none',
                  color: tab === t.id ? '#c9a84c' : '#9a9db5',
                  padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: '500',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent',
                  marginBottom: '-1px', letterSpacing: '0.04em'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* BODY */}
        <div className="asset-flyout-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {(mode === 'create' || tab === 'details') && (
            <form onSubmit={handleSave}>

              {/* PHOTO */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={flyoutLabelStyle}>Asset Photo</label>
                {photoPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={photoPreview}
                      alt="Asset"
                      style={{
                        width: '100%', height: '180px', objectFit: 'cover',
                        borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)', display: 'block'
                      }}
                    />
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'rgba(26,26,46,0.85)', border: '1px solid rgba(201,168,76,0.3)',
                          color: '#c9a84c', borderRadius: '6px', padding: '0.3rem 0.65rem',
                          fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={removePhoto}
                        style={{
                          background: 'rgba(224,108,117,0.15)', border: '1px solid rgba(224,108,117,0.3)',
                          color: '#e06c75', borderRadius: '6px', padding: '0.3rem 0.65rem',
                          fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '8px',
                      padding: '1.75rem 1rem', textAlign: 'center', cursor: 'pointer',
                      background: 'rgba(201,168,76,0.03)', transition: 'border-color 0.2s, background 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)'
                      e.currentTarget.style.background = 'rgba(201,168,76,0.07)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
                      e.currentTarget.style.background = 'rgba(201,168,76,0.03)'
                    }}
                  >
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📷</p>
                    <p style={{ fontSize: '0.85rem', color: '#c9a84c', fontWeight: '500', marginBottom: '0.25rem' }}>
                      Click to upload a photo
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#9a9db5' }}>JPG, PNG, or WebP — max 5MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>

              {/* FIELDS */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={flyoutLabelStyle}>Asset Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Air Compressor Unit 1" style={flyoutInputStyle} />
              </div>

              <div className="asset-flyout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={flyoutLabelStyle}>Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Building A" style={flyoutInputStyle} />
                </div>
                <div>
                  <label style={flyoutLabelStyle}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={flyoutLabelStyle}>Criticality</label>
                <select value={criticality} onChange={e => setCriticality(e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
                  {CRITICALITY_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={flyoutLabelStyle}>Function</label>
                <textarea
                  value={functionText}
                  onChange={e => setFunctionText(e.target.value)}
                  placeholder="Supplies compressed air to the production line..."
                  rows={3}
                  style={{ ...flyoutInputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <div className="asset-flyout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={flyoutLabelStyle}>Manufacturer</label>
                  <input type="text" value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="Ingersoll Rand" style={flyoutInputStyle} />
                </div>
                <div>
                  <label style={flyoutLabelStyle}>Model</label>
                  <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="SSR-EP25" style={flyoutInputStyle} />
                </div>
              </div>

              <div className="asset-flyout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={flyoutLabelStyle}>Serial Number</label>
                  <input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="SN-12345" style={flyoutInputStyle} />
                </div>
                <div>
                  <label style={flyoutLabelStyle}>Install Date</label>
                  <input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} style={flyoutInputStyle} />
                </div>
              </div>

              {/* CUSTOM FIELDS SECTION */}
              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.5rem 0 1.25rem' }} />
                  <p style={{
                    fontSize: '0.7rem', letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: '#c9a84c',
                    marginBottom: '1rem', fontWeight: '500'
                  }}>
                    Custom Fields
                  </p>
                  {customFieldDefs.map(def => (
                    <div key={def.id} style={{ marginBottom: '1rem' }}>
                      <label style={flyoutLabelStyle}>
                        {def.field_name}{def.is_required && ' *'}
                      </label>
                      {renderCustomFieldInput(def)}
                    </div>
                  ))}
                  <div style={{ height: '0.25rem' }} />
                </>
              )}

              {error && (
                <p style={{
                  color: '#e06c75', fontSize: '0.85rem', marginBottom: '1rem',
                  padding: '0.65rem 0.85rem', background: 'rgba(224,108,117,0.1)',
                  borderRadius: '6px', border: '1px solid rgba(224,108,117,0.2)'
                }}>
                  {error}
                </p>
              )}

              {/* SAVE / DELETE BUTTONS */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: mode === 'edit' ? '0.75rem' : 0 }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                    color: '#1a1a2e', border: 'none', borderRadius: '8px',
                    padding: '0.85rem', fontSize: '0.88rem', fontWeight: '700',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1, fontFamily: 'Inter, sans-serif'
                  }}
                >
                  {uploadingPhoto ? 'Uploading photo...' : submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Asset'}
                </button>
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      background: 'none', border: '1px solid rgba(224,108,117,0.4)',
                      color: '#e06c75', borderRadius: '8px', padding: '0.85rem 1.25rem',
                      fontSize: '0.82rem', cursor: deleting ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif', opacity: deleting ? 0.6 : 1
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>

              {/* CREATE WORK ORDER BUTTON — edit mode only */}
              {mode === 'edit' && (
                <>
                  <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.25rem 0 0.75rem' }} />
                  <button
                    type="button"
                    onClick={handleCreateWorkOrder}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: '1px solid rgba(201,168,76,0.3)',
                      color: '#c9a84c',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.2s, background 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#c9a84c'
                      e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    + Create Work Order for This Asset
                  </button>
                </>
              )}
            </form>
          )}

          {/* WORK ORDER HISTORY TAB */}
          {mode === 'edit' && tab === 'history' && (
            <div>
              {assetWorkOrders.length === 0 ? (
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.2)',
                  borderRadius: '10px', padding: '2rem', textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.88rem', color: '#9a9db5', lineHeight: '1.6' }}>
                    No work orders for this asset yet.
                  </p>
                  <button
                    onClick={handleCreateWorkOrder}
                    style={{
                      marginTop: '1rem', background: 'none',
                      border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c',
                      borderRadius: '8px', padding: '0.65rem 1.25rem',
                      fontSize: '0.82rem', fontWeight: '500', letterSpacing: '0.05em',
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    + Create First Work Order
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {assetWorkOrders.map(wo => (
                    <div key={wo.id} style={{
                      background: '#1e2245', border: '1px solid rgba(201,168,76,0.18)',
                      borderRadius: '10px', padding: '1rem'
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <span style={{
                          padding: '0.15rem 0.55rem', borderRadius: '20px',
                          fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: PRIORITY_COLOR[wo.priority] || '#9a9db5',
                          border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}`
                        }}>
                          {wo.priority}
                        </span>
                        <span style={{
                          padding: '0.15rem 0.55rem', borderRadius: '20px',
                          fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'capitalize',
                          color: STATUS_COLOR[wo.status] || '#9a9db5',
                          border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}`
                        }}>
                          {wo.status}
                        </span>
                      </div>
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                        {wo.title}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#9a9db5' }}>
                        Assigned: {getTechName(wo.assigned_to)} · {new Date(wo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  <button
                    onClick={handleCreateWorkOrder}
                    style={{
                      background: 'none', border: '1px solid rgba(201,168,76,0.25)',
                      color: '#c9a84c', borderRadius: '8px', padding: '0.7rem',
                      fontSize: '0.82rem', fontWeight: '500', letterSpacing: '0.05em',
                      textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    + Create Work Order
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PM SCHEDULE TAB */}
          {mode === 'edit' && tab === 'pm' && (
            <div style={{
              background: 'rgba(201,168,76,0.04)', border: '1px dashed rgba(201,168,76,0.2)',
              borderRadius: '10px', padding: '2.5rem 1.5rem', textAlign: 'center'
            }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.5 }}>🗓️</p>
              <p style={{ fontSize: '0.95rem', color: '#f8f6f1', fontWeight: '500', marginBottom: '0.5rem' }}>
                PM Scheduling Coming Soon
              </p>
              <p style={{ fontSize: '0.82rem', color: '#9a9db5', lineHeight: '1.65' }}>
                Once PM scheduling launches, this tab will let you create recurring maintenance tasks for this asset.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}