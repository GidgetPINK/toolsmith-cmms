import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function WorkOrderForm({ profile }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('standard')
  const [status, setStatus] = useState('open')
  const [assetId, setAssetId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [assets, setAssets] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!isNew)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSelectData()
    if (!isNew) fetchWorkOrder()
    if (isNew && profile?.role === 'technician') {
      setAssignedTo(profile.id)
    }
  }, [id])

  async function fetchSelectData() {
    const [assetRes, profRes] = await Promise.all([
      supabase.from('assets').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'technician')
    ])
    setAssets(assetRes.data || [])
    setTechnicians(profRes.data || [])
  }

  async function fetchWorkOrder() {
    setFetching(true)
    const { data, error } = await supabase
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
    }
    setFetching(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      title,
      description,
      priority,
      status,
      asset_id: assetId || null,
      assigned_to: assignedTo || null,
      organization_id: profile.organization_id,
      closed_at: status === 'closed' ? new Date().toISOString() : null
    }

    let result
    if (isNew) {
      result = await supabase.from('work_orders').insert(payload)
    } else {
      result = await supabase.from('work_orders').update(payload).eq('id', id)
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
    } else {
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

  if (fetching) return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#9a9db5', fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  )

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
        <button
          onClick={() => navigate('/')}
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
          Back
        </button>
      </nav>

      <div style={{ padding: '2.5rem 5%', maxWidth: '680px' }}>

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

          {/* TITLE */}
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

          {/* DESCRIPTION */}
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

          {/* PRIORITY */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="standard">Standard</option>
              <option value="routine">Routine</option>
            </select>
          </div>

          {/* STATUS — only show on edit */}
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
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          {/* ASSET */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Asset</label>
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">No asset selected</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* ASSIGNED TO */}
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
                style={{
                  ...inputStyle,
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
              />
            )}
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

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                padding: '0.9rem 2rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'Inter, sans-serif'
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
                  color: '#e06c75',
                  borderRadius: '8px',
                  padding: '0.9rem 2rem',
                  fontSize: '0.9rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}