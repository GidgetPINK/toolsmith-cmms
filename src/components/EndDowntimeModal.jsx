import { useState } from 'react'
import { supabase } from '../lib/supabase'

function formatElapsed(startedAt) {
  const start = new Date(startedAt)
  const now = new Date()
  const diffMs = now - start
  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export default function EndDowntimeModal({ event, onClose, onEnded }) {
  const [endNotes, setEndNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: updateError } = await supabase
      .from('downtime_events')
      .update({
        ended_at: new Date().toISOString(),
        ended_by: user?.id || null,
        end_notes: endNotes.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', event.id)

    setSubmitting(false)

    if (updateError) {
      setError(updateError.message || 'Could not end downtime')
      return
    }

    if (onEnded) onEnded()
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
    maxWidth: '480px',
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

  const summaryCard = {
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    marginBottom: '1rem'
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

  const textarea = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.7rem 0.85rem',
    color: '#f8f6f1',
    fontSize: '0.92rem',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    minHeight: '90px',
    resize: 'vertical'
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
            <p style={eyebrow}>End downtime</p>
            <h2 style={title}>{event.assets?.name || 'Asset'} is back up?</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        <div style={summaryCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#f8f6f1' }}>
                {event.downtime_type === 'unplanned' ? 'Unplanned' : 'Planned'} · {event.reason}
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9a9db5' }}>
                Started {new Date(event.started_at).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#9a9db5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Total downtime
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 600, color: '#c9a84c' }}>
                {formatElapsed(event.started_at)}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>End notes (optional)</label>
            <textarea
              value={endNotes}
              onChange={e => setEndNotes(e.target.value)}
              placeholder="What was done to bring this back up? Any followups needed?"
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
              {submitting ? 'Ending...' : 'End downtime'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}