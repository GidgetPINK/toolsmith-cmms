import { useState } from 'react'
import { supabase } from '../lib/supabase'

const REASONS = [
  'Received Shipment',
  'Manual Recount',
  'Damaged/Lost',
  'Returned to Supplier',
  'Other'
]

export default function StockAdjustmentModal({ part, onClose, onSaved }) {
  const [direction, setDirection] = useState('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Received Shipment')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentQty = part?.quantity_on_hand ?? 0
  const qtyNum = parseInt(quantity) || 0
  const change = direction === 'add' ? qtyNum : -qtyNum
  const newQty = currentQty + change

  async function handleSubmit() {
    setError('')

    if (qtyNum <= 0) {
      setError('Quantity must be greater than 0')
      return
    }
    if (direction === 'remove' && newQty < 0) {
      setError(`Cannot remove ${qtyNum}. Only ${currentQty} on hand.`)
      return
    }
    if (!reason) {
      setError('Reason is required')
      return
    }

    setSubmitting(true)

    const { data, error: rpcError } = await supabase.rpc('adjust_part_stock', {
      p_part_id: part.id,
      p_quantity_change: change,
      p_reason: reason,
      p_notes: notes.trim() || null
    })

    setSubmitting(false)

    if (rpcError) {
      setError(rpcError.message || 'Could not adjust stock')
      return
    }

    if (onSaved) onSaved(data)
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
    padding: '1.75rem',
    maxWidth: '440px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    color: '#f8f6f1'
  }

  const headerBlock = {
    marginBottom: '1.25rem'
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
    margin: '0.35rem 0 0.5rem 0',
    color: '#f8f6f1'
  }

  const partLabel = {
    fontSize: '0.85rem',
    color: '#9a9db5',
    margin: 0
  }

  const fieldRow = {
    marginBottom: '1rem'
  }

  const label = {
    display: 'block',
    fontSize: '0.78rem',
    color: '#9a9db5',
    marginBottom: '0.35rem',
    letterSpacing: '0.04em'
  }

  const input = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.92rem',
    color: '#f8f6f1',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  }

  const select = {
    ...input,
    cursor: 'pointer'
  }

  const textarea = {
    ...input,
    minHeight: '70px',
    resize: 'vertical'
  }

  const directionRow = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
    marginBottom: '1rem'
  }

  function directionBtn(isActive, color) {
    return {
      padding: '0.7rem 0.5rem',
      background: isActive ? `${color}20` : 'transparent',
      border: `1px solid ${isActive ? color : 'rgba(154,157,181,0.3)'}`,
      borderRadius: '8px',
      color: isActive ? color : '#9a9db5',
      fontSize: '0.85rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif'
    }
  }

  const previewCard = {
    background: 'rgba(201,168,76,0.06)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderLeft: '3px solid #c9a84c',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    marginBottom: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem'
  }

  const previewLabel = {
    fontSize: '0.72rem',
    color: '#9a9db5',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    margin: 0
  }

  const previewValue = {
    fontSize: '1.15rem',
    fontWeight: 600,
    color: newQty < 0 ? '#e06c75' : '#f8f6f1',
    margin: 0
  }

  const footer = {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '0.5rem',
    flexWrap: 'wrap'
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.25rem',
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
    padding: '0.65rem 1.25rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={headerBlock}>
          <p style={eyebrow}>Adjust stock</p>
          <h2 style={title}>{part?.name}</h2>
          <p style={partLabel}>{part?.part_number} · {currentQty} on hand</p>
        </div>

        <div style={directionRow}>
          <button
            type="button"
            onClick={() => setDirection('add')}
            style={directionBtn(direction === 'add', '#98c379')}
          >
            + Add stock
          </button>
          <button
            type="button"
            onClick={() => setDirection('remove')}
            style={directionBtn(direction === 'remove', '#e06c75')}
          >
            − Remove stock
          </button>
        </div>

        <div style={fieldRow}>
          <label style={label}>Quantity</label>
          <input
            style={input}
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="e.g., 25"
            autoFocus
          />
        </div>

        {qtyNum > 0 && (
          <div style={previewCard}>
            <div>
              <p style={previewLabel}>New quantity</p>
              <p style={previewValue}>
                {currentQty} {direction === 'add' ? '+' : '−'} {qtyNum} = {newQty}
              </p>
            </div>
          </div>
        )}

        <div style={fieldRow}>
          <label style={label}>Reason *</label>
          <select
            style={select}
            value={reason}
            onChange={e => setReason(e.target.value)}
          >
            {REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div style={fieldRow}>
          <label style={label}>Notes (optional)</label>
          <textarea
            style={textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g., PO #12345, delivered by Grainger"
            maxLength={500}
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
            fontSize: '0.85rem',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <div style={footer}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSubmit} style={primaryBtn} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}