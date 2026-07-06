import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import PartFlyout from '../components/PartFlyout'
import BulkImportModal from '../components/BulkImportModal'

export default function Parts({ profile }) {
  const navigate = useNavigate()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutMode, setFlyoutMode] = useState('create')
  const [flyoutPart, setFlyoutPart] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showDeactivated, setShowDeactivated] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  function handleBulkImported(count) {
    fetchParts()
  }

  function openCreateFlyout() {
    setFlyoutMode('create')
    setFlyoutPart(null)
    setFlyoutOpen(true)
  }

  function openEditFlyout(part) {
    setFlyoutMode('edit')
    setFlyoutPart(part)
    setFlyoutOpen(true)
  }

  function closeFlyout() {
    setFlyoutOpen(false)
    setFlyoutPart(null)
  }

  function handleSaved() {
    fetchParts()
  }

  useEffect(() => {
    if (!profile?.organization_id) return
    fetchParts()
  }, [profile, showDeactivated])

  async function fetchParts() {
    setLoading(true)
    let query = supabase
      .from('parts')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('part_number', { ascending: true })

    if (!showDeactivated) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching parts:', error)
    } else {
      setParts(data || [])
    }
    setLoading(false)
  }

  // ============ COMPUTED VALUES ============
  const activeParts = parts.filter(p => p.is_active)
  const totalParts = activeParts.length
  const lowStockCount = activeParts.filter(p => p.quantity_on_hand <= p.reorder_point && p.quantity_on_hand > 0).length
  const outOfStockCount = activeParts.filter(p => p.quantity_on_hand === 0).length
  const inventoryValue = activeParts.reduce((sum, p) => sum + (p.quantity_on_hand * (p.unit_cost || 0)), 0)

  const availableCategories = [...new Set(parts.map(p => p.category).filter(Boolean))].sort()

  const filteredParts = parts.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false
    if (lowStockOnly && p.quantity_on_hand > p.reorder_point) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesNumber = p.part_number?.toLowerCase().includes(q)
      const matchesName = p.name?.toLowerCase().includes(q)
      const matchesSupplier = p.supplier_name?.toLowerCase().includes(q)
      if (!matchesNumber && !matchesName && !matchesSupplier) return false
    }
    return true
  })

  // ============ STYLES ============
  const page = {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#f8f6f1',
    fontFamily: 'Inter, sans-serif',
    padding: '2rem 2.5rem',
    boxSizing: 'border-box'
  }

  const container = {
    maxWidth: '1200px',
    margin: '0 auto'
  }

  const headerRow = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '0.5rem'
  }

  const backBtn = {
    background: 'none',
    border: '1px solid rgba(201,168,76,0.4)',
    color: '#c9a84c',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const heading = {
    fontFamily: 'Georgia, serif',
    fontSize: '1.8rem',
    fontWeight: 600,
    margin: 0,
    color: '#f8f6f1'
  }

  const subhead = {
    color: '#9a9db5',
    fontSize: '0.95rem',
    margin: '0 0 2rem 0',
    lineHeight: 1.5
  }

  const statsRow = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    marginBottom: '2rem'
  }

  const statCard = {
    background: '#16213e',
    border: '1px solid rgba(154,157,181,0.15)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem'
  }

  const statLabel = {
    fontSize: '0.72rem',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#9a9db5',
    margin: 0,
    fontWeight: 500
  }

  const statValue = {
    fontSize: '1.75rem',
    fontWeight: 600,
    margin: '0.35rem 0 0 0',
    color: '#f8f6f1'
  }

  const emptyState = {
    background: '#16213e',
    border: '1px solid rgba(154,157,181,0.15)',
    borderRadius: '12px',
    padding: '4rem 2rem',
    textAlign: 'center'
  }

  const emptyText = {
    color: '#9a9db5',
    fontSize: '1rem',
    margin: '0 0 1.5rem 0',
    lineHeight: 1.6
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.75rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={container}>
          <p style={{ color: '#9a9db5' }}>Loading parts...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A2E' }}>
      <Sidebar profile={profile} />
      <div style={{ ...page, flex: 1, minWidth: 0, minHeight: 'auto' }} className="parts-page">
      <style>{`
        @media (max-width: 768px) {
          .parts-page { padding: 1rem 1rem !important; }
          .parts-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
          .parts-stat-card { padding: 0.85rem 1rem !important; }
          .parts-stat-value { font-size: 1.35rem !important; }
          .parts-stat-label { font-size: 0.65rem !important; letter-spacing: 0.12em !important; }
          .parts-heading { font-size: 1.4rem !important; }
          .parts-empty-state { padding: 2.5rem 1.25rem !important; }
          .parts-action-bar { flex-direction: column !important; align-items: stretch !important; }
          .parts-action-bar > * { width: 100% !important; flex: 0 0 auto !important; }
          .parts-table { font-size: 0.8rem !important; }
          .parts-table th, .parts-table td { padding: 0.6rem 0.5rem !important; }
        }
      `}</style>
      <div style={container}>
        <div style={headerRow}>
          <h1 style={heading} className="parts-heading">Parts and inventory</h1>
        </div>
        <p style={subhead}>
          Manage parts, track usage, monitor stock levels
        </p>

        <div style={statsRow} className="parts-stats">
          <div style={statCard} className="parts-stat-card">
            <p style={statLabel} className="parts-stat-label">Total parts</p>
            <p style={statValue} className="parts-stat-value">{totalParts}</p>
          </div>
          <div style={statCard} className="parts-stat-card">
            <p style={statLabel} className="parts-stat-label">Below reorder</p>
            <p style={{ ...statValue, color: lowStockCount > 0 ? '#e8c97a' : '#f8f6f1' }} className="parts-stat-value">{lowStockCount}</p>
          </div>
          <div style={statCard} className="parts-stat-card">
            <p style={statLabel} className="parts-stat-label">Out of stock</p>
            <p style={{ ...statValue, color: outOfStockCount > 0 ? '#e06c75' : '#f8f6f1' }} className="parts-stat-value">{outOfStockCount}</p>
          </div>
          <div style={statCard} className="parts-stat-card">
            <p style={statLabel} className="parts-stat-label">Inventory value</p>
            <p style={statValue} className="parts-stat-value">${inventoryValue.toFixed(2)}</p>
          </div>
        </div>

        {parts.length === 0 ? (
          <div style={emptyState} className="parts-empty-state">
            <p style={emptyText}>
              Your parts inventory is empty.<br />
              Add your first part to get started.
            </p>
            <button style={primaryBtn} onClick={openCreateFlyout}>+ Add part</button>
          </div>
        ) : (
          <>
            <div className="parts-action-bar" style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search parts"
                style={{
                  flex: '1 1 240px',
                  minWidth: 0,
                  height: '42px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '8px',
                  padding: '0 0.9rem',
                  fontSize: '0.9rem',
                  color: '#f8f6f1',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box'
                }}
              />
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '8px',
                  padding: '0.7rem 0.9rem',
                  fontSize: '0.9rem',
                  color: '#f8f6f1',
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer'
                }}
              >
                <option value="">All categories</option>
                {availableCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#9a9db5',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Low stock only
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#9a9db5',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
                <input
                  type="checkbox"
                  checked={showDeactivated}
                  onChange={e => setShowDeactivated(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Show deactivated
              </label>
              <button onClick={() => setBulkImportOpen(true)} style={{
                background: 'transparent',
                color: '#c9a84c',
                border: '1px solid rgba(201,168,76,0.4)',
                borderRadius: '8px',
                padding: '0.7rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap'
              }}>
                Bulk import
              </button>
              <button onClick={openCreateFlyout} style={primaryBtn}>
                + Add part
              </button>
            </div>

            <div style={{
              background: '#16213e',
              border: '1px solid rgba(154,157,181,0.15)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="parts-table" style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.88rem'
                }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Part number</th>
                      <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Name</th>
                      <th style={{ textAlign: 'right', padding: '0.85rem 1rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Stock</th>
                      <th style={{ textAlign: 'right', padding: '0.85rem 1rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cost</th>
                      <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9a9db5' }}>
                          No parts match your filters
                        </td>
                      </tr>
                    ) : (
                      filteredParts.map(p => {
                        const isOut = p.quantity_on_hand === 0
                        const isLow = !isOut && p.quantity_on_hand <= p.reorder_point
                        const stockColor = isOut ? '#e06c75' : isLow ? '#e8c97a' : '#f8f6f1'
                        const isDeactivated = !p.is_active
                        const baseTextColor = isDeactivated ? '#6a6d85' : '#f8f6f1'
                        const mutedTextColor = isDeactivated ? '#4a4d65' : '#9a9db5'
                        return (
                          <tr
                            key={p.id}
                            onClick={() => openEditFlyout(p)}
                            style={{
                              borderTop: '1px solid rgba(154,157,181,0.1)',
                              cursor: 'pointer',
                              opacity: isDeactivated ? 0.6 : 1
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: baseTextColor }}>
                              {p.part_number}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: baseTextColor }}>
                              {p.name}
                              {isDeactivated && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.65rem',
                                  color: '#9a9db5',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  background: 'rgba(154,157,181,0.15)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700
                                }}>
                                  Deactivated
                                </span>
                              )}
                              {isOut && !isDeactivated && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.65rem',
                                  color: '#e06c75',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  background: 'rgba(224,108,117,0.18)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700
                                }}>
                                  Out
                                </span>
                              )}
                              {isLow && !isOut && !isDeactivated && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.65rem',
                                  color: '#f5c518',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  background: 'rgba(245,197,24,0.18)',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  fontWeight: 700
                                }}>
                                  Low
                                </span>
                              )}
                              {p.category && !isDeactivated && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.7rem',
                                  color: '#6a6d85',
                                  letterSpacing: '0.05em'
                                }}>
                                  {p.category}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <span style={{ fontWeight: 600, color: isDeactivated ? '#6a6d85' : stockColor }}>{p.quantity_on_hand}</span>
                              <span style={{ color: mutedTextColor }}> / {p.reorder_point}</span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: baseTextColor }}>
                              ${(p.unit_cost || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', color: mutedTextColor, fontSize: '0.85rem' }}>
                              {p.supplier_name || '-'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(154,157,181,0.1)',
                background: 'rgba(255,255,255,0.02)',
                color: '#9a9db5',
                fontSize: '0.8rem'
              }}>
                Showing {filteredParts.length} of {parts.length} {parts.length === 1 ? 'part' : 'parts'}
              </div>
            </div>
          </>
        )}
      </div>

      {flyoutOpen && (
        <PartFlyout
          mode={flyoutMode}
          part={flyoutPart}
          organizationId={profile.organization_id}
          onClose={closeFlyout}
          onSaved={handleSaved}
        />
      )}

      {bulkImportOpen && (
        <BulkImportModal
          organizationId={profile.organization_id}
          onClose={() => setBulkImportOpen(false)}
          onImported={handleBulkImported}
        />
      )}
      </div>
    </div>
  )
}