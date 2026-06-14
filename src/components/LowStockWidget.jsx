import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LowStockWidget({ organizationId, isPro }) {
  const navigate = useNavigate()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId || !isPro) {
      setLoading(false)
      return
    }
    fetchLowStockParts()
  }, [organizationId, isPro])

  async function fetchLowStockParts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('parts')
      .select('id, part_number, name, quantity_on_hand, reorder_point, unit_of_measure')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('quantity_on_hand', { ascending: true })

    if (!error) {
      const filtered = (data || []).filter(p => {
        const isOut = p.quantity_on_hand === 0
        const isLow = p.quantity_on_hand > 0 && p.reorder_point > 0 && p.quantity_on_hand <= p.reorder_point
        return isOut || isLow
      })
      setParts(filtered.slice(0, 20))
    }
    setLoading(false)
  }

  // Don't render at all if not Pro or while loading
  if (!isPro || loading) return null

  // Don't render if there's nothing to show
  if (parts.length === 0) return null

  const outOfStock = parts.filter(p => p.quantity_on_hand === 0)
  const lowStock = parts.filter(p => p.quantity_on_hand > 0)
  const topCritical = parts.slice(0, 5)

  return (
    <div style={{
      background: '#1e2245',
      border: '1px solid rgba(201,168,76,0.18)',
      borderLeft: '3px solid #e06c75',
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
            Inventory alerts
          </p>
          <h3 style={{
            margin: '0.35rem 0 0 0',
            fontFamily: 'Georgia, serif',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#f8f6f1'
          }}>
            {outOfStock.length > 0 && lowStock.length > 0 && `${outOfStock.length} out of stock, ${lowStock.length} running low`}
            {outOfStock.length > 0 && lowStock.length === 0 && `${outOfStock.length} ${outOfStock.length === 1 ? 'part' : 'parts'} out of stock`}
            {outOfStock.length === 0 && lowStock.length > 0 && `${lowStock.length} ${lowStock.length === 1 ? 'part' : 'parts'} running low`}
          </h3>
        </div>
        <button
          onClick={() => navigate('/parts')}
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
          View all parts
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {topCritical.map(p => {
          const isOut = p.quantity_on_hand === 0
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.85rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#9a9db5'
                  }}>
                    {p.part_number}
                  </span>
                  <span style={{
                    fontSize: '0.9rem',
                    color: '#f8f6f1'
                  }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    color: isOut ? '#e06c75' : '#f5c518',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    background: isOut ? 'rgba(224,108,117,0.18)' : 'rgba(245,197,24,0.18)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    {isOut ? 'Out' : 'Low'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <span style={{
                  color: isOut ? '#e06c75' : '#f5c518',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}>
                  {p.quantity_on_hand}
                </span>
                <span style={{
                  color: '#6a6d85',
                  fontSize: '0.75rem'
                }}>
                  {' / '}
                  {p.reorder_point} {p.unit_of_measure || 'each'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {parts.length > 5 && (
        <p style={{
          margin: '0.75rem 0 0 0',
          fontSize: '0.78rem',
          color: '#9a9db5',
          textAlign: 'center'
        }}>
          + {parts.length - 5} more {parts.length - 5 === 1 ? 'part' : 'parts'} needs attention
        </p>
      )}
    </div>
  )
}