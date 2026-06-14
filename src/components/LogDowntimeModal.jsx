import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const REASONS = [
  'Mechanical failure',
  'Electrical failure',
  'Operator error',
  'Scheduled PM',
  'Materials/parts shortage',
  'Software/control issue',
  'Safety incident',
  'Other'
]

function getLocalDatetimeString() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function LogDowntimeModal({ organizationId, preselectedAssetId, workOrderId, onClose, onLogged }) {
  const [assets, setAssets] = useState([])
  const [assetId, setAssetId] = useState(preselectedAssetId || '')
  const [startedAt, setStartedAt] = useState(getLocalDatetimeString())
  const [downtimeType, setDowntimeType] = useState('unplanned')
  const [reason, setReason] = useState('Mechanical failure')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssets()
  }, [])

  async function fetchAssets() {
    const { data, error: fetchError } = await supabase
      .from('assets')
      .select('id, name, location')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    if (!fetchError) {
      setAssets(data || [])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!assetId) {
      setError('Please select an asset')
      return
    }
    if (!startedAt) {
      setError('Please enter the start time')
      return
    }
    if (!reason) {
      setError('Please select a reason')
      return
    }

    const startedAtIso = new Date(startedAt).toISOString()
    if (new Date(startedAtIso) > new Date()) {
      setError('Start time cannot be in the future')
      return
    }

    setSubmitting(true)

    const { data, error: insertError } = await supabase
      .from('downtime_events')
      .insert({
        organization_id: organizationId,
        asset_id: assetId,
        work_order_id: workOrderId || null,
        started_at: startedAtIso,
        downtime_type: downtimeType,
        reason,
        start_notes: notes.trim() || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Downtime insert error:', insertError)
      setError(insertError.message || 'Could not log downtime')
      setSubmitting(false)
      return
    }

    // Trigger notification for unplanned downtime
    if (downtimeType === 'unplanned' && data?.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await fetch('/api/notify-downtime', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ downtime_event_id: data.id })
          })
        }
      } catch (notifyError) {
        console.error('Notification failed (downtime saved):', notifyError)
      }
    }

    setSubmitting(false)
    if (onLogged) onLogged(data)
    onClose()
  }

  // ============ STYLES ============
  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    boxSizing: 'border-box'
  }

  const modal = {
    background: '#1e2245',
    border: '1px solid rgba(201,168,76,0.25)',
    borderRadius: '14px',
    padding: '1.5rem',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    color: '#f8f6f1'
  }

  const headerRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
    gap: '1rem'
  }

  const eyebrow = {
    fontSize: '0.7rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#c9a84c',
    fontWeight: 500,
    margin: 0
  }

  const title = {
    fontFamily: 'Georgia, serif',
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0.35rem 0 0 0'
  }

  const closeBtn = {
    background: 'transparent',
    border: 'none',
    color: '#9a9db5',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
    flexShrink: 0
  }

  const label = {
    display: 'block',
    color: '#9a9db5',
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '0.4rem',
    fontWeight: 500
  }

  const input = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.7rem 0.85rem',
    color: '#f8f6f1',
    fontSize: '0.92rem',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  }

  const textarea = {
    ...input,
    minHeight: '80px',
    resize: 'vertical'
  }

  const fieldRow = {
    marginBottom: '1rem'
  }

  const typeToggle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginBottom: '1rem'
  }

  function typeBtnStyle(isActive, isUnplanned) {
    const activeColor = isUnplanned ? '#e06c75' : '#f5c518'
    const activeBg = isUnplanned ? 'rgba(224,108,117,0.12)' : 'rgba(245,197,24,0.12)'
    return {
      background: isActive ? activeBg : 'transparent',
      color: isActive ? activeColor : '#9a9db5',
      border: `1px solid ${isActive ? activeColor : 'rgba(154,157,181,0.25)'}`,
      borderRadius: '8px',
      padding: '0.7rem',
      fontSize: '0.85rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif'
    }
  }

  const footer = {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: submitting ? 'wait' : 'pointer',
    fontFamily: 'Inter, sans-serif',
    opacity: submitting ? 0.6 : 1
  }

  const ghostBtn = {
    background: 'transparent',
    color: '#9a9db5',
    border: '1px solid rgba(154,157,181,0.3)',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={headerRow}>
          <div>
            <p style={eyebrow}>Log downtime</p>
            <h2 style={title}>Record an asset outage</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldRow}>
            <label style={label}>Asset *</label>
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              style={{ ...input, cursor: 'pointer' }}
              disabled={!!preselectedAssetId}
            >
              <option value="">Select an asset</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.location ? ` — ${a.location}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldRow}>
            <label style={label}>Type *</label>
            <div style={typeToggle}>
              <button
                type="button"
                onClick={() => setDowntimeType('unplanned')}
                style={typeBtnStyle(downtimeType === 'unplanned', true)}
              >
                Unplanned
              </button>
              <button
                type="button"
                onClick={() => setDowntimeType('planned')}
                style={typeBtnStyle(downtimeType === 'planned', false)}
              >
                Planned
              </button>
            </div>
            {downtimeType === 'unplanned' && (
              <p style={{ color: '#e06c75', fontSize: '0.78rem', margin: '0.25rem 0 0 0', lineHeight: 1.4 }}>
                Managers will be alerted by email when this is logged.
              </p>
            )}
          </div>

          <div style={fieldRow}>
            <label style={label}>Started at *</label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={e => setStartedAt(e.target.value)}
              style={input}
              required
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Reason *</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ ...input, cursor: 'pointer' }}
            >
              {REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={fieldRow}>
            <label style={label}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Belt slipped off pulley, needs realignment"
              maxLength={1000}
              style={textarea}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(224,108,117,0.12)',
              border: '1px solid rgba(224,108,117,0.4)',
              borderLeft: '3px solid #e06c75',
              borderRadius: '8px',
              padding: '0.7rem 0.9rem',
              marginBottom: '1rem',
              color: '#e06c75',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <div style={footer}>
            <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            <button type="submit" disabled={submitting} style={primaryBtn}>
              {submitting ? 'Logging...' : 'Start downtime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}