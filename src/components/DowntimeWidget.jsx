import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LogDowntimeModal from './LogDowntimeModal'
import EndDowntimeModal from './EndDowntimeModal'

function formatElapsed(startedAt) {
  const start = new Date(startedAt)
  const now = new Date()
  const diffMs = now - start
  const totalMinutes = Math.floor(diffMs / 60000)
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

function formatStartTime(startedAt) {
  const date = new Date(startedAt)
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatTotalDowntime(totalMinutes) {
  const hours = totalMinutes / 60
  if (hours < 1) return `${Math.round(totalMinutes)}m`
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}

export default function DowntimeWidget({ organizationId, isPro }) {
  const navigate = useNavigate()
  const [activeEvents, setActiveEvents] = useState([])
  const [monthlyTotalMinutes, setMonthlyTotalMinutes] = useState(0)
  const [monthlyEventCount, setMonthlyEventCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [endingEvent, setEndingEvent] = useState(null)
  const [tickCounter, setTickCounter] = useState(0)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('downtimeWidgetCollapsed') === 'true'
    } catch {
      return false
    }
  })

  function toggleCollapsed() {
    const newState = !collapsed
    setCollapsed(newState)
    try {
      localStorage.setItem('downtimeWidgetCollapsed', String(newState))
    } catch {}
  }

  // Re-render every minute to update elapsed time displays
  useEffect(() => {
    const interval = setInterval(() => {
      setTickCounter(t => t + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!organizationId || !isPro) {
      setLoading(false)
      return
    }
    fetchDowntimeData()
  }, [organizationId, isPro])

  async function fetchDowntimeData() {
    setLoading(true)

    // Get the start of the current month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Fetch active (currently-open) downtime events
    const { data: active } = await supabase
      .from('downtime_events')
      .select(`
        id,
        started_at,
        downtime_type,
        reason,
        assets:asset_id ( id, name, location )
      `)
      .eq('organization_id', organizationId)
      .is('ended_at', null)
      .order('started_at', { ascending: true })

    // Fetch all completed events from this month for metrics
    const { data: monthEvents } = await supabase
      .from('downtime_events')
      .select('started_at, ended_at')
      .eq('organization_id', organizationId)
      .gte('started_at', monthStart.toISOString())

    setActiveEvents(active || [])
    setMonthlyEventCount(monthEvents?.length || 0)

    // Calculate total downtime minutes this month (only for events with end times)
    let totalMinutes = 0
    if (monthEvents) {
      for (const ev of monthEvents) {
        if (ev.ended_at) {
          const duration = (new Date(ev.ended_at) - new Date(ev.started_at)) / 60000
          totalMinutes += duration
        }
      }
    }
    setMonthlyTotalMinutes(totalMinutes)
    setLoading(false)
  }

  function handleLogged() {
    fetchDowntimeData()
  }

  // Don't render at all if not Pro or while loading
  if (!isPro || loading) return null

  // Calculate uptime percentage for this month
  // Assume 30 days * 24 hours * 60 minutes = 43200 minutes per month for simplicity
  const minutesInMonth = 30 * 24 * 60
  const uptimePercent = minutesInMonth > 0
    ? ((minutesInMonth - monthlyTotalMinutes) / minutesInMonth * 100).toFixed(1)
    : '100.0'

  return (
    <>
      <div style={{
        background: '#1e2245',
        border: '1px solid rgba(201,168,76,0.18)',
        borderLeft: activeEvents.length > 0 ? '3px solid #e06c75' : '3px solid rgba(201,168,76,0.18)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#c9a84c',
              fontWeight: 500
            }}>
              Downtime now
            </p>
            <h3 style={{
              margin: '0.35rem 0 0 0',
              fontFamily: 'Georgia, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#f8f6f1'
            }}>
              {activeEvents.length === 0
                ? 'All assets running'
                : `${activeEvents.length} ${activeEvents.length === 1 ? 'asset' : 'assets'} currently down`}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setModalOpen(true)}
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
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap'
              }}
            >
              + Log downtime
            </button>
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              style={{
                background: 'transparent',
                border: '1px solid rgba(154,157,181,0.3)',
                color: '#9a9db5',
                borderRadius: '6px',
                padding: '0.5rem 0.65rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1,
                transition: 'transform 0.2s'
              }}
            >
              {collapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>

        {!collapsed && activeEvents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {activeEvents.map(event => {
              const isUnplanned = event.downtime_type === 'unplanned'
              const accentColor = isUnplanned ? '#e06c75' : '#f5c518'
              const bgColor = isUnplanned ? 'rgba(224,108,117,0.08)' : 'rgba(245,197,24,0.08)'
              return (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.7rem 0.85rem',
                    background: bgColor,
                    borderRadius: '8px',
                    borderLeft: `3px solid ${accentColor}`,
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '0.92rem',
                      color: '#f8f6f1',
                      fontWeight: 500
                    }}>
                      {event.assets?.name || 'Unknown asset'}
                    </p>
                    <p style={{
                      margin: '0.2rem 0 0 0',
                      fontSize: '0.78rem',
                      color: '#9a9db5'
                    }}>
                      {isUnplanned ? 'Unplanned' : 'Planned'} · {event.reason}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: accentColor
                      }}>
                        {formatElapsed(event.started_at)}
                      </p>
                      <p style={{
                        margin: '0.2rem 0 0 0',
                        fontSize: '0.7rem',
                        color: '#6a6d85'
                      }}>
                        since {formatStartTime(event.started_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setEndingEvent(event)}
                      style={{
                        background: 'transparent',
                        color: '#98c379',
                        border: '1px solid rgba(152,195,121,0.4)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      End
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!collapsed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.6rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(154,157,181,0.12)'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '0.7rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.65rem',
              color: '#9a9db5',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>This month</p>
            <p style={{
              margin: '0.3rem 0 0 0',
              fontSize: '1.35rem',
              fontWeight: 600,
              color: '#f8f6f1'
            }}>{formatTotalDowntime(monthlyTotalMinutes)}</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '0.7rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.65rem',
              color: '#9a9db5',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>Uptime</p>
            <p style={{
              margin: '0.3rem 0 0 0',
              fontSize: '1.35rem',
              fontWeight: 600,
              color: '#98c379'
            }}>{uptimePercent}%</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '0.7rem',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.65rem',
              color: '#9a9db5',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>Events</p>
            <p style={{
              margin: '0.3rem 0 0 0',
              fontSize: '1.35rem',
              fontWeight: 600,
              color: '#f8f6f1'
            }}>{monthlyEventCount}</p>
          </div>
        </div>
        )}
      </div>
      {modalOpen && (
        <LogDowntimeModal
          organizationId={organizationId}
          onClose={() => setModalOpen(false)}
          onLogged={handleLogged}
        />
      )}

      {endingEvent && (
        <EndDowntimeModal
          event={endingEvent}
          onClose={() => setEndingEvent(null)}
          onEnded={() => {
            setEndingEvent(null)
            handleLogged()
          }}
        />
      )}
    </>
  )
}