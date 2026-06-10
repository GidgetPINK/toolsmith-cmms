import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import StockAdjustmentModal from './StockAdjustmentModal'

const CATEGORIES = ['Mechanical', 'Electrical', 'HVAC', 'Plumbing', 'Vehicle', 'Safety', 'Other']
const UNITS = ['each', 'box', 'case', 'foot', 'gallon', 'pound', 'liter', 'meter']

function formatAdjustmentDate(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PartFlyout({ mode, part, organizationId, onClose, onSaved }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isDeactivated = mode === 'edit' && part?.is_active === false

  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustments, setAdjustments] = useState([])
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false)

  async function fetchAdjustments() {
    if (!part?.id) return
    setAdjustmentsLoading(true)
    const { data, error: fetchError } = await supabase
      .from('part_adjustments')
      .select(`
        id,
        quantity_change,
        quantity_before,
        quantity_after,
        reason,
        notes,
        adjusted_at,
        adjusted_by,
        profiles:adjusted_by ( full_name )
      `)
      .eq('part_id', part.id)
      .order('adjusted_at', { ascending: false })
      .limit(20)

    setAdjustmentsLoading(false)
    if (!fetchError) {
      setAdjustments(data || [])
    }
  }

  function handleAdjustmentSaved() {
    if (onSaved) onSaved(null)
    onClose()
  }

  const [partNumber, setPartNumber] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [quantityOnHand, setQuantityOnHand] = useState('0')
  const [reorderPoint, setReorderPoint] = useState('0')
  const [unitOfMeasure, setUnitOfMeasure] = useState('each')
  const [unitCost, setUnitCost] = useState('0')
  const [supplierName, setSupplierName] = useState('')
  const [supplierPartNumber, setSupplierPartNumber] = useState('')
  const [supplierUrl, setSupplierUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (mode === 'edit' && part) {
      setPartNumber(part.part_number || '')
      setName(part.name || '')
      setDescription(part.description || '')
      setCategory(part.category || '')
      setQuantityOnHand(String(part.quantity_on_hand ?? 0))
      setReorderPoint(String(part.reorder_point ?? 0))
      setUnitOfMeasure(part.unit_of_measure || 'each')
      setUnitCost(String(part.unit_cost ?? 0))
      setSupplierName(part.supplier_name || '')
      setSupplierPartNumber(part.supplier_part_number || '')
      setSupplierUrl(part.supplier_url || '')
      setNotes(part.notes || '')
      fetchAdjustments()
    }
  }, [mode, part])

  async function handleSubmit() {
    setError('')

    if (!partNumber.trim()) {
      setError('Part number is required')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const qty = parseInt(quantityOnHand)
    const reorder = parseInt(reorderPoint)
    const cost = parseFloat(unitCost)

    if (isNaN(qty) || qty < 0) {
      setError('Quantity must be a non-negative number')
      return
    }
    if (isNaN(reorder) || reorder < 0) {
      setError('Reorder point must be a non-negative number')
      return
    }
    if (isNaN(cost) || cost < 0) {
      setError('Unit cost must be a non-negative number')
      return
    }

    setSubmitting(true)

    const payload = {
      organization_id: organizationId,
      part_number: partNumber.trim(),
      name: name.trim(),
      description: description.trim() || null,
      category: category || null,
      quantity_on_hand: qty,
      reorder_point: reorder,
      unit_of_measure: unitOfMeasure,
      unit_cost: cost,
      supplier_name: supplierName.trim() || null,
      supplier_part_number: supplierPartNumber.trim() || null,
      supplier_url: supplierUrl.trim() || null,
      notes: notes.trim() || null
    }

    let result
    if (mode === 'edit' && part?.id) {
      result = await supabase
        .from('parts')
        .update(payload)
        .eq('id', part.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('parts')
        .insert(payload)
        .select()
        .single()
    }

    setSubmitting(false)

    if (result.error) {
      if (result.error.code === '23505') {
        setError('A part with that part number already exists')
      } else {
        setError(result.error.message || 'Could not save part')
      }
      return
    }

    if (onSaved) onSaved(result.data)
    onClose()
  }

  async function handleReactivate() {
    if (!part?.id) return

    setSubmitting(true)
    setError('')

    const { error: reactivateError } = await supabase
      .from('parts')
      .update({ is_active: true })
      .eq('id', part.id)

    setSubmitting(false)

    if (reactivateError) {
      setError(reactivateError.message || 'Could not reactivate part')
      return
    }

    if (onSaved) onSaved(null)
    onClose()
  }

  async function handleDeactivate() {
    if (!part?.id) return

    const confirmed = window.confirm(
      `Deactivate "${part.name}"?\n\nThis part will be removed from your active inventory. Its history on past work orders will be preserved.`
    )
    if (!confirmed) return

    setSubmitting(true)
    setError('')

    const { error: deactivateError } = await supabase
      .from('parts')
      .update({ is_active: false })
      .eq('id', part.id)

    setSubmitting(false)

    if (deactivateError) {
      setError(deactivateError.message || 'Could not deactivate part')
      return
    }

    if (onSaved) onSaved(null)
    onClose()
  }

  // ============ STYLES ============
  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'flex-end',
    overflow: 'hidden'
  }

  const panel = {
    width: '480px',
    maxWidth: '100vw',
    height: '100vh',
    maxHeight: '100dvh',
    background: '#1a1a2e',
    borderLeft: '1px solid rgba(201,168,76,0.25)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
    boxSizing: 'border-box'
  }

  const header = {
    padding: '1.5rem',
    borderBottom: '1px solid rgba(201,168,76,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0
  }

  const body = {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1
  }

  const footer = {
    padding: '1rem 1.5rem',
    borderTop: '1px solid rgba(201,168,76,0.18)',
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    flexWrap: 'wrap'
  }

  const sectionLabel = {
    fontSize: '0.7rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#c9a84c',
    fontWeight: 500,
    margin: '1.5rem 0 0.75rem 0'
  }

  const fieldRow = {
    marginBottom: '0.85rem'
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

  const textarea = {
    ...input,
    minHeight: '70px',
    resize: 'vertical',
    fontFamily: 'Inter, sans-serif'
  }

  const select = {
    ...input,
    cursor: 'pointer'
  }

  const twoCol = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1.1rem',
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
    padding: '0.65rem 1.1rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const destructiveBtn = {
    background: 'transparent',
    color: '#e06c75',
    border: '1px solid rgba(224,108,117,0.4)',
    borderRadius: '8px',
    padding: '0.65rem 1.1rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: submitting ? 'wait' : 'pointer',
    fontFamily: 'Inter, sans-serif',
    opacity: submitting ? 0.6 : 1
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '0.25rem', fontWeight: 500, margin: 0 }}>
              {mode === 'edit' ? 'Edit part' : 'New part'}
            </p>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: '#f8f6f1', margin: '0.25rem 0 0 0' }}>
              {mode === 'edit' ? part?.name : 'Add a new part'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#9a9db5', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', lineHeight: 1 }}>
            ×
          </button>
        </div>

        <div style={body}>
          <div style={sectionLabel}>Identification</div>

          <div style={fieldRow}>
            <label style={label}>Part number *</label>
            <input
              style={input}
              type="text"
              value={partNumber}
              onChange={e => setPartNumber(e.target.value)}
              placeholder="e.g., BRG-6204-2RS"
              maxLength={50}
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Name *</label>
            <input
              style={input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Sealed ball bearing"
              maxLength={100}
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Description</label>
            <textarea
              style={textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional details about this part"
              maxLength={500}
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Category</label>
            <select
              style={select}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={sectionLabel}>Inventory</div>

          <div style={twoCol}>
            <div style={fieldRow}>
              <label style={label}>Quantity on hand</label>
              <input
                style={input}
                type="number"
                min="0"
                value={quantityOnHand}
                onChange={e => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div style={fieldRow}>
              <label style={label}>Reorder point</label>
              <input
                style={input}
                type="number"
                min="0"
                value={reorderPoint}
                onChange={e => setReorderPoint(e.target.value)}
              />
            </div>
          </div>

          <div style={fieldRow}>
            <label style={label}>Unit of measure</label>
            <select
              style={select}
              value={unitOfMeasure}
              onChange={e => setUnitOfMeasure(e.target.value)}
            >
              {UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div style={sectionLabel}>Cost</div>

          <div style={fieldRow}>
            <label style={label}>Unit cost ($)</label>
            <input
              style={input}
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={sectionLabel}>Supplier</div>

          <div style={fieldRow}>
            <label style={label}>Supplier name</label>
            <input
              style={input}
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="e.g., Grainger, McMaster, Local Vendor"
              maxLength={100}
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Supplier part number</label>
            <input
              style={input}
              type="text"
              value={supplierPartNumber}
              onChange={e => setSupplierPartNumber(e.target.value)}
              placeholder="Their SKU or catalog number"
              maxLength={100}
            />
          </div>

          <div style={fieldRow}>
            <label style={label}>Supplier URL</label>
            <input
              style={input}
              type="url"
              value={supplierUrl}
              onChange={e => setSupplierUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
          </div>

          <div style={sectionLabel}>Notes</div>

          <div style={fieldRow}>
            <textarea
              style={{ ...textarea, minHeight: '90px' }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this part"
              maxLength={1000}
            />
          </div>

          {mode === 'edit' && (
            <>
              <div style={sectionLabel}>Adjustment history</div>
              {adjustmentsLoading ? (
                <p style={{ color: '#9a9db5', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                  Loading history...
                </p>
              ) : adjustments.length === 0 ? (
                <p style={{ color: '#6a6d85', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No adjustments yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {adjustments.map(adj => {
                    const isAdd = adj.quantity_change > 0
                    const changeColor = isAdd ? '#98c379' : '#e06c75'
                    return (
                      <div
                        key={adj.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(154,157,181,0.15)',
                          borderLeft: `3px solid ${changeColor}`,
                          borderRadius: '8px',
                          padding: '0.7rem 0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ color: changeColor, fontWeight: 700, fontSize: '0.95rem' }}>
                              {isAdd ? '+' : ''}{adj.quantity_change}
                            </span>
                            <span style={{ color: '#6a6d85', fontSize: '0.78rem' }}>
                              {adj.quantity_before} → {adj.quantity_after}
                            </span>
                          </div>
                          <span style={{ color: '#9a9db5', fontSize: '0.75rem' }}>
                            {formatAdjustmentDate(adj.adjusted_at)}
                          </span>
                        </div>
                        <p style={{ color: '#f8f6f1', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
                          {adj.reason}
                          {adj.profiles?.full_name && (
                            <span style={{ color: '#6a6d85' }}> · {adj.profiles.full_name}</span>
                          )}
                        </p>
                        {adj.notes && (
                          <p style={{ color: '#9a9db5', fontSize: '0.78rem', margin: '0.35rem 0 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                            {adj.notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
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
              padding: '0.75rem 1rem',
              marginTop: '1rem',
              color: '#e06c75',
              fontSize: '0.88rem',
              lineHeight: 1.4
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={footer}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {mode === 'edit' && !isDeactivated && (
              <>
                <button
                  onClick={() => setAdjustModalOpen(true)}
                  disabled={submitting}
                  style={ghostBtn}
                >
                  Adjust stock
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={submitting}
                  style={destructiveBtn}
                >
                  Deactivate
                </button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={ghostBtn}>
              {isDeactivated ? 'Close' : 'Cancel'}
            </button>
            {isDeactivated ? (
              <button onClick={handleReactivate} style={primaryBtn} disabled={submitting}>
                {submitting ? 'Reactivating...' : 'Reactivate'}
              </button>
            ) : (
              <button onClick={handleSubmit} style={primaryBtn} disabled={submitting}>
                {submitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add part'}
              </button>
            )}
          </div>
        </div>
      </div>

      {adjustModalOpen && (
        <StockAdjustmentModal
          part={part}
          onClose={() => setAdjustModalOpen(false)}
          onSaved={handleAdjustmentSaved}
        />
      )}
    </div>
  )
}