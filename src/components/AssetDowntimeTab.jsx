import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import LogDowntimeModal from './LogDowntimeModal'
import EndDowntimeModal from './EndDowntimeModal'

function formatDuration(milliseconds) {
  const totalMinutes = Math.floor(milliseconds / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatHoursOnly(milliseconds) {
  const hours = milliseconds / (1000 * 60 * 60)
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}

function formatDateTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatElapsedFromStart(startedAt) {
  return formatDuration(new Date() - new Date(startedAt))
}

export default function AssetDowntimeTab({ asset, organizationId, profiles }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [endingEvent, setEndingEvent] = useState(null)
  const [tickCounter, setTickCounter] = useState(0)

  // Re-render every minute to update elapsed time for ongoing events
  useEffect(() => {
    const interval = setInterval(() => {
      setTickCounter(t => t + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (asset?.id) {
      fetchEvents()
    }
  }, [asset?.id])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('downtime_events')
      .select(`
        id,
        started_at,
        ended_at,
        downtime_type,
        reason,
        start_notes,
        end_notes,
        created_by,
        ended_by,
        work_order_id,
        work_orders:work_order_id ( id, title )
      `)
      .eq('asset_id', asset.id)
      .order('started_at', { ascending: false })

    if (!error) {
      setEvents(data || [])
    }
    setLoading(false)
  }

  function handleLogged() {
    fetchEvents()
  }

  function getPersonName(userId) {
    if (!userId) return 'Unknown'
    const p = profiles.find(p => p.id === userId)
    return p?.full_name || 'Unknown'
  }

  // Calculate metrics for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const last30DaysEvents = events.filter(e => new Date(e.started_at) >= thirtyDaysAgo)
  const closedLast30 = last30DaysEvents.filter(e => e.ended_at)

  // Total downtime (closed events only)
  const totalDowntimeMs = closedLast30.reduce((sum, e) => {
    const duration = new Date(e.ended_at) - new Date(e.started_at)
    return sum + duration
  }, 0)

  // MTBF: mean time between failures
  // Average gap between event START times
  let mtbfMs = null
  if (last30DaysEvents.length >= 2) {
    const sortedByStart = [...last30DaysEvents].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    const gaps = []
    for (let i = 1; i < sortedByStart.length; i++) {
      const gap = new Date(sortedByStart[i].started_at) - new Date(sortedByStart[i - 1].started_at)
      gaps.push(gap)
    }
    mtbfMs = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  }

  // MTTR: mean time to repair
  // Average duration of closed events
  let mttrMs = null
  if (closedLast30.length > 0) {
    mttrMs = totalDowntimeMs / closedLast30.length
  }

  // ============ STYLES ============
  const sectionHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '0.75rem',
    flexWrap: 'wrap'
  }

  const eyebrow = {
    fontSize: '0.7rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: '#c9a84c',
    fontWeight: 500,
    margin: 0
  }

  const sectionTitle = {
    fontFamily: 'Georgia, serif',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0.25rem 0 0 0',
    color: '#f8f6f1'
  }

  const primaryBtn = {
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
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap'
  }

  const metricsGrid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  }

  const metricCard = {
    background: 'rgba(255,255,255,0.03)',
    padding: '0.7rem',
    borderRadius: '8px',
    textAlign: 'center'
  }

  const metricLabel = {
    margin: 0,
    fontSize: '0.62rem',
    color: '#9a9db5',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 500
  }

  const metricValue = {
    margin: '0.35rem 0 0 0',
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#f8f6f1'
  }

  const metricSubtext = {
    margin: '0.25rem 0 0 0',
    fontSize: '0.65rem',
    color: '#6a6d85'
  }

  const endBtnStyle = {
    background: 'transparent',
    color: '#98c379',
    border: '1px solid rgba(152,195,121,0.4)',
    borderRadius: '6px',
    padding: '0.35rem 0.7rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    whiteSpace: 'nowrap'
  }

  return (
    <div>
      <div style={sectionHeader}>
        <div>
          <p style={eyebrow}>Last 30 days</p>
          <h3 style={sectionTitle}>Downtime metrics</h3>
        </div>
        <button onClick={() => setLogModalOpen(true)} style={primaryBtn}>
          + Log downtime
        </button>
      </div>

      <div style={metricsGrid}>
        <div style={metricCard}>
          <p style={metricLabel}>Total downtime</p>
          <p style={metricValue}>{formatHoursOnly(totalDowntimeMs)}</p>
          <p style={metricSubtext}>
            {last30DaysEvents.length} {last30DaysEvents.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <div style={metricCard}>
          <p style={metricLabel}>MTBF</p>
          <p style={metricValue}>{mtbfMs !== null ? formatHoursOnly(mtbfMs) : '—'}</p>
          <p style={metricSubtext}>Between failures</p>
        </div>
        <div style={metricCard}>
          <p style={metricLabel}>MTTR</p>
          <p style={metricValue}>{mttrMs !== null ? formatHoursOnly(mttrMs) : '—'}</p>
          <p style={metricSubtext}>To repair</p>
        </div>
      </div>

      <p style={{ ...eyebrow, marginBottom: '0.75rem' }}>Event history</p>

      {loading ? (
        <p style={{ color: '#9a9db5', fontSize: '0.85rem', padding: '1rem 0', margin: 0 }}>
          Loading downtime events...
        </p>
      ) : events.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(201,168,76,0.2)',
          borderRadius: '10px',
          padding: '1.75rem 1.5rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#9a9db5', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
            No downtime events recorded for this asset yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {events.map(event => {
            const isOngoing = !event.ended_at
            const isUnplanned = event.downtime_type === 'unplanned'
            const borderColor = isUnplanned ? '#e06c75' : '#f5c518'
            const duration = isOngoing
              ? formatElapsedFromStart(event.started_at)
              : formatDuration(new Date(event.ended_at) - new Date(event.started_at))

            const startedBy = getPersonName(event.created_by)
            const endedBy = event.ended_by ? getPersonName(event.ended_by) : null
            const personLine = isOngoing
              ? `Started by ${startedBy}`
              : (endedBy && startedBy !== endedBy
                  ? `Started by ${startedBy}, ended by ${endedBy}`
                  : `Started and ended by ${startedBy}`)

            return (
              <div
                key={event.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${borderColor}`,
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: '#f8f6f1' }}>
                      {isOngoing
                        ? formatDateTime(event.started_at)
                        : `${formatDateTime(event.started_at)} — ${formatDateTime(event.ended_at)}`
                      }
                    </p>
                    {isOngoing && (
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(224,108,117,0.18)',
                        color: '#e06c75',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 700
                      }}>
                        Ongoing
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9a9db5' }}>
                    {isUnplanned ? 'Unplanned' : 'Planned'} · {event.reason}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: '#6a6d85' }}>
                    {personLine}
                    {event.work_orders?.title && ` · ${event.work_orders.title}`}
                  </p>
                  {event.start_notes && (
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#9a9db5', fontStyle: 'italic', lineHeight: 1.4 }}>
                      {event.start_notes}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isOngoing ? borderColor : '#f8f6f1'
                  }}>
                    {duration}{isOngoing ? '+' : ''}
                  </p>
                  {isOngoing && (
                    <button onClick={() => setEndingEvent(event)} style={endBtnStyle}>
                      End
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logModalOpen && (
        <LogDowntimeModal
          organizationId={organizationId}
          preselectedAssetId={asset.id}
          onClose={() => setLogModalOpen(false)}
          onLogged={() => {
            setLogModalOpen(false)
            handleLogged()
          }}
        />
      )}

      {endingEvent && (
        <EndDowntimeModal
          event={{ ...endingEvent, assets: { name: asset.name } }}
          onClose={() => setEndingEvent(null)}
          onEnded={() => {
            setEndingEvent(null)
            handleLogged()
          }}
        />
      )}
    </div>
  )
}