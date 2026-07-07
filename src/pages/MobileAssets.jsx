import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileBottomNav from '../components/MobileBottomNav'
import DowntimeWidget from '../components/DowntimeWidget'
import WorkOrderCard from '../components/WorkOrderCard'
import useUnreadMessages from '../hooks/useUnreadMessages'

export default function MobileAssets({ profile }) {
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [organization, setOrganization] = useState(null)
  const [pmScheduleCount, setPmScheduleCount] = useState(0)
  const [openWoCount, setOpenWoCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAssetList, setShowAssetList] = useState(false)
  const { unreadIds, hasMessagesIds } = useUnreadMessages(profile?.id)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [assetRes, woRes, profRes, orgRes] = await Promise.all([
      supabase.from('assets').select('*').order('name'),
      supabase
        .from('work_orders')
        .select('id, title, description, priority, status, compliance_category, asset_id, assigned_to, created_at, closed_at, due_date')
        .not('asset_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('id, full_name'),
      supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    ])
    setAssets(assetRes.data || [])
    setWorkOrders(woRes.data || [])
    setProfiles(profRes.data || [])
    setOrganization(orgRes.data || null)

    if (orgRes.data?.is_upgraded) {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { count: pmCount } = await supabase
        .from('pm_schedules')
        .select('*', { count: 'exact', head: true })
        .lte('next_due_date', weekFromNow.toISOString())
        .gte('next_due_date', now.toISOString())
      setPmScheduleCount(pmCount || 0)

      const openCount = (woRes.data || []).filter(wo => wo.status !== 'closed').length
      setOpenWoCount(openCount)
    }

    setLoading(false)
  }

  const isPro = organization?.is_upgraded === true

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets
    const q = searchQuery.toLowerCase()
    return assets.filter(a =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.function && a.function.toLowerCase().includes(q))
    )
  }, [searchQuery, assets])

  function getAssetName(id) {
    const a = assets.find(x => x.id === id)
    return a?.name || 'Unknown asset'
  }
  function getTechName(id) {
    const p = profiles.find(x => x.id === id)
    return p?.full_name || 'Unassigned'
  }

  const topBar = (
    <nav style={{
      background: 'rgba(26,26,46,0.95)',
      borderBottom: '1px solid rgba(201,168,76,0.18)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span style={{
        fontFamily: 'Georgia, serif',
        color: '#c9a84c',
        fontSize: '1.1rem',
        fontWeight: 600
      }}>
        The Toolsmith CMMS
      </span>
    </nav>
  )

  // LITE PAYWALL
  if (!loading && !isPro) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        fontFamily: 'Inter, sans-serif',
        color: '#f8f6f1',
        paddingBottom: '90px'
      }}>
        {topBar}
        <div style={{ padding: '1.25rem 1rem' }}>
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '2rem 1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', fontSize: '1.4rem'
            }}>🔒</div>
            <h2 style={{ color: '#f8f6f1', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Unlock Asset Management
            </h2>
            <p style={{ color: '#9a9db5', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Track assets, attach work orders, and manage custom fields. Available on the Pro plan.
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.85rem',
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
        </div>
        <MobileBottomNav profile={profile} />
      </div>
    )
  }

  // PRO USER LAYOUT — Variant B (stacked vertically)
  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      paddingBottom: '90px'
    }}>
      {topBar}

      <div style={{ padding: '1.25rem 1rem' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            fontWeight: '500',
            marginBottom: '0.3rem'
          }}>
            Asset Management
          </p>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1.3rem',
            fontWeight: '400',
            color: '#f8f6f1'
          }}>
            Assets
          </h1>
        </div>

        {/* SEARCH */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
            if (e.target.value.trim()) setShowAssetList(true)
          }}
          placeholder="Search assets..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem',
            color: '#f8f6f1',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
            marginBottom: '0.85rem'
          }}
        />

        {/* ADD ASSET + BROWSE BUTTONS */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setShowAssetList(!showAssetList)}
            style={{
              flex: 1,
              background: 'none',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#9a9db5',
              borderRadius: '8px',
              padding: '0.7rem',
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {showAssetList ? 'Hide list' : `Browse (${assets.length})`}
          </button>
          <button
            onClick={() => navigate('/m/assets/new')}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              padding: '0.7rem',
              fontSize: '0.78rem',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            + Add Asset
          </button>
        </div>

        {/* ASSET LIST (togglable) */}
        {showAssetList && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {loading ? (
              <p style={{ color: '#9a9db5', textAlign: 'center', padding: '1rem' }}>Loading...</p>
            ) : filteredAssets.length === 0 ? (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                color: '#9a9db5',
                fontSize: '0.85rem'
              }}>
                {searchQuery ? `No assets match "${searchQuery}"` : 'No assets yet.'}
              </div>
            ) : (
              filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => navigate(`/m/assets/${asset.id}`)}
                  style={{
                    background: '#1e2245',
                    border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  {asset.photo_url ? (
                    <img
                      src={asset.photo_url}
                      alt={asset.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid rgba(201,168,76,0.18)',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: 'rgba(201,168,76,0.06)',
                      border: '1px solid rgba(201,168,76,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}>🔧</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      color: '#f8f6f1',
                      marginBottom: '0.15rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {asset.name}
                    </h3>
                    <p style={{
                      fontSize: '0.72rem',
                      color: '#9a9db5',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {asset.location || 'No location'}{asset.category ? ` · ${asset.category}` : ''}
                    </p>
                  </div>
                  <span style={{ color: '#c9a84c', fontSize: '1.1rem', flexShrink: 0 }}>›</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* DOWNTIME NOW */}
        <div style={{ marginBottom: '1rem' }}>
          <DowntimeWidget
            organizationId={profile.organization_id}
            isPro={true}
          />
        </div>

        {/* AT A GLANCE (3-column strip) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.4rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            background: 'rgba(22,33,62,0.5)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '0.7rem 0.4rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8f6f1', margin: '0 0 0.15rem' }}>
              {assets.length}
            </p>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
              Assets
            </p>
          </div>
          <div style={{
            background: 'rgba(22,33,62,0.5)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '0.7rem 0.4rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#c9a84c', margin: '0 0 0.15rem' }}>
              {openWoCount}
            </p>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
              Open WOs
            </p>
          </div>
          <div style={{
            background: 'rgba(22,33,62,0.5)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '0.7rem 0.4rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.15rem', fontWeight: 700, color: pmScheduleCount > 0 ? '#e8c97a' : '#f8f6f1', margin: '0 0 0.15rem' }}>
              {pmScheduleCount}
            </p>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a9db5', margin: 0 }}>
              PM Due
            </p>
          </div>
        </div>

        {/* WORK ORDER FEED */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.6rem'
        }}>
          <p style={{
            fontSize: '0.78rem',
            color: '#c9a84c',
            margin: 0,
            fontWeight: 500
          }}>
            Recent work on your equipment
          </p>
          <span style={{ fontSize: '0.7rem', color: '#9a9db5' }}>
            {workOrders.length === 0 ? '' : `${workOrders.length}`}
          </span>
        </div>

        {workOrders.length === 0 ? (
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '1.75rem 1rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#9a9db5', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              No work orders on assets yet.
            </p>
            <p style={{ color: '#6a6d85', fontSize: '0.75rem', margin: 0 }}>
              Work orders linked to your equipment will show here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {workOrders.map(wo => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                hasMessages={hasMessagesIds.has(wo.id)}
                hasUnread={unreadIds.has(wo.id)}
                assetName={getAssetName(wo.asset_id)}
                techName={getTechName(wo.assigned_to)}
                onClick={() => navigate(`/work-order/${wo.id}`)}
                compact
              />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav profile={profile} />
    </div>
  )
}
