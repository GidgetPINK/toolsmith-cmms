import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileBottomNav from '../components/MobileBottomNav'
import LowStockWidget from '../components/LowStockWidget'
import TrialBanner from '../components/TrialBanner'
import TeamInviteBanner from '../components/TeamInviteBanner'
import useUnreadMessages from '../hooks/useUnreadMessages'
import WorkOrderCard from '../components/WorkOrderCard'

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
  completed: '#7bc47f',
  closed: '#6a6d85'
}

export default function MobileWorkOrders({ profile }) {
  const { unreadIds, hasMessagesIds } = useUnreadMessages(profile?.id)
  const navigate = useNavigate()
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [assets, setAssets] = useState([])
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [woRes, profRes, assetRes, orgRes] = await Promise.all([
      supabase.from('work_orders').select('*').order('created_at', { ascending: true }),
      supabase.from('profiles').select('*'),
      supabase.from('assets').select('*'),
      supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
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

  function searchableDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return [
      d.toLocaleDateString('en-US'),
      d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      d.toISOString().split('T')[0]
    ].join(' ').toLowerCase()
  }



  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isPro = organization?.is_upgraded === true

  const q = searchQuery.trim().toLowerCase()

  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'closed' && wo.status !== 'completed')

  const STATUS_WORDS = ['open', 'in progress', 'completed', 'closed']
  const filtered = q
    ? workOrders.filter(wo => {
        const statusMatches = STATUS_WORDS.filter(w => w.startsWith(q))
        if (q.length >= 2 && statusMatches.length === 1) {
          return (wo.status || '').toLowerCase() === statusMatches[0]
        }
        const techName = wo.assigned_to ? getTechName(wo.assigned_to) : ''
        const assetName = wo.asset_id ? getAssetName(wo.asset_id) : ''
        return (wo.title || '').toLowerCase().includes(q) ||
               (wo.description || '').toLowerCase().includes(q) ||
               techName.toLowerCase().includes(q) ||
               assetName.toLowerCase().includes(q) ||
               (wo.apartment_number || '').toLowerCase().includes(q) ||
               searchableDate(wo.created_at).includes(q)
      })
    : (filter === 'all'
        ? activeWorkOrders
        : activeWorkOrders.filter(wo => wo.priority === filter))

  const counts = {
    critical: activeWorkOrders.filter(wo => wo.priority === 'critical').length,
    high: activeWorkOrders.filter(wo => wo.priority === 'high').length,
    standard: activeWorkOrders.filter(wo => wo.priority === 'standard').length,
    routine: activeWorkOrders.filter(wo => wo.priority === 'routine').length,
    total: activeWorkOrders.length
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      paddingBottom: '90px'
    }}>
      {/* TOP BAR */}
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
          fontWeight: '600'
        }}>
          The Toolsmith
        </span>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.25)',
            color: '#9a9db5',
            padding: '0.35rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Sign Out
        </button>
      </nav>

      <div style={{ padding: '1.25rem 1rem' }}>
        <TrialBanner
          organization={organization}
          profile={profile}
          onManage={() => navigate('/upgrade')}
        />
        <TeamInviteBanner
          profile={profile}
          profiles={profiles}
          isPro={isPro}
        />
        {/* GREETING */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <p style={{
              fontSize: '0.65rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#c9a84c',
              fontWeight: '500'
            }}>
              Manager Dashboard
            </p>
            <span style={{
              padding: '0.12rem 0.55rem',
              borderRadius: '20px',
              fontSize: '0.6rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              background: isPro ? 'rgba(201,168,76,0.15)' : 'rgba(180,180,180,0.15)',
              border: isPro ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(180,180,180,0.4)',
              color: isPro ? '#c9a84c' : '#b0b0b0'
            }}>
              {isPro ? 'Pro' : 'Lite'}
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1.3rem',
            fontWeight: '400',
            color: '#f8f6f1'
          }}>
            Hi, {firstName}!
          </h1>
        </div>

        {/* STAT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.6rem',
          marginBottom: '1.25rem'
        }}>
          {[
            { label: 'Total Open', value: counts.total, color: '#c9a84c', filterKey: 'all' },
            { label: 'Critical', value: counts.critical, color: '#e06c75', filterKey: 'critical' },
            { label: 'High', value: counts.high, color: '#e8c97a', filterKey: 'high' },
            { label: 'Standard', value: counts.standard, color: '#9a9db5', filterKey: 'standard' },
            { label: 'Routine', value: counts.routine, color: '#6a6d85', filterKey: 'routine' }
          ].map(stat => (
            <div
              key={stat.label}
              onClick={() => {
                setFilter(stat.filterKey)
                setTimeout(() => {
                  document.getElementById('mobile-work-orders-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }, 50)
              }}
              style={{
                background: filter === stat.filterKey ? 'rgba(201,168,76,0.08)' : '#1e2245',
                border: `1px solid ${filter === stat.filterKey ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`,
                borderRadius: '10px',
                padding: '0.9rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <p style={{ fontSize: '1.6rem', fontWeight: '700', color: stat.color, marginBottom: '0.15rem' }}>{stat.value}</p>
              <p style={{ fontSize: '0.62rem', color: '#9a9db5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {profile?.role === 'manager' && (
          <LowStockWidget
            organizationId={profile.organization_id}
            isPro={isPro}
          />
        )}

        {/* SEARCH */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, tech, apartment, or date..."
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
              Searching all work orders including completed and closed. Clear the search to return to the active feed.
            </p>
          )}
        </div>

        {/* NEW WORK ORDER BUTTON */}
        <button
          onClick={() => navigate('/work-order/new')}
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
            fontFamily: 'Inter, sans-serif',
            marginBottom: '1.25rem'
          }}
        >
          + New Work Order
        </button>

        {/* FILTER PILLS */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['all', 'critical', 'high', 'standard', 'routine'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: `1px solid ${filter === f ? '#c9a84c' : 'rgba(201,168,76,0.18)'}`,
                background: filter === f ? 'rgba(201,168,76,0.08)' : 'none',
                color: filter === f ? '#c9a84c' : '#9a9db5',
                fontSize: '0.75rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'capitalize',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap'
              }}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* WORK ORDER LIST */}
        <div id="mobile-work-orders-list">
        {loading ? (
          <p style={{ color: '#9a9db5', textAlign: 'center', padding: '2rem' }}>Loading work orders...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: '#9a9db5'
          }}>
            No open work orders{filter !== 'all' ? ` with ${filter} priority` : ''}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {filtered.map(wo => (
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
      </div>
      <MobileBottomNav profile={profile} />
    </div>
  )
}