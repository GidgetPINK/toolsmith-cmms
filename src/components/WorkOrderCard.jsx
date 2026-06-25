// Shared work order card used on Dashboard, Queue, and MobileWorkOrders.
// Renders the redesigned card layout: priority + status pills (top left),
// due date badge + chat bubble (top right), title, optional description,
// and a Created · Assigned meta line at the bottom.

export const PRIORITY_COLOR = {
  critical: '#e06c75',
  high: '#e8c97a',
  standard: '#9a9db5',
  routine: '#6a6d85'
}

export const PRIORITY_BG = {
  critical: 'rgba(224,108,117,0.12)',
  high: 'rgba(232,201,122,0.12)',
  standard: 'rgba(154,157,181,0.12)',
  routine: 'rgba(106,109,133,0.12)'
}

export const PRIORITY_ORDER = { critical: 0, high: 1, standard: 2, routine: 3 }

export const STATUS_COLOR = {
  open: '#c9a84c',
  'in progress': '#6cb6e0',
  closed: '#6a6d85'
}

const SLA_HOURS = {
  critical: 4,
  high: 24,
  standard: 72,
  routine: 168
}

// Compute due-state for a work order. Returns one of:
//   'closed'    -> work order is closed, no due styling
//   'overdue'   -> past due_date and not closed
//   'approaching' -> within the last 25% of SLA window
//   'normal'    -> none of the above
function computeDueState(wo) {
  if (wo.status === 'closed') return 'closed'
  if (!wo.due_date) return 'normal'
  const now = new Date()
  const due = new Date(wo.due_date)
  if (now > due) return 'overdue'
  const slaHours = SLA_HOURS[wo.priority] || 72
  const warnWindowMs = slaHours * 60 * 60 * 1000 * 0.25
  const msToDue = due - now
  if (msToDue <= warnWindowMs) return 'approaching'
  return 'normal'
}

