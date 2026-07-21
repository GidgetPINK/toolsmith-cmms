import { useState } from 'react'
import { supabase } from '../lib/supabase'

const FIELD_LABELS = {
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  status: 'Status',
  asset_id: 'Asset',
  assigned_to: 'Assigned to',
  apartment_number: 'Apartment',
  reporter: 'Reporter',
  compliance_category: 'Compliance category'
}

function formatStamp(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' \u00b7 ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function WorkOrderChangeLog({
  workOrderId,
  createdAt,
  createdByName,
  completedAt,
  completedByName,
  closedAt,
  closedByName
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && rows === null && workOrderId) {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('work_order_history')
        .select('*, changed_by_profile:changed_by ( full_name )')
        .eq('work_order_id', workOrderId)
        .order('changed_at', { ascending: true })
      if (err) setError(err.message)
      setRows(data || [])
      setLoading(false)
    }
  }

  // Group history rows that share a timestamp into one event
  function buildEvents() {
    const events = []

    if (createdAt) {
      events.push({
        at: createdAt,
        who: createdByName,
        label: 'Work order created',
        changes: []
      })
    }

    const byStamp = {}
    ;(rows || []).forEach(r => {
      const key = r.changed_at
      if (!byStamp[key]) {
        byStamp[key] = {
          at: r.changed_at,
          who: r.changed_by_profile?.full_name || '',
          label: null,
          changes: []
        }
        events.push(byStamp[key])
      }
      byStamp[key].changes.push({
        field: FIELD_LABELS[r.field] || r.field,
        from: r.old_value,
        to: r.new_value
      })
    })

    // Only synthesize stamps that history does not already explain
    const hasStatusChangeTo = v =>
      (rows || []).some(r => r.field === 'status' && r.new_value === v)

    if (completedAt && !hasStatusChangeTo('completed')) {
      events.push({
        at: completedAt,
        who: completedByName,
        label: 'Marked completed',
        changes: []
      })
    }

    if (closedAt && !hasStatusChangeTo('closed')) {
      events.push({
        at: closedAt,
        who: closedByName,
        label: 'Closed',
        changes: []
      })
    }

    return events.sort((a, b) => new Date(a.at) - new Date(b.at))
  }

  const events = open ? buildEvents() : []

  return (
    <div style={{
      marginTop: '1rem',
      background: '#1e2245',
      border: '1px solid rgba(201,168,76,0.18)',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          padding: '0.85rem 1rem',
          background: 'rgba(201,168,76,0.04)',
          border: 'none',
          borderBottom: open ? '1px solid rgba(201,168,76,0.18)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif'
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: '#c9a84c', fontSize: '0.95rem' }}>&#9636;</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f8f6f1' }}>Change Log</span>
        </div>
        <span style={{
          color: '#c9a84c',
          fontSize: '0.9rem',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>&#8964;</span>
      </button>

      {open && (
        <div style={{ padding: '1rem' }}>
          {loading && (
            <p style={{ fontSize: '0.8rem', color: '#9a9db5' }}>Loading...</p>
          )}

          {error && (
            <p style={{ fontSize: '0.8rem', color: '#e06c75' }}>
              Could not load the change log: {error}
            </p>
          )}

          {!loading && !error && events.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#9a9db5' }}>No history recorded yet.</p>
          )}

          {!loading && !error && events.map((ev, i) => (
            <div
              key={i}
              style={{
                paddingBottom: '0.9rem',
                marginBottom: '0.9rem',
                borderBottom: i === events.length - 1
                  ? 'none'
                  : '1px solid rgba(201,168,76,0.12)'
              }}
            >
              <p style={{
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#c9a84c',
                marginBottom: '0.25rem'
              }}>
                {formatStamp(ev.at)}
              </p>

              <p style={{ fontSize: '0.82rem', color: '#f8f6f1', marginBottom: ev.changes.length ? '0.5rem' : 0 }}>
                {ev.who || 'Unknown user'}
                {ev.label ? ' \u00b7 ' + ev.label : ''}
              </p>

              {ev.changes.map((c, j) => (
                <div key={j} style={{ marginTop: j === 0 ? 0 : '0.5rem' }}>
                  <p style={{
                    fontSize: '0.72rem',
                    color: '#9a9db5',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}>
                    {c.field}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#e8c97a', wordBreak: 'break-word' }}>
                    {c.from ? c.from : <span style={{ color: '#9a9db5' }}>empty</span>}
                    {' \u2192 '}
                    {c.to ? c.to : <span style={{ color: '#9a9db5' }}>empty</span>}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
