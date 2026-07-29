import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'

const PRIORITY_OPTIONS = ['critical', 'high', 'standard', 'routine']
const FREQUENCY_UNITS = ['days', 'weeks', 'months', 'years']

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  padding: '0.85rem 0.95rem',
  color: '#f8f6f1',
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box'
}

const labelStyle = {
  display: 'block',
  color: '#9a9db5',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.45rem',
  fontWeight: '500'
}

function formatDueDate(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'T00:00:00')
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ScheduleDetail({ profile }) {
  const navigate = useNavigate()
  const { id } = useParams()

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [technicians, setTechnicians] = useState([])
  const [assetName, setAssetName] = useState(null)

  // Preserved, never edited by this screen:
  const [assetId, setAssetId] = useState(null)
  const [organizationId, setOrganizationId] = useState(null)

  // Editable fields:
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequencyValue, setFrequencyValue] = useState('')
  const [frequencyUnit, setFrequencyUnit] = useState('months')
  const [nextDueAt, setNextDueAt] = useState('')
  const [priority, setPriority] = useState('standard')
  const [assignedTo, setAssignedTo] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const orgId = profile?.organization_id

      const [{ data: org }, { data: techs }, { data: sched }] = await Promise.all([
        supabase.from('organizations').select('name, is_upgraded').eq('id', orgId).single(),
        supabase.from('profiles').select('id, full_name').eq('organization_id', orgId),
        supabase.from('pm_schedules').select('*').eq('id', id).single()
      ])

      if (cancelled) return
      setOrganization(org || null)
      setTechnicians(techs || [])

      if (!sched) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // Preserve, do not edit:
      setAssetId(sched.asset_id || null)
      setOrganizationId(sched.organization_id)

      // Editable:
      setTitle(sched.title || '')
      setDescription(sched.description || '')
      setFrequencyValue(sched.frequency_value ? String(sched.frequency_value) : '')
      setFrequencyUnit(sched.frequency_unit || 'months')
      setNextDueAt(sched.next_due_at || '')
      setPriority(sched.priority || 'standard')
      setAssignedTo(sched.assigned_to || '')
      setIsActive(sched.is_active !== false)

      if (sched.asset_id) {
        const { data: asset } = await supabase.from('assets').select('name').eq('id', sched.asset_id).single()
        if (!cancelled) setAssetName(asset?.name || null)
      }

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id, profile?.organization_id])

  async function handleSave() {
    setError(null)
    if (!title.trim()) { setError('Title is required.'); return }
    const freq = parseInt(frequencyValue)
    if (!freq || freq < 1) { setError('Repeat frequency must be 1 or more.'); return }
    if (!nextDueAt) { setError('Next due date is required.'); return }

    setSaving(true)
    // asset_id and organization_id are intentionally preserved from load, never reassigned here.
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      frequency_value: freq,
      frequency_unit: frequencyUnit,
      next_due_at: nextDueAt,
      priority,
      assigned_to: assignedTo || null,
      is_active: isActive,
      updated_at: new Date().toISOString()
    }
    const { error: saveError } = await supabase
      .from('pm_schedules')
      .update(payload)
      .eq('id', id)

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
    } else {
      navigate(-1)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { error: delError } = await supabase.from('pm_schedules').delete().eq('id', id)
    setDeleting(false)
    if (delError) {
      setError(delError.message)
    } else {
      navigate(-1)
    }
  }

  const content = (
    <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: isMobile ? '1.25rem 1rem 2rem' : '2rem 1.5rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '1.5rem' }}
      >
        ← Back
      </button>

      <p style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 500, margin: '0 0 0.5rem' }}>
        Recurring Schedule
      </p>

      {loading ? (
        <p style={{ color: '#9a9db5' }}>Loading...</p>
      ) : notFound ? (
        <p style={{ color: '#9a9db5' }}>This schedule could not be found.</p>
      ) : (
        <>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: isMobile ? '1.6rem' : '2rem', color: '#f8f6f1', margin: '0 0 0.35rem', fontWeight: 600 }}>
            {title || 'Untitled schedule'}
          </h1>
          <p style={{ color: '#9a9db5', fontSize: '0.9rem', margin: '0 0 1.75rem' }}>
            {assetName ? `Linked to asset: ${assetName}` : 'Not linked to an asset'}
            {nextDueAt ? ` · Next due ${formatDueDate(nextDueAt)}` : ''}
          </p>

          {!isActive && (
            <div style={{ background: 'rgba(154,157,181,0.12)', border: '1px solid rgba(154,157,181,0.3)', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1.5rem', color: '#9a9db5', fontSize: '0.85rem' }}>
              This schedule is paused. It will not generate new work orders until resumed.
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Repeat every</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="number" min="1" value={frequencyValue} onChange={e => setFrequencyValue(e.target.value)} style={{ ...inputStyle, width: '80px' }} />
                <select value={frequencyUnit} onChange={e => setFrequencyUnit(e.target.value)} style={inputStyle}>
                  {FREQUENCY_UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Next due date</label>
              <input type="date" value={nextDueAt} onChange={e => setNextDueAt(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assigned to</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inputStyle}>
                <option value="">Unassigned</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', marginBottom: '2rem' }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#c9a84c', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.9rem', color: '#f8f6f1' }}>Active (generating work orders)</span>
          </label>

          {error && <p style={{ color: '#e06c75', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0.85rem 1.75rem', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'Inter, sans-serif' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: '1px solid rgba(224,108,117,0.4)', color: '#e06c75', borderRadius: '8px', padding: '0.85rem 1.5rem', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Delete schedule
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: '#e06c75', fontSize: '0.82rem' }}>Delete for good?</span>
                <button onClick={handleDelete} disabled={deleting} style={{ background: '#e06c75', border: 'none', color: '#1a1a2e', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: '1px solid rgba(154,157,181,0.3)', color: '#9a9db5', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ display: isMobile ? 'block' : 'flex', minHeight: '100vh', background: '#1a1a2e', fontFamily: 'Inter, sans-serif', color: '#f8f6f1', paddingBottom: isMobile ? '90px' : 0 }}>
      {!isMobile && <Sidebar profile={profile} organization={organization} />}
      <div style={isMobile ? {} : { flex: 1, minWidth: 0, overflow: 'auto', width: '100%' }}>
        {content}
      </div>
      {isMobile && <MobileBottomNav profile={profile} />}
    </div>
  )
}
