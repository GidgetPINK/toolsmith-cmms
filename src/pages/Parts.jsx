import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Parts({ profile }) {
  const navigate = useNavigate()
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return
    fetchParts()
  }, [profile])

  async function fetchParts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('part_number', { ascending: true })

    if (error) {
      console.error('Error fetching parts:', error)
    } else {
      setParts(data || [])
    }
    setLoading(false)
  }

  // ============ COMPUTED VALUES ============
  const totalParts = parts.length
  const lowStockCount = parts.filter(p => p.quantity_on_hand <= p.reorder_point && p.quantity_on_hand > 0).length
  const outOfStockCount = parts.filter(p => p.quantity_on_hand === 0).length
  const inventoryValue = parts.reduce((sum, p) => sum + (p.quantity_on_hand * (p.unit_cost || 0)), 0)

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
    <div style={page} className="parts-page">
      <style>{`
        @media (max-width: 768px) {
          .parts-page { padding: 1rem 1rem !important; }
          .parts-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
          .parts-stat-card { padding: 0.85rem 1rem !important; }
          .parts-stat-value { font-size: 1.35rem !important; }
          .parts-stat-label { font-size: 0.65rem !important; letter-spacing: 0.12em !important; }
          .parts-heading { font-size: 1.4rem !important; }
          .parts-empty-state { padding: 2.5rem 1.25rem !important; }
        }
      `}</style>
      <div style={container}>
        <div style={headerRow}>
          <button style={backBtn} onClick={() => navigate('/')}>← Back</button>
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
            <button style={primaryBtn}>+ Add part</button>
          </div>
        ) : (
          <div style={{ color: '#9a9db5', textAlign: 'center', padding: '2rem' }}>
            Parts table coming next
          </div>
        )}
      </div>
    </div>
  )
}