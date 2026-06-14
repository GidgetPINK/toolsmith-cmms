import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PartsPicker({ organizationId, workOrderId, onClose, onAdded }) {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPart, setSelectedPart] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchParts()
  }, [])

  async function fetchParts() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('parts')
      .select('id, part_number, name, quantity_on_hand, unit_cost, unit_of_measure')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .gt('quantity_on_hand', 0)
      .order('part_number', { ascending: true })

    if (fetchError) {
      console.error('Error loading parts:', fetchError)
    } else {
      setParts(data || [])
    }
    setLoading(false)
  }

  const filteredParts = parts.filter(p => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.part_number?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q)
    )
  })

  async function handleAdd() {
    setError('')

    if (!selectedPart) {
      setError('Please select a part')
      return
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) {
      setError('Quantity must be a positive whole number')
      return
    }

    if (qty > selectedPart.quantity_on_hand) {
      setError(`Only ${selectedPart.quantity_on_hand} available`)
      return
    }

    setSubmitting(true)

    const { error: insertError } = await supabase
      .from('work_order_parts')
      .insert({
        work_order_id: workOrderId,
        part_id: selectedPart.id,
        organization_id: organizationId,
        quantity_used: qty
      })

    setSubmitting(false)

    if (insertError) {
      if (insertError.message?.includes('Not enough stock')) {
        setError('Not enough stock available')
      } else {
        setError(insertError.message || 'Could not add part')
      }
      return
    }

    if (onAdded) onAdded()
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
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
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

  const searchInput = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.92rem',
    color: '#f8f6f1',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    marginBottom: '1rem'
  }

  const partsList = {
    flex: 1,
    overflowY: 'auto',
    border: '1px solid rgba(154,157,181,0.15)',
    borderRadius: '8px',
    marginBottom: '1rem',
    minHeight: '180px',
    maxHeight: '320px'
  }

  function partRowStyle(isSelected) {
    return {
      padding: '0.75rem 1rem',
      borderBottom: '1px solid rgba(154,157,181,0.08)',
      cursor: 'pointer',
      background: isSelected ? 'rgba(201,168,76,0.12)' : 'transparent',
      borderLeft: isSelected ? '3px solid #c9a84c' : '3px solid transparent'
    }
  }

  const quantityRow = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem'
  }

  const quantityInput = {
    width: '100px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    fontSize: '0.95rem',
    color: '#f8f6f1',
    fontFamily: 'Inter, sans-serif'
  }

  const previewCard = {
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderLeft: '3px solid #c9a84c',
    borderRadius: '8px',
    padding: '0.7rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.85rem'
  }

  const footer = {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '0.5rem'
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.5rem',
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
    padding: '0.65rem 1.5rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const previewTotal = selectedPart && parseInt(quantity) > 0
    ? (selectedPart.unit_cost * parseInt(quantity)).toFixed(2)
    : null

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={headerRow}>
          <div>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c9a84c', fontWeight: 500, margin: 0 }}>
              Add part
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 600, margin: '0.35rem 0 0 0' }}>
              Select a part to add
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by part number or name"
          style={searchInput}
          autoFocus
        />

        <div style={partsList}>
          {loading ? (
            <p style={{ padding: '1.5rem', textAlign: 'center', color: '#9a9db5', fontSize: '0.9rem', margin: 0 }}>
              Loading parts...
            </p>
          ) : filteredParts.length === 0 ? (
            <p style={{ padding: '1.5rem', textAlign: 'center', color: '#9a9db5', fontSize: '0.9rem', margin: 0 }}>
              {searchQuery ? 'No parts match your search' : 'No parts available'}
            </p>
          ) : (
            filteredParts.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPart(p)}
                style={partRowStyle(selectedPart?.id === p.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.78rem', color: '#9a9db5' }}>
                      {p.part_number}
                    </p>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.92rem', color: '#f8f6f1' }}>
                      {p.name}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#9a9db5' }}>
                      {p.quantity_on_hand} on hand
                    </p>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: '#c9a84c' }}>
                      ${(p.unit_cost || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedPart && (
          <>
            <div style={quantityRow}>
              <label style={{ color: '#9a9db5', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                Quantity:
              </label>
              <input
                type="number"
                min="1"
                max={selectedPart.quantity_on_hand}
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                style={quantityInput}
              />
              <span style={{ color: '#6a6d85', fontSize: '0.82rem' }}>
                {selectedPart.unit_of_measure || 'each'} (max {selectedPart.quantity_on_hand})
              </span>
            </div>

            {previewTotal && (
              <div style={previewCard}>
                <span style={{ color: '#9a9db5' }}>Total: </span>
                <span style={{ color: '#f8f6f1', fontWeight: 600 }}>${previewTotal}</span>
                <span style={{ color: '#6a6d85', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                  ({quantity} × ${(selectedPart.unit_cost || 0).toFixed(2)})
                </span>
              </div>
            )}
          </>
        )}

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
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button
            onClick={handleAdd}
            disabled={submitting || !selectedPart}
            style={{ ...primaryBtn, opacity: (!selectedPart || submitting) ? 0.6 : 1 }}
          >
            {submitting ? 'Adding...' : 'Add part'}
          </button>
        </div>
      </div>
    </div>
  )
}