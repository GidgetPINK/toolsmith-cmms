import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import PartsPicker from '../components/PartsPicker'
import WorkOrderChat from '../components/WorkOrderChat'

export default function WorkOrderForm({ profile }) {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('standard')
  const [status, setStatus] = useState('open')
  const [assetId, setAssetId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [originalAssignedTo, setOriginalAssignedTo] = useState('')
  const [apartmentNumber, setApartmentNumber] = useState('')
  const [reporter, setReporter] = useState('')
  const [residentDetailsOpen, setResidentDetailsOpen] = useState(false)
  const [complianceCategory, setComplianceCategory] = useState('')
  const [complianceDetailsOpen, setComplianceDetailsOpen] = useState(false)
  const [pmScheduleId, setPmScheduleId] = useState(null)
  const [pmPreFilled, setPmPreFilled] = useState(false)
  const [assets, setAssets] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!isNew)
  const [error, setError] = useState(null)

  const [showUnassignedNudge, setShowUnassignedNudge] = useState(false)
  const [pendingNavigate, setPendingNavigate] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetLocation, setNewAssetLocation] = useState('')
  const [newAssetCategory, setNewAssetCategory] = useState('')
  const [addAssetError, setAddAssetError] = useState(null)
  const [addAssetSubmitting, setAddAssetSubmitting] = useState(false)
  const [workOrderParts, setWorkOrderParts] = useState([])
  const [partsPickerOpen, setPartsPickerOpen] = useState(false)
  const [partsLoading, setPartsLoading] = useState(false)

  useEffect(() => {
    fetchSelectData()
    if (!isNew) {
      fetchWorkOrder()
      fetchWorkOrderParts()
    }
    if (isNew && profile?.role === 'technician') {
      setAssignedTo(profile.id)
    }
    // Pre-fill asset from flyout "Create Work Order" button
    const prefilledAsset = searchParams.get('asset')
    if (isNew && prefilledAsset) {
      setAssetId(prefilledAsset)
    }
    // Pre-fill everything from a PM Task
    const fromPm = searchParams.get('from_pm')
    if (isNew && fromPm) {
      fetchPmAndPrefill(fromPm)
    }
  }, [id])

  async function fetchSelectData() {
    const [assetRes, profRes, orgRes] = await Promise.all([
      supabase.from('assets').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'technician'),
      supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()
    ])
    setAssets(assetRes.data || [])
    setTechnicians(profRes.data || [])
    setOrganization(orgRes.data || null)
  }

  async function fetchWorkOrder() {
    setFetching(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single()
    if (data) {
      setTitle(data.title)
      setDescription(data.description || '')
      setPriority(data.priority)
      setStatus(data.status)
      setAssetId(data.asset_id || '')
      setAssignedTo(data.assigned_to || '')
      setOriginalAssignedTo(data.assigned_to || '')
      setPmScheduleId(data.pm_schedule_id || null)
      setApartmentNumber(data.apartment_number || '')
      setReporter(data.reporter || '')
      if (data.apartment_number || data.reporter) {
        setResidentDetailsOpen(true)
      }
      setComplianceCategory(data.compliance_category || '')
      if (data.compliance_category) {
        setComplianceDetailsOpen(true)
      }
    }
    setFetching(false)
  }

  async function fetchWorkOrderParts() {
    if (!id) return
    setPartsLoading(true)
    const { data, error: fetchError } = await supabase
      .from('work_order_parts')
      .select(`
        id,
        quantity_used,
        unit_cost_at_time,
        total_cost,
        added_at,
        added_by,
        notes,
        part_id,
        parts:part_id ( id, part_number, name, unit_of_measure ),
        profiles:added_by ( full_name )
      `)
      .eq('work_order_id', id)
      .order('added_at', { ascending: false })

    setPartsLoading(false)
    if (!fetchError) {
      setWorkOrderParts(data || [])
    }
  }

  async function handleRemovePart(workOrderPartId, partName) {
    const confirmed = window.confirm(`Remove ${partName} from this work order? Stock will be restored.`)
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('work_order_parts')
      .delete()
      .eq('id', workOrderPartId)

    if (deleteError) {
      alert('Could not remove part: ' + deleteError.message)
      return
    }

    fetchWorkOrderParts()
  }

  function handlePartAdded() {
    fetchWorkOrderParts()
  }

  async function fetchPmAndPrefill(pmId) {
    const { data } = await supabase
      .from('pm_schedules')
      .select('*')
      .eq('id', pmId)
      .single()
    if (!data) return
    setTitle(data.title || '')
    setDescription(data.description || '')
    setPriority(data.priority || 'standard')
    setAssetId(data.asset_id || '')
    // Only managers can change assignees, so only override for them
    if (data.assigned_to && profile?.role === 'manager') {
      setAssignedTo(data.assigned_to)
    }
    setPmScheduleId(data.id)
    setPmPreFilled(true)
  }

  async function handleAddAsset(e) {
    e.preventDefault()
    setAddAssetError(null)
    setAddAssetSubmitting(true)

    if (!organization?.is_upgraded) {
      navigate('/upgrade')
      return
    }

    const { data, error } = await supabase
      .from('assets')
      .insert({
        name: newAssetName,
        location: newAssetLocation,
        category: newAssetCategory,
        organization_id: profile.organization_id
      })
      .select()
      .single()

    if (error) {
      setAddAssetError(error.message)
      setAddAssetSubmitting(false)
      return
    }

    setAssets(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setAssetId(data.id)
    setShowAddAsset(false)
    setNewAssetName('')
    setNewAssetLocation('')
    setNewAssetCategory('')
    setAddAssetSubmitting(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isNew && !assignedTo && profile?.role === 'manager' && technicians.length > 0 && !showUnassignedNudge) {
      setShowUnassignedNudge(true)
      setLoading(false)
      return
    }

    const payload = {
      title,
      description,
      priority,
      status,
      asset_id: assetId || null,
      assigned_to: assignedTo || null,
      organization_id: profile.organization_id,
      pm_schedule_id: pmScheduleId || null,
      apartment_number: apartmentNumber || null,
      reporter: reporter || null,
      compliance_category: complianceCategory || null,
      closed_at: status === 'closed' ? new Date().toISOString() : null
    }

    let result
    if (isNew) {
      result = await supabase.from('work_orders').insert(payload).select().single()
    } else {
      result = await supabase.from('work_orders').update(payload).eq('id', id).select().single()
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
    } else {
      // Fire assignment notification if assignee changed (or was newly set on insert)
      const savedWoId = result.data?.id || id
      const assigneeChanged = (assignedTo || null) !== (originalAssignedTo || null)
      if (savedWoId && assignedTo && assigneeChanged) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            // Fire and forget - don't block navigation on email send
            fetch('/api/send-notification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token
              },
              body: JSON.stringify({ type: 'assignment', work_order_id: savedWoId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
            }).catch(err => console.warn('Assignment notification failed:', err))
          }
        } catch (err) {
          console.warn('Could not send assignment notification:', err)
        }
      }
      navigate('/')
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this work order? This cannot be undone.')) return
    await supabase.from('work_orders').delete().eq('id', id)
    navigate('/')
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.8rem 1rem',
    color: '#f8f6f1',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'Inter, sans-serif'
  }

  const labelStyle = {
    display: 'block',
    color: '#9a9db5',
    fontSize: '0.78rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
    fontWeight: '500'
  }

  const fieldStyle = { marginBottom: '1.5rem' }

  const smallInputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '6px',
    padding: '0.6rem 0.85rem',
    color: '#f8f6f1',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    marginBottom: '0.5rem'
  }

  if (fetching) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1a1a2e' }}>
      <Sidebar profile={profile} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9a9db5', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
      </div>
      <MobileBottomNav />
    </div>
  )

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

      <style>{`
        @media (max-width: 900px) {
          .wo-layout { flex-direction: column !important; }
          .wo-chat-column { max-width: 100% !important; width: 100% !important; }
        }
      `}</style>
      <div style={{ padding: '2.5rem 5%', maxWidth: isNew ? '680px' : '1060px', margin: '0 auto' }}>
        <div className="wo-layout" style={{ display: isNew ? 'block' : 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0, maxWidth: '680px' }}>

        {/* PM PRE-FILL NOTICE (takes precedence over asset notice) */}
        {isNew && pmPreFilled && (
          <div style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: '10px',
            padding: '0.85rem 1.1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.7rem'
          }}>
            <span style={{ color: '#c9a84c', fontSize: '1.1rem', lineHeight: 1 }}>📋</span>
            <div>
              <p style={{ color: '#c9a84c', fontSize: '0.88rem', fontWeight: '600', marginBottom: '0.15rem' }}>
                Generated from a PM Task
              </p>
              <p style={{ color: '#e8c97a', fontSize: '0.8rem', lineHeight: '1.5' }}>
                Title, description, priority, asset, and assignee pre-filled from the schedule. Adjust anything before saving.
              </p>
            </div>
          </div>
        )}

        {/* ASSET PRE-FILL NOTICE (only when not from a PM) */}
        {isNew && !pmPreFilled && searchParams.get('asset') && assetId && (
          <div style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <span style={{ color: '#c9a84c', fontSize: '0.88rem' }}>⚡</span>
            <p style={{ color: '#c9a84c', fontSize: '0.85rem' }}>
              Asset pre-selected from your registry. Update any field before saving.
            </p>
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '0.4rem',
            fontWeight: '500'
          }}>
            {isNew ? 'New Work Order' : 'Edit Work Order'}
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            {isNew ? 'Create Work Order' : title}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>

          <div style={fieldStyle}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Brief description of the work needed"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Additional details, symptoms, location within asset..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="critical">Critical (4 hours)</option>
              <option value="high">High (24 hours)</option>
              <option value="standard">Standard (72 hours)</option>
              <option value="routine">Routine (7 days)</option>
            </select>
          </div>

          {!isNew && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="open">Open</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Asset</label>
            <select
              value={assetId}
              onChange={e => {
                if (e.target.value === '__add_new__') {
                  if (!organization?.is_upgraded) {
                    navigate('/upgrade')
                  } else {
                    setShowAddAsset(true)
                    setAssetId('')
                  }
                } else {
                  setAssetId(e.target.value)
                  setShowAddAsset(false)
                }
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">No asset selected</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
              <option value="__add_new__">
                {organization?.is_upgraded ? '+ Add New Asset' : '🔒 Add New Asset — Pro Feature'}
              </option>
            </select>

            {showAddAsset && (
              <div style={{
                marginTop: '0.75rem',
                background: 'rgba(201,168,76,0.04)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: '10px',
                padding: '1.1rem'
              }}>
                <p style={{
                  fontSize: '0.78rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#c9a84c',
                  marginBottom: '0.85rem',
                  fontWeight: '500'
                }}>
                  New Asset
                </p>
                <form onSubmit={handleAddAsset}>
                  <input
                    type="text"
                    value={newAssetName}
                    onChange={e => setNewAssetName(e.target.value)}
                    required
                    placeholder="Asset name"
                    style={smallInputStyle}
                  />
                  <input
                    type="text"
                    value={newAssetLocation}
                    onChange={e => setNewAssetLocation(e.target.value)}
                    required
                    placeholder="Location"
                    style={smallInputStyle}
                  />
                  <select
                    value={newAssetCategory}
                    onChange={e => setNewAssetCategory(e.target.value)}
                    required
                    style={{ ...smallInputStyle, background: '#1e2245', cursor: 'pointer', marginBottom: '0.75rem' }}
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

                  {addAssetError && (
                    <p style={{ color: '#e06c75', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                      {addAssetError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      type="submit"
                      disabled={addAssetSubmitting}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                        color: '#1a1a2e', border: 'none', borderRadius: '6px',
                        padding: '0.6rem', fontSize: '0.82rem', fontWeight: '700',
                        cursor: addAssetSubmitting ? 'not-allowed' : 'pointer',
                        opacity: addAssetSubmitting ? 0.7 : 1,
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      {addAssetSubmitting ? 'Saving...' : 'Save Asset'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAsset(false)
                        setNewAssetName('')
                        setNewAssetLocation('')
                        setNewAssetCategory('')
                        setAddAssetError(null)
                      }}
                      style={{
                        flex: 1, background: 'none',
                        border: '1px solid rgba(201,168,76,0.18)',
                        color: '#9a9db5', borderRadius: '6px',
                        padding: '0.6rem', fontSize: '0.82rem',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Assigned To</label>
            {profile?.role === 'manager' ? (
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Unassigned</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={profile?.full_name || ''}
                disabled
                style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
              />
            )}
          </div>

          {!isNew && organization?.is_upgraded && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <p style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#c9a84c',
                  fontWeight: 500,
                  margin: 0
                }}>
                  Parts Used
                </p>
                <button
                  type="button"
                  onClick={() => setPartsPickerOpen(true)}
                  style={{
                    background: 'transparent',
                    color: '#c9a84c',
                    border: '1px solid rgba(201,168,76,0.4)',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  + Add part
                </button>
              </div>

              {partsLoading ? (
                <p style={{ color: '#9a9db5', fontSize: '0.85rem', padding: '0.5rem 0', margin: 0 }}>
                  Loading parts...
                </p>
              ) : workOrderParts.length === 0 ? (
                <p style={{ color: '#6a6d85', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0', margin: 0 }}>
                  No parts used yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {workOrderParts.map(wp => (
                    <div
                      key={wp.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(154,157,181,0.15)',
                        borderRadius: '8px',
                        padding: '0.7rem 0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{
                          margin: 0,
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          color: '#9a9db5'
                        }}>
                          {wp.parts?.part_number}
                        </p>
                        <p style={{
                          margin: '0.15rem 0 0 0',
                          fontSize: '0.92rem',
                          color: '#f8f6f1'
                        }}>
                          {wp.parts?.name}
                        </p>
                        {wp.profiles?.full_name && (
                          <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.72rem',
                            color: '#6a6d85'
                          }}>
                            Added by {wp.profiles.full_name}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, color: '#f8f6f1', fontSize: '0.9rem', fontWeight: 600 }}>
                          {wp.quantity_used} {wp.parts?.unit_of_measure || 'each'}
                        </p>
                        <p style={{ margin: '0.15rem 0 0 0', color: '#c9a84c', fontSize: '0.82rem' }}>
                          ${(wp.total_cost || 0).toFixed(2)}
                        </p>
                        <p style={{ margin: '0.15rem 0 0 0', color: '#6a6d85', fontSize: '0.72rem' }}>
                          @ ${(wp.unit_cost_at_time || 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(wp.id, wp.parts?.name || 'this part')}
                        aria-label="Remove part"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(224,108,117,0.4)',
                          color: '#e06c75',
                          borderRadius: '6px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div style={{
                    marginTop: '0.5rem',
                    padding: '0.7rem 0.85rem',
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '0.78rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#9a9db5'
                    }}>
                      Parts Total
                    </span>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#c9a84c'
                    }}>
                      ${workOrderParts.reduce((sum, wp) => sum + (parseFloat(wp.total_cost) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{
            background: 'rgba(22,33,62,0.5)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => setResidentDetailsOpen(!residentDetailsOpen)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'rgba(201,168,76,0.04)',
                border: 'none',
                borderBottom: residentDetailsOpen ? '1px solid rgba(201,168,76,0.18)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
              aria-expanded={residentDetailsOpen}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: '#c9a84c', fontSize: '0.95rem' }}>⌂</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f8f6f1' }}>Resident Details</span>
                <span style={{ fontSize: '0.7rem', color: '#9a9db5', background: 'rgba(154,157,181,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Optional</span>
              </div>
              <span style={{ color: '#c9a84c', fontSize: '0.9rem', transform: residentDetailsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</span>
            </button>
            {residentDetailsOpen && (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', marginBottom: '0.4rem', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                    Apartment Number
                  </label>
                  <input
                    type="text"
                    value={apartmentNumber}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '')
                      setApartmentNumber(cleaned)
                    }}
                    placeholder="e.g. 204 or 204A"
                    maxLength={20}
                    style={inputStyle}
                  />
                  <p style={{ fontSize: '0.72rem', color: '#6a6d85', margin: '0.3rem 0 0', fontFamily: 'Inter, sans-serif' }}>
                    Letters and numbers only, no spaces or symbols
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', marginBottom: '0.4rem', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                    Reporter
                  </label>
                  <select
                    value={reporter}
                    onChange={e => setReporter(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select who reported this</option>
                    <option value="Resident">Resident</option>
                    <option value="Family Member">Family Member</option>
                    <option value="Staff">Staff</option>
                    <option value="Other">Other</option>
                  </select>
                  <p style={{ fontSize: '0.72rem', color: '#6a6d85', margin: '0.3rem 0 0', fontFamily: 'Inter, sans-serif' }}>
                    Who flagged this issue
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* COMPLIANCE DETAILS SECTION (Pro feature) */}
          <div style={{
            background: 'rgba(22,33,62,0.5)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            overflow: 'hidden'
          }}>
            <button
              type="button"
              onClick={() => {
                if (!organization?.is_upgraded) {
                  navigate('/upgrade')
                } else {
                  setComplianceDetailsOpen(!complianceDetailsOpen)
                }
              }}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'rgba(201,168,76,0.04)',
                border: 'none',
                borderBottom: complianceDetailsOpen && organization?.is_upgraded ? '1px solid rgba(201,168,76,0.18)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif'
              }}
              aria-expanded={complianceDetailsOpen && organization?.is_upgraded}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: '#c9a84c', fontSize: '0.95rem' }}>{organization?.is_upgraded ? '⚑' : '🔒'}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f8f6f1' }}>
                  Compliance Details
                </span>
                {!organization?.is_upgraded ? (
                  <span style={{ fontSize: '0.7rem', color: '#c9a84c', background: 'rgba(201,168,76,0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>Pro Feature</span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#9a9db5', background: 'rgba(154,157,181,0.1)', padding: '2px 8px', borderRadius: '4px' }}>Optional</span>
                )}
              </div>
              {organization?.is_upgraded && (
                <span style={{ color: '#c9a84c', fontSize: '0.9rem', transform: complianceDetailsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>⌄</span>
              )}
            </button>
            {complianceDetailsOpen && organization?.is_upgraded && (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9db5', marginBottom: '0.4rem', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                    Regulation Category
                  </label>
                  <select
                    value={complianceCategory}
                    onChange={e => setComplianceCategory(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Not compliance related</option>
                    <option value="Fire Safety">Fire Safety (fire drills, alarms, extinguishers, sprinklers)</option>
                    <option value="Emergency Systems">Emergency Systems (generators, emergency lighting, exits)</option>
                    <option value="Water Safety">Water Safety (hot water temperature, plumbing)</option>
                    <option value="Structural">Structural (building integrity, general repair)</option>
                    <option value="Sanitation">Sanitation (kitchen, laundry, pest control)</option>
                  </select>
                  <p style={{ fontSize: '0.72rem', color: '#6a6d85', margin: '0.3rem 0 0', fontFamily: 'Inter, sans-serif' }}>
                    Tag this work order for regulatory reporting and survey preparation
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p style={{
              color: '#e06c75', fontSize: '0.85rem', marginBottom: '1rem',
              padding: '0.75rem', background: 'rgba(224,108,117,0.1)',
              borderRadius: '6px', border: '1px solid rgba(224,108,117,0.2)'
            }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                color: '#1a1a2e', border: 'none', borderRadius: '8px',
                padding: '0.9rem 2rem', fontSize: '0.9rem', fontWeight: '700',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily: 'Inter, sans-serif'
              }}
            >
              {loading ? 'Saving...' : isNew ? 'Create Work Order' : 'Save Changes'}
            </button>

            {!isNew && profile?.role === 'manager' && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: 'none',
                  border: '1px solid rgba(224,108,117,0.4)',
                  color: '#e06c75', borderRadius: '8px',
                  padding: '0.9rem 2rem', fontSize: '0.9rem',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </form>
          </div>

          {!isNew && (
            <div className="wo-chat-column" style={{
              width: '320px',
              flexShrink: 0,
              position: 'sticky',
              top: '80px',
              alignSelf: 'flex-start'
            }}>
              <WorkOrderChat
                workOrderId={id}
                profile={profile}
                organizationId={profile?.organization_id}
              />
            </div>
          )}
        </div>
      </div>

      {showUnassignedNudge && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '14px',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              margin: '0 auto 1.25rem'
            }}>
              &#128221;
            </div>
            <h3 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.25rem',
              color: '#f8f6f1',
              marginBottom: '0.75rem',
              fontWeight: '600'
            }}>
              No one is assigned
            </h3>
            <p style={{
              color: '#9a9db5',
              fontSize: '0.9rem',
              lineHeight: '1.65',
              marginBottom: '1.75rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              This work order has no one assigned to it. Assigning a team member lets them see it in their queue and start working on it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { document.querySelector('form').requestSubmit(); }}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  letterSpacing: '0.04em'
                }}
              >
                Save without assigning
              </button>
              <button
                onClick={() => setShowUnassignedNudge(false)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#c9a84c',
                  borderRadius: '8px',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.85rem',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer'
                }}
              >
                Go back and assign someone now
              </button>
            </div>
          </div>
        </div>
      )}

      {partsPickerOpen && (
        <PartsPicker
          organizationId={profile?.organization_id}
          workOrderId={id}
          onClose={() => setPartsPickerOpen(false)}
          onAdded={handlePartAdded}
        />
      )}
      </div>
      <MobileBottomNav />
    </div>
  )
}