import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import TrialBanner from '../components/TrialBanner'
import TeamInviteBanner from '../components/TeamInviteBanner'
import LowStockWidget from '../components/LowStockWidget'
import AssetDowntimeTab from '../components/AssetDowntimeTab'
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

const CATEGORIES = ['Mechanical', 'Electrical', 'HVAC', 'Plumbing', 'Vehicle', 'Safety', 'Other']
const CRITICALITY_LEVELS = ['Low', 'Standard', 'High', 'Critical']
const PRIORITY_OPTIONS = ['critical', 'high', 'standard', 'routine']
const FREQUENCY_UNITS = ['days', 'weeks', 'months', 'years']

function formatFrequency(value, unit) {
  const n = parseInt(value)
  if (!n) return ''
  if (n === 1) return `Every ${unit.replace(/s$/, '')}`
  return `Every ${n} ${unit}`
}

function getRelativeDueText(dateString) {
  if (!dateString) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateString + 'T00:00:00')
  const diffMs = due - today
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Due today'
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`
  if (diffDays <= 14) return `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
  return ''
}

function formatDueDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getUpcomingCutoff() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
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
  const { unreadIds, hasMessagesIds } = useUnreadMessages(profile?.id)
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])
  const [assets, setAssets] = useState([])
  const [organization, setOrganization] = useState(null)
  const [customFieldDefs, setCustomFieldDefs] = useState([])
  const [upcomingPms, setUpcomingPms] = useState([])
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
    const cutoff = getUpcomingCutoff()
    const [woRes, profRes, assetRes, orgRes, cfdRes, pmRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*')
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
        .order('display_order', { ascending: true }),
      supabase
        .from('pm_schedules')
        .select('*, assets(id, name)')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .lte('next_due_at', cutoff)
        .order('next_due_at', { ascending: true })
    ])
    setWorkOrders(woRes.data || [])
    setProfiles(profRes.data || [])
    setAssets(assetRes.data || [])
    setOrganization(orgRes.data || null)
    setCustomFieldDefs(cfdRes.data || [])
    setUpcomingPms(pmRes.data || [])
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

  function openEditAsset(asset, initialTab = 'details') {
    setFlyoutMode('edit')
    setFlyoutAsset(asset)
    setFlyoutTab(initialTab)
    setFlyoutOpen(true)
    setSearchQuery('')
    setSearchFocused(false)
  }

  function openPmInAsset(pm) {
    const asset = assets.find(a => a.id === pm.asset_id) || pm.assets
    if (asset) openEditAsset(asset, 'pm')
  }

  function generateWorkOrderFromPm(pm, e) {
    if (e) e.stopPropagation()
    navigate(`/work-order/new?asset=${pm.asset_id}&from_pm=${pm.id}`)
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

  const activeWorkOrders = workOrders.filter(wo => wo.status !== 'closed')

  const filtered = searchQuery.trim()
    ? workOrders.filter(wo => {
        const q = searchQuery.toLowerCase()
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

  const displayedOrders = filtered

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

        </div>


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

        <Sidebar profile={profile} organization={organization} />

        {/* MAIN CONTENT */}
        <div
          className="main-content"
          style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0, boxSizing: 'border-box' }}
        >
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
                onClick={() => {
                  setFilter(stat.filterKey)
                  setTimeout(() => {
                    document.getElementById('work-orders-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 50)
                }}
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

          {profile?.role === 'manager' && (
            <LowStockWidget
              organizationId={profile.organization_id}
              isPro={isPro}
            />
          )}

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
          <div id="work-orders-list">
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
          profiles={profiles}
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
function AssetFlyout({ mode, asset, tab, setTab, workOrders, organizationId, customFieldDefs, profiles, onClose, onSaved, onDeleted, getTechName }) {
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

  const [pmList, setPmList] = useState([])
  const [pmLoading, setPmLoading] = useState(false)
  const [pmView, setPmView] = useState('list')
  const [editingPmId, setEditingPmId] = useState(null)
  const [pmTitle, setPmTitle] = useState('')
  const [pmDescription, setPmDescription] = useState('')
  const [pmFrequencyValue, setPmFrequencyValue] = useState('')
  const [pmFrequencyUnit, setPmFrequencyUnit] = useState('days')
  const [pmNextDueDate, setPmNextDueDate] = useState('')
  const [pmPriority, setPmPriority] = useState('standard')
  const [pmAssignedTo, setPmAssignedTo] = useState('')
  const [pmIsActive, setPmIsActive] = useState(true)
  const [pmSaving, setPmSaving] = useState(false)
  const [pmError, setPmError] = useState(null)

  useEffect(() => {
    if (mode === 'edit' && asset?.id) {
      fetchPmList()
    }
  }, [asset?.id, mode])

  async function fetchPmList() {
    if (!asset?.id) return
    setPmLoading(true)
    const { data } = await supabase
      .from('pm_schedules')
      .select('*')
      .eq('asset_id', asset.id)
      .order('next_due_at', { ascending: true })
    setPmList(data || [])
    setPmLoading(false)
  }

  function openCreatePm() {
    setPmView('form')
    setEditingPmId(null)
    setPmTitle('')
    setPmDescription('')
    setPmFrequencyValue('')
    setPmFrequencyUnit('days')
    setPmNextDueDate('')
    setPmPriority('standard')
    setPmAssignedTo('')
    setPmIsActive(true)
    setPmError(null)
  }

  function openEditPm(pm) {
    setPmView('form')
    setEditingPmId(pm.id)
    setPmTitle(pm.title)
    setPmDescription(pm.description || '')
    setPmFrequencyValue(String(pm.frequency_value))
    setPmFrequencyUnit(pm.frequency_unit)
    setPmNextDueDate(pm.next_due_at)
    setPmPriority(pm.priority)
    setPmAssignedTo(pm.assigned_to || '')
    setPmIsActive(pm.is_active)
    setPmError(null)
  }

  function cancelPmForm() {
    setPmView('list')
    setEditingPmId(null)
    setPmError(null)
  }

  async function savePm() {
    setPmError(null)
    if (!pmTitle.trim()) { setPmError('Task title is required'); return }
    const freq = parseInt(pmFrequencyValue)
    if (!freq || freq <= 0) { setPmError('Frequency must be a positive number'); return }
    if (!pmNextDueDate) { setPmError('Next due date is required'); return }

    setPmSaving(true)
    const payload = {
      asset_id: asset.id,
      organization_id: organizationId,
      title: pmTitle.trim(),
      description: pmDescription.trim() || null,
      frequency_value: freq,
      frequency_unit: pmFrequencyUnit,
      next_due_at: pmNextDueDate,
      priority: pmPriority,
      assigned_to: pmAssignedTo || null,
      is_active: pmIsActive,
      updated_at: new Date().toISOString()
    }

    let result
    if (editingPmId) {
      result = await supabase.from('pm_schedules').update(payload).eq('id', editingPmId)
    } else {
      result = await supabase.from('pm_schedules').insert(payload)
    }

    if (result.error) {
      setPmError(result.error.message)
      setPmSaving(false)
      return
    }

    setPmSaving(false)
    cancelPmForm()
    await fetchPmList()
  }

  async function togglePmActive(pm) {
    const { error } = await supabase
      .from('pm_schedules')
      .update({ is_active: !pm.is_active, updated_at: new Date().toISOString() })
      .eq('id', pm.id)
    if (!error) await fetchPmList()
  }

  async function deletePm(pm) {
    if (!confirm(`Delete "${pm.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('pm_schedules').delete().eq('id', pm.id)
    if (!error) await fetchPmList()
  }

  function generateWorkOrderFromPm(pm) {
    onClose()
    navigate(`/work-order/new?asset=${asset.id}&from_pm=${pm.id}`)
  }

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
      return <input type="text" value={value ?? ''} onChange={e => updateCustomFieldValue(def.id, e.target.value)} style={flyoutInputStyle} />
    }
    if (def.field_type === 'number') {
      return <input type="number" value={value ?? ''} onChange={e => updateCustomFieldValue(def.id, e.target.value)} style={flyoutInputStyle} />
    }
    if (def.field_type === 'date') {
      return <input type="date" value={value ?? ''} onChange={e => updateCustomFieldValue(def.id, e.target.value)} style={flyoutInputStyle} />
    }
    if (def.field_type === 'dropdown') {
      return (
        <select value={value ?? ''} onChange={e => updateCustomFieldValue(def.id, e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
          <option value="">Select</option>
          {(def.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    }
    if (def.field_type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8f6f1', fontSize: '0.9rem', cursor: 'pointer', padding: '0.5rem 0' }}>
          <input type="checkbox" checked={!!value} onChange={e => updateCustomFieldValue(def.id, e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#c9a84c', cursor: 'pointer' }} />
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
    if (!photoFile) {
      if (!photoPreview) return null
      return asset?.photo_url || null
    }
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
    if (validationError) { setError(validationError); return }

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

    if (asset?.photo_url && asset.photo_url !== photoUrl) {
      const oldPath = asset.photo_url.split('/asset-photos/')[1]
      if (oldPath) await supabase.storage.from('asset-photos').remove([oldPath])
    }

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
        <div className="asset-flyout-header" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '0.25rem', fontWeight: '500' }}>
              {mode === 'edit' ? 'Edit Asset' : 'New Asset'}
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: '600', color: '#f8f6f1' }}>
              {mode === 'edit' ? asset?.name : 'Add a new asset'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9a9db5', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {mode === 'edit' && (
          <div className="asset-flyout-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.18)', padding: '0 1.5rem' }}>
            {[
              { id: 'details', label: 'Details' },
              { id: 'history', label: 'Work Order History' },
              { id: 'pm', label: 'PM Schedule' },
              { id: 'downtime', label: 'Downtime' }
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

        <div className="asset-flyout-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

          {(mode === 'create' || tab === 'details') && (
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={flyoutLabelStyle}>Asset Photo</label>
                {photoPreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={photoPreview} alt="Asset" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(26,26,46,0.85)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        Change
                      </button>
                      <button type="button" onClick={removePhoto} style={{ background: 'rgba(224,108,117,0.15)', border: '1px solid rgba(224,108,117,0.3)', color: '#e06c75', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} style={{ border: '1px dashed rgba(201,168,76,0.3)', borderRadius: '8px', padding: '1.75rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(201,168,76,0.03)' }}>
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📷</p>
                    <p style={{ fontSize: '0.85rem', color: '#c9a84c', fontWeight: '500', marginBottom: '0.25rem' }}>Click to upload a photo</p>
                    <p style={{ fontSize: '0.72rem', color: '#9a9db5' }}>JPG, PNG, or WebP — max 5MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </div>

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
                <textarea value={functionText} onChange={e => setFunctionText(e.target.value)} placeholder="Supplies compressed air to the production line..." rows={3} style={{ ...flyoutInputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
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

              {customFieldDefs && customFieldDefs.length > 0 && (
                <>
                  <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.5rem 0 1.25rem' }} />
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '1rem', fontWeight: '500' }}>
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
                <p style={{ color: '#e06c75', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.65rem 0.85rem', background: 'rgba(224,108,117,0.1)', borderRadius: '6px', border: '1px solid rgba(224,108,117,0.2)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: mode === 'edit' ? '0.75rem' : 0 }}>
                <button type="submit" disabled={isSaving} style={{ flex: 1, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0.85rem', fontSize: '0.88rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}>
                  {uploadingPhoto ? 'Uploading photo...' : submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Asset'}
                </button>
                {mode === 'edit' && (
                  <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: '1px solid rgba(224,108,117,0.4)', color: '#e06c75', borderRadius: '8px', padding: '0.85rem 1.25rem', fontSize: '0.82rem', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: deleting ? 0.6 : 1 }}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>

              {mode === 'edit' && (
                <>
                  <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.25rem 0 0.75rem' }} />
                  <button type="button" onClick={handleCreateWorkOrder} style={{ width: '100%', background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', fontWeight: '500', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Create Work Order for This Asset
                  </button>
                </>
              )}
            </form>
          )}

          {mode === 'edit' && tab === 'history' && (
            <div>
              {assetWorkOrders.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.2)', borderRadius: '10px', padding: '2rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.88rem', color: '#9a9db5', lineHeight: '1.6' }}>No work orders for this asset yet.</p>
                  <button onClick={handleCreateWorkOrder} style={{ marginTop: '1rem', background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.82rem', fontWeight: '500', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Create First Work Order
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {assetWorkOrders.map(wo => (
                    <div key={wo.id} style={{ background: '#1e2245', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '10px', padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: PRIORITY_COLOR[wo.priority] || '#9a9db5', border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}` }}>
                          {wo.priority}
                        </span>
                        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'capitalize', color: STATUS_COLOR[wo.status] || '#9a9db5', border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}` }}>
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
                  <button onClick={handleCreateWorkOrder} style={{ background: 'none', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', borderRadius: '8px', padding: '0.7rem', fontSize: '0.82rem', fontWeight: '500', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Create Work Order
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && tab === 'pm' && (
            <div>
              {pmView === 'list' && (
                <>
                  {pmLoading ? (
                    <p style={{ color: '#9a9db5', textAlign: 'center', padding: '1.5rem' }}>Loading PM tasks...</p>
                  ) : pmList.length === 0 ? (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(201,168,76,0.2)', borderRadius: '10px', padding: '2rem 1.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.88rem', color: '#9a9db5', lineHeight: '1.6' }}>
                        No PM tasks for this asset yet. Add one below to schedule recurring maintenance.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginBottom: '0.75rem' }}>
                      {pmList.map(pm => {
                        const relText = getRelativeDueText(pm.next_due_at)
                        const isOverdue = relText.startsWith('Overdue') || relText === 'Due today'
                        return (
                          <div key={pm.id} style={{ background: '#1e2245', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '10px', padding: '0.9rem 1rem', opacity: pm.is_active ? 1 : 0.65 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: '600', color: '#f8f6f1', margin: 0, flex: 1 }}>
                                {pm.title}
                              </p>
                              <span style={{ padding: '0.12rem 0.5rem', borderRadius: '12px', fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: pm.is_active ? '#c9a84c' : '#6a6d85', border: `1px solid ${pm.is_active ? '#c9a84c' : '#6a6d85'}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                {pm.is_active ? 'Active' : 'Paused'}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#9a9db5', marginBottom: '0.3rem' }}>
                              {formatFrequency(pm.frequency_value, pm.frequency_unit)}{' '}
                              <span style={{ display: 'inline-block', padding: '0.08rem 0.45rem', borderRadius: '10px', fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: PRIORITY_COLOR[pm.priority], border: `1px solid ${PRIORITY_COLOR[pm.priority]}`, marginLeft: '0.3rem' }}>
                                {pm.priority}
                              </span>
                            </p>
                            <p style={{ fontSize: '0.78rem', color: '#9a9db5', marginBottom: '0.5rem' }}>
                              <span style={{ color: '#c9a84c' }}>Next due:</span> {formatDueDate(pm.next_due_at)}
                              {relText && <span style={{ color: isOverdue ? '#e06c75' : '#9a9db5' }}> · {relText}</span>}
                            </p>
                            {pm.assigned_to && (
                              <p style={{ fontSize: '0.72rem', color: '#9a9db5', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#c9a84c' }}>Assigned:</span> {getTechName(pm.assigned_to)}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '0.5px solid rgba(154,157,181,0.15)', flexWrap: 'wrap' }}>
                              <button onClick={() => openEditPm(pm)} style={{ background: 'none', border: 'none', color: '#9a9db5', fontSize: '0.78rem', cursor: 'pointer', padding: '0.25rem 0.4rem', fontFamily: 'Inter, sans-serif' }}>
                                Edit
                              </button>
                              <button onClick={() => togglePmActive(pm)} style={{ background: 'none', border: 'none', color: '#9a9db5', fontSize: '0.78rem', cursor: 'pointer', padding: '0.25rem 0.4rem', fontFamily: 'Inter, sans-serif' }}>
                                {pm.is_active ? 'Pause' : 'Resume'}
                              </button>
                              <button onClick={() => generateWorkOrderFromPm(pm)} style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '0.78rem', cursor: 'pointer', padding: '0.25rem 0.4rem', fontFamily: 'Inter, sans-serif' }}>
                                Generate WO
                              </button>
                              <button onClick={() => deletePm(pm)} style={{ background: 'none', border: 'none', color: '#e06c75', fontSize: '0.78rem', cursor: 'pointer', padding: '0.25rem 0.4rem', fontFamily: 'Inter, sans-serif', marginLeft: 'auto' }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button onClick={openCreatePm} style={{ width: '100%', background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    + Add PM Task
                  </button>
                </>
              )}

              {pmView === 'form' && (
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '1rem', fontWeight: '500' }}>
                    {editingPmId ? 'Edit PM Task' : 'New PM Task'}
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={flyoutLabelStyle}>Task Title *</label>
                    <input type="text" value={pmTitle} onChange={e => setPmTitle(e.target.value)} placeholder="Oil change, filter inspection..." style={flyoutInputStyle} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={flyoutLabelStyle}>Description</label>
                    <textarea value={pmDescription} onChange={e => setPmDescription(e.target.value)} placeholder="Steps, parts needed, special instructions..." rows={3} style={{ ...flyoutInputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={flyoutLabelStyle}>Every</label>
                      <input type="number" min="1" value={pmFrequencyValue} onChange={e => setPmFrequencyValue(e.target.value)} placeholder="30" style={flyoutInputStyle} />
                    </div>
                    <div>
                      <label style={flyoutLabelStyle}>Unit</label>
                      <select value={pmFrequencyUnit} onChange={e => setPmFrequencyUnit(e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
                        {FREQUENCY_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={flyoutLabelStyle}>Next Due Date *</label>
                    <input type="date" value={pmNextDueDate} onChange={e => setPmNextDueDate(e.target.value)} style={flyoutInputStyle} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={flyoutLabelStyle}>Priority</label>
                    <select value={pmPriority} onChange={e => setPmPriority(e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={flyoutLabelStyle}>Assigned To (optional)</label>
                    <select value={pmAssignedTo} onChange={e => setPmAssignedTo(e.target.value)} style={{ ...flyoutInputStyle, cursor: 'pointer' }}>
                      <option value="">Any technician</option>
                      {(profiles || []).filter(p => p.is_active !== false).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8f6f1', fontSize: '0.9rem', cursor: 'pointer', padding: '0.6rem 0', marginBottom: '0.5rem' }}>
                    <input type="checkbox" checked={pmIsActive} onChange={e => setPmIsActive(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#c9a84c', cursor: 'pointer' }} />
                    Active
                  </label>

                  {pmError && (
                    <p style={{ color: '#e06c75', fontSize: '0.85rem', marginBottom: '1rem', padding: '0.65rem 0.85rem', background: 'rgba(224,108,117,0.1)', borderRadius: '6px', border: '1px solid rgba(224,108,117,0.2)' }}>
                      {pmError}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={savePm} disabled={pmSaving} style={{ width: '100%', background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: pmSaving ? 'not-allowed' : 'pointer', opacity: pmSaving ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}>
                      {pmSaving ? 'Saving...' : 'Save PM Task'}
                    </button>
                    <button onClick={cancelPmForm} style={{ width: '100%', background: 'none', color: '#9a9db5', border: '1px solid rgba(154,157,181,0.3)', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && tab === 'downtime' && (
            <AssetDowntimeTab
              asset={asset}
              organizationId={organizationId}
              profiles={profiles}
            />
          )}
        </div>
      </div>
      <MobileBottomNav profile={profile} />
    </div>
  )
}