import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' }
]

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'standard', label: 'Standard' },
  { value: 'routine', label: 'Routine' }
]

const REPORTERS = ['Resident', 'Family Member', 'Staff', 'Other']

function statusBadge(status) {
  const map = {
    open: { bg: 'rgba(255,255,255,0.08)', color: '#9a9db5', label: 'Open' },
    'in progress': { bg: 'rgba(201,168,76,0.15)', color: '#c9a84c', label: 'In Progress' },
    completed: { bg: 'rgba(126,201,138,0.15)', color: '#7ec98a', label: 'Completed' },
    closed: { bg: 'rgba(108,182,224,0.15)', color: '#6cb6e0', label: 'Closed' }
  }
  return map[status] || { bg: 'rgba(255,255,255,0.08)', color: '#9a9db5', label: status }
}

function formatDateShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateForCsv(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function daysBetween(start, end) {
  if (!start || !end) return ''
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24))
  return diff
}

export default function Reports({ profile }) {
  const navigate = useNavigate()

  // Default date range: last 90 days
  const today = new Date()
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(today.getDate() - 90)

  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo.toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterTech, setFilterTech] = useState('')
  const [filterAsset, setFilterAsset] = useState('')
  const [filterApartment, setFilterApartment] = useState('')
  const [filterReporter, setFilterReporter] = useState('')
  const [filterCompliance, setFilterCompliance] = useState('')

  const [technicians, setTechnicians] = useState([])
  const [assets, setAssets] = useState([])
  const [orgName, setOrgName] = useState('')
  const [organization, setOrganization] = useState(null)

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.role !== 'manager') {
      navigate('/')
      return
    }
    fetchFilterOptions()
  }, [profile])

  useEffect(() => {
    if (profile?.role === 'manager') {
      runQuery()
    }
  }, [dateFrom, dateTo, filterStatus, filterPriority, filterTech, filterAsset, filterApartment, filterReporter, filterCompliance])

  async function fetchFilterOptions() {
    const [techRes, assetRes, orgRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('organization_id', profile.organization_id),
      supabase.from('assets').select('id, name').order('name'),
      supabase.from('organizations').select('name, is_upgraded').eq('id', profile.organization_id).single()
    ])
    setTechnicians(techRes.data || [])
    setAssets(assetRes.data || [])
    setOrgName(orgRes.data?.name || 'Your Organization')
    setOrganization(orgRes.data || null)
  }

  async function runQuery() {
    setLoading(true)
    setError('')

    let q = supabase
      .from('work_orders')
      .select(`
        id, title, description, priority, status, compliance_category,
        apartment_number, reporter,
        created_at, closed_at,
        assets:asset_id ( name ),
        assigned_profile:assigned_to ( full_name )
      `)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterPriority) q = q.eq('priority', filterPriority)
    if (filterTech) q = q.eq('assigned_to', filterTech)
    if (filterAsset) q = q.eq('asset_id', filterAsset)
    if (filterApartment) q = q.ilike('apartment_number', filterApartment.trim())
    if (filterReporter) q = q.eq('reporter', filterReporter)
    if (filterCompliance) {
      if (filterCompliance === '__any__') {
        q = q.not('compliance_category', 'is', null)
      } else if (filterCompliance === '__none__') {
        q = q.is('compliance_category', null)
      } else {
        q = q.eq('compliance_category', filterCompliance)
      }
    }

    const { data, error: qErr } = await q
    if (qErr) {
      setError('Could not load results: ' + qErr.message)
      setResults([])
    } else {
      setResults(data || [])
    }
    setLoading(false)
  }

  function buildRows() {
    return results.map(wo => ({
      Title: wo.title || '',
      Description: wo.description || '',
      Status: wo.status === 'in progress' ? 'In Progress' : ((wo.status?.charAt(0).toUpperCase() + wo.status?.slice(1)) || ''),
      Priority: wo.priority?.charAt(0).toUpperCase() + wo.priority?.slice(1) || '',
      Created: formatDateForCsv(wo.created_at),
      Closed: formatDateForCsv(wo.closed_at),
      'Days to Close': wo.closed_at ? daysBetween(wo.created_at, wo.closed_at) : '',
      'Assigned To': wo.assigned_profile?.full_name || '',
      Asset: wo.assets?.name || '',
      Apartment: wo.apartment_number || '',
      Compliance: wo.compliance_category || '',
      Reporter: wo.reporter || ''
    }))
  }

  function downloadCsv() {
    setExporting(true)
    try {
      const rows = buildRows()
      if (rows.length === 0) {
        alert('No results to export. Adjust your filters.')
        setExporting(false)
        return
      }
      const headers = Object.keys(rows[0])
      const escape = v => {
        const s = String(v ?? '')
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      }
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => escape(r[h])).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'work-order-report-' + dateFrom + '-to-' + dateTo + '.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Could not generate CSV: ' + err.message)
    }
    setExporting(false)
  }

  function downloadPdf() {
    setExporting(true)
    try {
      const rows = buildRows()
      if (rows.length === 0) {
        alert('No results to export. Adjust your filters.')
        setExporting(false)
        return
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })

      doc.setFontSize(18)
      doc.setTextColor(26, 26, 46)
      doc.text('Work Order Report', 40, 50)

      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text(orgName, 40, 70)

      doc.setFontSize(9)
      doc.text('Date range: ' + formatDateForCsv(dateFrom) + ' to ' + formatDateForCsv(dateTo), 40, 88)
      doc.text('Generated: ' + new Date().toLocaleString('en-US'), 40, 102)
      doc.text('Total work orders: ' + rows.length, 40, 116)

      // Filter summary line
      const filters = []
      if (filterStatus) filters.push('Status: ' + (filterStatus === 'in progress' ? 'In Progress' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)))
      if (filterPriority) filters.push('Priority: ' + filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1))
      if (filterTech) {
        const t = technicians.find(t => t.id === filterTech)
        if (t) filters.push('Assigned: ' + t.full_name)
      }
      if (filterAsset) {
        const a = assets.find(a => a.id === filterAsset)
        if (a) filters.push('Asset: ' + a.name)
      }
      if (filterApartment) filters.push('Apartment: ' + filterApartment)
      if (filterReporter) filters.push('Reporter: ' + filterReporter)
      if (filterCompliance) {
        if (filterCompliance === '__any__') filters.push('Compliance: any')
        else if (filterCompliance === '__none__') filters.push('Compliance: none')
        else filters.push('Compliance: ' + filterCompliance)
      }
      if (filters.length) {
        doc.text('Filters: ' + filters.join('  |  '), 40, 130)
      }

      autoTable(doc, {
        startY: filters.length ? 145 : 130,
        head: [['Created', 'Title', 'Status', 'Priority', 'Compliance', 'Apt', 'Reporter', 'Assigned To', 'Asset', 'Closed', 'Days']],
        body: rows.map(r => [
          r.Created,
          r.Title,
          r.Status,
          r.Priority,
          r.Compliance,
          r.Apartment,
          r.Reporter,
          r['Assigned To'],
          r.Asset,
          r.Closed,
          r['Days to Close'] === '' ? '' : String(r['Days to Close'])
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [201, 168, 76], textColor: [26, 26, 46], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 246, 241] },
        margin: { left: 40, right: 40 },
        columnStyles: {
          1: { cellWidth: 130 },
          7: { cellWidth: 90 }
        }
      })

      doc.save('work-order-report-' + dateFrom + '-to-' + dateTo + '.pdf')
    } catch (err) {
      alert('Could not generate PDF: ' + err.message)
    }
    setExporting(false)
  }

  // STYLES
  const page = { minHeight: '100vh', background: '#1A1A2E', color: '#F8F6F1', fontFamily: 'Inter, sans-serif', padding: '2rem 1rem' }
  const container = { maxWidth: '720px', margin: '0 auto' }
  const headerRow = { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }
  const backBtn = { background: 'none', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const eyebrow = { fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', margin: '1rem 0 0.5rem', fontWeight: 500 }
  const heading = { fontFamily: 'Georgia, serif', fontSize: '1.7rem', color: '#F8F6F1', margin: '0 0 0.3rem', fontWeight: 600 }
  const subhead = { color: '#9A9DB5', fontSize: '0.9rem', margin: '0 0 1.5rem' }
  const card = { background: 'rgba(22,33,62,0.5)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }
  const cardLabel = { fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 0.75rem', fontWeight: 500 }
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }
  const fieldLabel = { display: 'block', fontSize: '0.66rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9DB5', marginBottom: '0.3rem', fontWeight: 500 }
  const input = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '6px', padding: '0.5rem 0.7rem', color: '#F8F6F1', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', outline: 'none', colorScheme: 'dark' }
  const downloadRow = { display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }
  const csvBtn = { flex: 1, background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '0.85rem', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const pdfBtn = { flex: 1, background: 'transparent', color: '#c9a84c', border: '1px solid #c9a84c', borderRadius: '8px', padding: '0.85rem', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const previewRow = { background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '0.65rem 0.8rem', marginBottom: '0.4rem' }

  if (organization && !organization.is_upgraded) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A2E' }}>
        <Sidebar profile={profile} organization={organization} />
        <div style={{ flex: 1, minWidth: 0, minHeight: 'auto', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '640px', margin: '3rem auto' }}>
            <div style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              fontFamily: 'Inter, sans-serif'
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem', fontSize: '1.5rem'
              }}>🔒</div>
              <h2 style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.5rem',
                color: '#c9a84c',
                marginBottom: '0.75rem',
                fontWeight: 600
              }}>
                Reports are a Pro feature
              </h2>
              <p style={{
                color: '#f8f6f1',
                fontSize: '0.95rem',
                lineHeight: 1.7,
                marginBottom: '1.75rem',
                maxWidth: '440px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                Filter, export, and share work order history for state surveyors, compliance audits, and internal review. Available on the Pro plan.
              </p>
              <button
                onClick={() => navigate('/upgrade')}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  border: 'none',
                  color: '#1a1a2e',
                  padding: '0.85rem 2rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
        <MobileBottomNav profile={profile} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A2E' }}>
      <Sidebar profile={profile} organization={organization} />
      <div style={{ ...page, flex: 1, minWidth: 0, minHeight: 'auto' }}>
      <div style={container}>
        <p style={eyebrow}>Work Order Reports</p>
        <h1 style={heading}>Export work history</h1>
        <p style={subhead}>Filter your work orders and export to CSV or PDF for state surveyors, compliance audits, or internal review.</p>

        {/* FILTERS */}
        <div style={card}>
          <p style={cardLabel}>Filters</p>

          <div style={grid2}>
            <div>
              <label style={fieldLabel}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={input} />
            </div>
            <div>
              <label style={fieldLabel}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={input} />
            </div>
          </div>

          <div style={grid2}>
            <div>
              <label style={fieldLabel}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={input}>
                <option value="">All statuses</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Priority</label>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={input}>
                <option value="">All priorities</option>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div style={grid2}>
            <div>
              <label style={fieldLabel}>Assigned to</label>
              <select value={filterTech} onChange={e => setFilterTech(e.target.value)} style={input}>
                <option value="">All team members</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Asset</label>
              <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} style={input}>
                <option value="">All assets</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div style={grid2}>
            <div>
              <label style={fieldLabel}>Apartment</label>
              <input
                type="text"
                value={filterApartment}
                onChange={e => setFilterApartment(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                placeholder="Any apartment"
                style={input}
                maxLength={20}
              />
            </div>
            <div>
              <label style={fieldLabel}>Reporter</label>
              <select value={filterReporter} onChange={e => setFilterReporter(e.target.value)} style={input}>
                <option value="">All reporters</option>
                {REPORTERS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>
                <span style={{ color: '#c9a84c', marginRight: '4px' }}>⚑</span>
                Compliance
              </label>
              <select value={filterCompliance} onChange={e => setFilterCompliance(e.target.value)} style={input}>
                <option value="">All work orders</option>
                <option value="__any__">Compliance only (any category)</option>
                <option value="Fire Safety">Fire Safety</option>
                <option value="Emergency Systems">Emergency Systems</option>
                <option value="Water Safety">Water Safety</option>
                <option value="Structural">Structural</option>
                <option value="Sanitation">Sanitation</option>
                <option value="__none__">Non-compliance only</option>
              </select>
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <p style={{ ...cardLabel, margin: 0 }}>Preview</p>
            <span style={{ fontSize: '0.78rem', color: '#9A9DB5' }}>
              {loading ? 'Loading...' : results.length + ' ' + (results.length === 1 ? 'result' : 'results')}
            </span>
          </div>

          {error && (
            <p style={{ color: '#e06c75', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>{error}</p>
          )}

          {!loading && results.length === 0 && !error && (
            <p style={{ textAlign: 'center', color: '#6a6d85', fontSize: '0.85rem', padding: '1.5rem 0', margin: 0 }}>
              No work orders match these filters
            </p>
          )}

          {results.slice(0, 6).map(wo => {
            const badge = statusBadge(wo.status)
            return (
              <div key={wo.id} style={previewRow}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#F8F6F1', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wo.title}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: badge.color, background: badge.bg, padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#9A9DB5', margin: '0.2rem 0 0' }}>
                  {wo.apartment_number ? 'Apt ' + wo.apartment_number : 'No apartment'}
                  {' · '}{wo.reporter || 'No reporter'}
                  {' · '}{formatDateShort(wo.created_at)}
                </p>
              </div>
            )
          })}

          {results.length > 6 && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#6a6d85', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
              …and {results.length - 6} more
            </p>
          )}
        </div>

        {/* DOWNLOAD BUTTONS */}
        <div style={downloadRow}>
          <button
            style={{ ...csvBtn, opacity: exporting || results.length === 0 ? 0.5 : 1, cursor: exporting || results.length === 0 ? 'not-allowed' : 'pointer' }}
            onClick={downloadCsv}
            disabled={exporting || results.length === 0}
          >
            {exporting ? 'Working...' : 'Download CSV'}
          </button>
          <button
            style={{ ...pdfBtn, opacity: exporting || results.length === 0 ? 0.5 : 1, cursor: exporting || results.length === 0 ? 'not-allowed' : 'pointer' }}
            onClick={downloadPdf}
            disabled={exporting || results.length === 0}
          >
            {exporting ? 'Working...' : 'Download PDF'}
          </button>
        </div>
      </div>
      </div>
      <MobileBottomNav profile={profile} />
    </div>
  )
}