// Pretty-print a due_date relative to now.
//   Overdue   -> "Overdue 2 hrs" / "Overdue 1 day"
//   Soon      -> "Due in 4 hrs" / "Due in 45 min"
//   Far       -> "Due Jun 21"
function formatDueLabel(wo, dueState) {
  if (!wo.due_date) return null
  const now = new Date()
  const due = new Date(wo.due_date)
  const diffMs = due - now
  const absMs = Math.abs(diffMs)
  const absHrs = absMs / (60 * 60 * 1000)
  const absDays = absMs / (24 * 60 * 60 * 1000)

  if (dueState === 'overdue') {
    if (absHrs < 1) {
      const mins = Math.max(1, Math.round(absMs / 60000))
      return `Overdue ${mins} min`
    }
    if (absHrs < 24) {
      const hrs = Math.max(1, Math.round(absHrs))
      return `Overdue ${hrs} hr${hrs === 1 ? '' : 's'}`
    }
    const days = Math.max(1, Math.round(absDays))
    return `Overdue ${days} day${days === 1 ? '' : 's'}`
  }

  if (dueState === 'approaching') {
    if (absHrs < 1) {
      const mins = Math.max(1, Math.round(absMs / 60000))
      return `Due in ${mins} min`
    }
    const hrs = Math.max(1, Math.round(absHrs))
    return `Due in ${hrs} hr${hrs === 1 ? '' : 's'}`
  }

  // Normal / far away: just show the date
  return 'Due ' + due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WorkOrderCard({
  wo,
  hasMessages,
  hasUnread,
  assetName,    // unused on card now, kept in case we add it back later
  techName,
  onClick,
  compact = false  // mobile uses tighter sizing
}) {
  const dueState = computeDueState(wo)
  const dueLabel = formatDueLabel(wo, dueState)

  // Border color follows due state
  let borderColor = 'rgba(201,168,76,0.18)'
  if (dueState === 'overdue') borderColor = 'rgba(224,108,117,0.5)'
  else if (dueState === 'approaching') borderColor = 'rgba(232,201,122,0.5)'

  // Due badge color follows due state
  let dueBadgeColor = '#9a9db5'
  let dueBadgeBg = 'rgba(255,255,255,0.04)'
  let dueBadgeWeight = 400
  if (dueState === 'overdue') {
    dueBadgeColor = '#e06c75'
    dueBadgeBg = 'rgba(224,108,117,0.15)'
    dueBadgeWeight = 500
  } else if (dueState === 'approaching') {
    dueBadgeColor = '#e8c97a'
    dueBadgeBg = 'rgba(232,201,122,0.15)'
    dueBadgeWeight = 500
  }

  // Sizing variants
  const titleSize = compact ? '1rem' : '1.05rem'
  const padding = compact ? '1rem 1.1rem' : '1.25rem 1.5rem'
  const pillFontSize = compact ? '0.62rem' : '0.7rem'
  const pillPadding = compact ? '0.18rem 0.55rem' : '0.2rem 0.65rem'
  const metaFontSize = compact ? '0.72rem' : '0.8rem'
  const descSize = compact ? '0.8rem' : '0.85rem'
  const descMax = compact ? 80 : 120

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e2245',
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* TOP ROW: pills left, due badge + chat right */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: compact ? '0.45rem' : '0.6rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: pillPadding,
            borderRadius: '20px',
            fontSize: pillFontSize,
            fontWeight: '700',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: PRIORITY_COLOR[wo.priority] || '#9a9db5',
            background: PRIORITY_BG[wo.priority] || 'rgba(154,157,181,0.12)',
            border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}`
          }}>
            {wo.priority}
          </span>
          <span style={{
            padding: pillPadding,
            borderRadius: '20px',
            fontSize: pillFontSize,
            letterSpacing: '0.08em',
            textTransform: 'capitalize',
            color: STATUS_COLOR[wo.status] || '#9a9db5',
            border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}`,
            background: 'transparent'
          }}>
            {wo.status}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, paddingTop: '2px' }}>
          {dueLabel && dueState !== 'closed' && (
            <span style={{
              fontSize: compact ? '0.68rem' : '0.72rem',
              color: dueBadgeColor,
              background: dueBadgeBg,
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: dueBadgeWeight,
              whiteSpace: 'nowrap'
            }}>
              {dueLabel}
            </span>
          )}
          {hasMessages && (
            <span
              title={hasUnread ? 'Has unread messages' : 'Has chat messages'}
              style={{
                position: 'relative',
                color: '#9a9db5',
                fontSize: compact ? '0.85rem' : '0.95rem',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {/* Inline SVG so we don't depend on an icon font */}
              <svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-3px',
                  width: '7px',
                  height: '7px',
                  background: '#e06c75',
                  borderRadius: '50%',
                  border: '1.5px solid #1e2245'
                }} />
              )}
            </span>
          )}
        </div>
      </div>

      {/* TITLE */}
      <h3 style={{
        fontFamily: 'Georgia, serif',
        fontSize: titleSize,
        fontWeight: '600',
        color: '#f8f6f1',
        margin: '0 0 0.5rem'
      }}>
        {wo.title}
      </h3>

      {/* DESCRIPTION */}
      {wo.description && (
        <p style={{
          color: '#9a9db5',
          fontSize: descSize,
          lineHeight: '1.6',
          marginBottom: '0.65rem',
          margin: '0 0 0.65rem'
        }}>
          {wo.description.length > descMax
            ? wo.description.slice(0, descMax) + '...'
            : wo.description}
        </p>
      )}

      {/* META: Created · Assigned (and Closed if closed) */}
      <div style={{
        display: 'flex',
        gap: compact ? '0.8rem' : '1.25rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: metaFontSize, color: '#9a9db5' }}>
          <span style={{ color: '#c9a84c' }}>Created:</span>{' '}
          {new Date(wo.created_at).toLocaleDateString()}
        </span>
        <span style={{ fontSize: metaFontSize, color: '#9a9db5' }}>
          <span style={{ color: '#c9a84c' }}>Assigned:</span>{' '}
          {techName || 'Unassigned'}
        </span>
        {wo.closed_at && (
          <span style={{ fontSize: metaFontSize, color: '#9a9db5' }}>
            <span style={{ color: '#c9a84c' }}>Closed:</span>{' '}
            {new Date(wo.closed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
