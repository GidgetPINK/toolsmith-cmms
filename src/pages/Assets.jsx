import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import DowntimeWidget from '../components/DowntimeWidget'
import WorkOrderCard from '../components/WorkOrderCard'
import useUnreadMessages from '../hooks/useUnreadMessages'

export default function Assets({ profile }) {
  const [organization, setOrganization] = useState(null)
  const [assets, setAssets] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [pmScheduleCount, setPmScheduleCount] = useState(0)
  const [openWoCount, setOpenWoCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAssetList, setShowAssetList] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { unreadIds, hasMessagesIds } = useUnreadMessages(profile?.id)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [orgRes, assetRes, woRes, profRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single(),
      supabase
        .from('assets')
        .select('*')
        .order('name'),
      supabase
        .from('work_orders')
        .select('id, title, description, priority, status, compliance_category, asset_id, assigned_to, created_at, closed_at, due_date')
        .not('asset_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('profiles')
        .select('id, full_name')
    ])
    setOrganization(orgRes.data || null)
    setAssets(assetRes.data || [])
    setWorkOrders(woRes.data || [])
    setProfiles(profRes.data || [])

    // Count PMs due in next 7 days
    if (orgRes.data?.is_upgraded) {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { count: pmCount } = await supabase
        .from('pm_schedules')
        .select('*', { count: 'exact', head: true })
        .lte('next_due_date', weekFromNow.toISOString())
        .gte('next_due_date', now.toISOString())
      setPmScheduleCount(pmCount || 0)

      // Open work orders on assets
      const openCount = (woRes.data || []).filter(wo => wo.status !== 'closed').length
      setOpenWoCount(openCount)
    }

    setLoading(false)
  }

  async function handleAddAsset(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase
      .from('assets')
      .insert({
        name,
        location,
        category,
        organization_id: profile.organization_id
      })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setName('')
    setLocation('')
    setCategory('')
    setShowAddForm(false)
    setSubmitting(false)
    fetchAll()
  }

  async function handleDeleteAsset(id) {
    if (!confirm('Delete this asset? Work orders will be unlinked from it.')) return
    await supabase.from('assets').delete().eq('id', id)
    fetchAll()
  }

  // Helpers for looking up display data
  function getAssetName(id) {
    const a = assets.find(x => x.id === id)
    return a?.name || 'Unknown asset'
  }
  function getTechName(id) {
    const p = profiles.find(x => x.id === id)
    return p?.full_name || 'Unassigned'
  }

  // Filter assets by search
  const filteredAssets = searchQuery.trim()
    ? assets.filter(a => {
        const q = searchQuery.trim().toLowerCase()
        return (
          a.name?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q)
        )
      })
    : assets

  const inputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '6px',
    color: '#f8f6f1',
    fontSize: '0.9rem',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  }
  const labelStyle = {
    display: 'block',
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#9a9db5',
    marginBottom: '0.4rem',
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif'
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1'
    }}>

      <Sidebar profile={profile} />

      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
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
            Asset Management
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            Assets
          </h1>
        </div>

        {loading ? (
          <p style={{ color: '#9a9db5' }}>Loading...</p>
        ) : !organization?.is_upgraded ? (

          /* LITE UPGRADE PROMPT (unchanged) */
          <div style={{ maxWidth: '640px' }}>
            <div style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(201,168,76,0.18)',
                position: 'relative'
              }}>
                <p style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#c9a84c',
                  marginBottom: '1rem',
                  fontWeight: '500'
                }}>
                  Preview
                </p>
                <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
                  {[
                    { name: 'Air Compressor Unit 1', location: 'Building A', category: 'Mechanical' },
                    { name: 'HVAC Rooftop Unit 2', location: 'Building B', category: 'HVAC' },
                    { name: 'Conveyor Belt Line 3', location: 'Warehouse', category: 'Electrical' }
                  ].map((a, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.8rem 0',
                      borderBottom: i < 2 ? '1px solid rgba(201,168,76,0.08)' : 'none'
                    }}>
                      <div>
                        <p style={{ fontWeight: '500', color: '#f8f6f1', marginBottom: '0.15rem' }}>{a.name}</p>
                        <p style={{ fontSize: '0.85rem', color: '#9a9db5' }}>{a.location}</p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#c9a84c',
                        border: '1px solid rgba(201,168,76,0.3)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '20px',
                        alignSelf: 'center'
                      }}>
                        {a.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(201,168,76,0.03)'
              }}>
                <h3 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.35rem',
                  color: '#c9a84c',
                  marginBottom: '0.75rem',
                  fontWeight: '600'
                }}>
                  Track your equipment
                </h3>
                <p style={{
                  color: '#f8f6f1',
                  fontSize: '0.95rem',
                  lineHeight: '1.7',
                  marginBottom: '1.5rem',
                  maxWidth: '440px',
                  margin: '0 auto 1.5rem'
                }}>
                  Asset tracking, preventive maintenance schedules, parts inventory, and downtime logging are Pro features. Upgrade to unlock the full toolkit.
                </p>
                <button
                  onClick={() => navigate('/upgrade')}
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                    border: 'none',
                    color: '#1a1a2e',
                    padding: '0.8rem 2rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  Upgrade to Pro — $49/month
                </button>
                <p style={{
                  color: '#9a9db5',
                  fontSize: '0.78rem',
                  marginTop: '0.75rem'
                }}>
                  Cancel any time. No contracts.
                </p>
              </div>
            </div>
          </div>

        ) : (

          /* PRO USER LAYOUT — Variant A */
          <div>

            {/* TOP BAR: Search + New Asset */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <input
                type="text"
                placeholder="Search assets by name, location, or category"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim()) setShowAssetList(true)
                }}
                style={{
                  flex: '1 1 300px',
                  padding: '0.65rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '8px',
                  color: '#f8f6f1',
                  fontSize: '0.9rem',
                  fontFamily: 'Inter, sans-serif'
                }}
              />
              <button
                onClick={() => setShowAssetList(!showAssetList)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#9a9db5',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {showAssetList ? 'Hide list' : `Browse all ${assets.length}`}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  border: 'none',
                  color: '#1a1a2e',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {showAddForm ? 'Cancel' : '+ New Asset'}
              </button>
            </div>

            {/* ADD ASSET FORM (unchanged behavior, inline) */}
            {showAddForm && (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '1.75rem',
                marginBottom: '1.75rem'
              }}>
                <h3 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem'
                }}>
                  New Asset
                </h3>
                <form onSubmit={handleAddAsset}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <label style={labelStyle}>Asset Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Air Compressor Unit 1"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Building A"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Select category</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Electrical">Electrical</option>
                        <option value="HVAC">HVAC</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Vehicle">Vehicle</option>
                        <option value="Safety">Safety</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  {error && (
                    <p style={{
                      color: '#e06c75',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'rgba(224,108,117,0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(224,108,117,0.2)'
                    }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                      border: 'none',
                      color: '#1a1a2e',
                      padding: '0.65rem 1.75rem',
                      borderRadius: '6px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      opacity: submitting ? 0.6 : 1,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {submitting ? 'Adding...' : 'Add Asset'}
                  </button>
                </form>
              </div>
            )}

            {/* BROWSE ALL ASSETS LIST (togglable) */}
            {showAssetList && (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1.75rem'
              }}>
                {filteredAssets.length === 0 ? (
                  <p style={{ padding: '1.5rem', color: '#9a9db5', textAlign: 'center' }}>
                    {searchQuery ? 'No assets match that search.' : 'No assets yet. Add your first one above.'}
                  </p>
                ) : (
                  filteredAssets.map((asset, index) => (
                    <div
                      key={asset.id}
                      onClick={() => navigate(`/asset/${asset.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.1rem 1.5rem',
                        borderBottom: index < filteredAssets.length - 1
                          ? '1px solid rgba(201,168,76,0.08)'
                          : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <p style={{
                          fontWeight: '500',
                          fontSize: '0.95rem',
                          color: '#f8f6f1',
                          marginBottom: '0.2rem'
                        }}>
                          {asset.name}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#9a9db5' }}>
                          {asset.location || 'No location set'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {asset.category && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#c9a84c',
                            border: '1px solid rgba(201,168,76,0.3)',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '20px'
                          }}>
                            {asset.category}
                          </span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteAsset(asset.id) }}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(224,108,117,0.3)',
                            color: '#e06c75',
                            borderRadius: '6px',
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* STACKED LAYOUT */}
            <div style={{ marginBottom: '1.25rem' }}>
              <DowntimeWidget
                organizationId={profile.organization_id}
                isPro={true}
              />
            </div>

            {/* AT A GLANCE STRIP */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                background: 'rgba(22,33,62,0.5)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8f6f1', margin: '0 0 0.25rem' }}>
                  {assets.length}
                </p>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
                  Assets
                </p>
              </div>
              <div style={{
                background: 'rgba(22,33,62,0.5)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c9a84c', margin: '0 0 0.25rem' }}>
                  {openWoCount}
                </p>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
                  Open Work Orders
                </p>
              </div>
              <div style={{
                background: 'rgba(22,33,62,0.5)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: pmScheduleCount > 0 ? '#e8c97a' : '#f8f6f1', margin: '0 0 0.25rem' }}>
                  {pmScheduleCount}
                </p>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
                  PMs Due This Week
                </p>
              </div>
            </div>

            {/* WORK ORDER FEED */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem'
              }}>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#c9a84c',
                  margin: 0,
                  fontWeight: 500,
                  letterSpacing: '0.02em'
                }}>
                  Recent work on your equipment
                </p>
                <span style={{ fontSize: '0.78rem', color: '#9a9db5' }}>
                  {workOrders.length === 0
                    ? 'No asset work orders yet'
                    : `Showing ${workOrders.length}`}
                </span>
              </div>

              {workOrders.length === 0 ? (
                <div style={{
                  background: '#1e2245',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#9a9db5', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    No work orders on assets yet.
                  </p>
                  <p style={{ color: '#6a6d85', fontSize: '0.82rem', margin: 0 }}>
                    When a work order is created and linked to an asset, it will show up here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {workOrders.map(wo => (
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
        )}
        </div>
      </div>
    </div>
  )
}
