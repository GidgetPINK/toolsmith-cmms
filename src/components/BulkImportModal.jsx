import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'

const COLUMNS = [
  'part_number',
  'name',
  'description',
  'category',
  'quantity_on_hand',
  'reorder_point',
  'unit_of_measure',
  'unit_cost',
  'supplier_name',
  'supplier_part_number',
  'supplier_url',
  'notes'
]

const VALID_CATEGORIES = ['Mechanical', 'Electrical', 'HVAC', 'Plumbing', 'Vehicle', 'Safety', 'Other']
const VALID_UNITS = ['each', 'box', 'case', 'foot', 'gallon', 'pound', 'liter', 'meter']

const EXAMPLE_ROWS = [
  ['BRG-6204-2RS', 'Sealed ball bearing', '6204 series', 'Mechanical', '24', '10', 'each', '8.50', 'McMaster', 'M-6204', 'https://mcmaster.com/6204', ''],
  ['FILT-HVAC-20', '20x25x1 pleated filter', 'MERV 8', 'HVAC', '12', '4', 'each', '14.99', 'Grainger', 'G-F20', '', 'Standard filter for AHU units'],
  ['BELT-V-A42', 'V-belt A-section 42 inch', '', 'Mechanical', '6', '2', 'each', '22.40', '', '', '', '']
]

export default function BulkImportModal({ organizationId, onClose, onImported }) {
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('download')
  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [existingPartNumbers, setExistingPartNumbers] = useState(new Set())
  const [error, setError] = useState('')

  // ============ TEMPLATE DOWNLOAD ============
  function downloadTemplate() {
    const csv = Papa.unparse({
      fields: COLUMNS,
      data: EXAMPLE_ROWS
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'toolsmith-parts-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ============ FILE PARSING AND VALIDATION ============
  async function handleFileSelected(file) {
    if (!file) return

    setError('')
    setParsing(true)
    setFileName(file.name)
    setFileSize(file.size)

    // Fetch existing part numbers for duplicate detection
    const { data: existing, error: fetchError } = await supabase
      .from('parts')
      .select('part_number')
      .eq('organization_id', organizationId)

    if (fetchError) {
      setError('Could not check existing parts: ' + fetchError.message)
      setParsing(false)
      return
    }

    const existingSet = new Set((existing || []).map(p => p.part_number.toLowerCase()))
    setExistingPartNumbers(existingSet)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row, idx) => {
          return validateRow(row, idx + 2, existingSet, results.data)
        })
        setParsedRows(rows)
        setParsing(false)
        setActiveTab('review')
      },
      error: (err) => {
        setError('Could not parse file: ' + err.message)
        setParsing(false)
      }
    })
  }

  function validateRow(row, lineNumber, existingSet, allRows) {
    const errors = []

    const partNumber = (row.part_number || '').trim()
    const name = (row.name || '').trim()

    if (!partNumber) {
      errors.push('Part number is required')
    } else if (partNumber.length > 50) {
      errors.push('Part number exceeds 50 characters')
    }

    if (!name) {
      errors.push('Name is required')
    } else if (name.length > 100) {
      errors.push('Name exceeds 100 characters')
    }

    if (partNumber && existingSet.has(partNumber.toLowerCase())) {
      errors.push('Part number already exists in database')
    }

    if (partNumber) {
      const duplicatesInFile = allRows.filter(r => 
        (r.part_number || '').trim().toLowerCase() === partNumber.toLowerCase()
      )
      if (duplicatesInFile.length > 1) {
        errors.push('Duplicate part number in file')
      }
    }

    const qty = parseInt(row.quantity_on_hand)
    if (row.quantity_on_hand && (isNaN(qty) || qty < 0)) {
      errors.push('Stock must be a non-negative number')
    }

    const reorder = parseInt(row.reorder_point)
    if (row.reorder_point && (isNaN(reorder) || reorder < 0)) {
      errors.push('Reorder point must be a non-negative number')
    }

    const cost = parseFloat(row.unit_cost)
    if (row.unit_cost && (isNaN(cost) || cost < 0)) {
      errors.push('Unit cost must be a non-negative number')
    }

    if (row.category && !VALID_CATEGORIES.includes(row.category.trim())) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    if (row.unit_of_measure && !VALID_UNITS.includes(row.unit_of_measure.trim())) {
      errors.push(`Unit must be one of: ${VALID_UNITS.join(', ')}`)
    }

    if (row.supplier_url && row.supplier_url.trim()) {
      try {
        new URL(row.supplier_url.trim())
      } catch {
        errors.push('Supplier URL is not a valid URL')
      }
    }

    return {
      lineNumber,
      raw: row,
      partNumber,
      name,
      quantity_on_hand: isNaN(qty) ? 0 : qty,
      reorder_point: isNaN(reorder) ? 0 : reorder,
      unit_cost: isNaN(cost) ? 0 : cost,
      errors,
      isValid: errors.length === 0
    }
  }

  // ============ BATCH IMPORT ============
  async function handleImport() {
    setError('')
    setImporting(true)

    const validRows = parsedRows.filter(r => r.isValid)
    const payload = validRows.map(r => ({
      organization_id: organizationId,
      part_number: r.partNumber,
      name: r.name,
      description: (r.raw.description || '').trim() || null,
      category: (r.raw.category || '').trim() || null,
      quantity_on_hand: r.quantity_on_hand,
      reorder_point: r.reorder_point,
      unit_of_measure: (r.raw.unit_of_measure || '').trim() || 'each',
      unit_cost: r.unit_cost,
      supplier_name: (r.raw.supplier_name || '').trim() || null,
      supplier_part_number: (r.raw.supplier_part_number || '').trim() || null,
      supplier_url: (r.raw.supplier_url || '').trim() || null,
      notes: (r.raw.notes || '').trim() || null
    }))

    const { error: insertError } = await supabase
      .from('parts')
      .insert(payload)

    setImporting(false)

    if (insertError) {
      setError('Import failed: ' + insertError.message)
      return
    }

    if (onImported) onImported(validRows.length)
    onClose()
  }

  // ============ ERROR REPORT DOWNLOAD ============
  function downloadErrorReport() {
    const errorRows = parsedRows.filter(r => !r.isValid)
    if (errorRows.length === 0) return

    const reportData = errorRows.map(r => ({
      ...r.raw,
      error_reason: r.errors.join('; ')
    }))

    const csv = Papa.unparse(reportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'toolsmith-import-errors.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ============ COMPUTED ============
  const validCount = parsedRows.filter(r => r.isValid).length
  const errorCount = parsedRows.length - validCount

  // ============ STYLES ============
  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 150,
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
    maxWidth: '720px',
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
    fontSize: '1.35rem',
    fontWeight: 600,
    margin: '0.35rem 0 0 0',
    color: '#f8f6f1'
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

  const tabsRow = {
    display: 'flex',
    gap: '0.25rem',
    borderBottom: '1px solid rgba(154,157,181,0.15)',
    marginBottom: '1.25rem',
    flexWrap: 'wrap'
  }

  function tabBtn(isActive, disabled) {
    return {
      background: 'transparent',
      border: 'none',
      borderBottom: isActive ? '2px solid #c9a84c' : '2px solid transparent',
      color: isActive ? '#f8f6f1' : disabled ? '#4a4d65' : '#9a9db5',
      padding: '0.7rem 0.9rem',
      fontSize: '0.85rem',
      fontWeight: isActive ? 600 : 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'Inter, sans-serif',
      letterSpacing: '0.02em',
      marginBottom: '-1px'
    }
  }

  const body = {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0
  }

  const sectionText = {
    color: '#9a9db5',
    fontSize: '0.92rem',
    lineHeight: 1.6,
    margin: '0 0 1rem 0'
  }

  const primaryBtn = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '0.88rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const ghostBtn = {
    background: 'transparent',
    color: '#9a9db5',
    border: '1px solid rgba(154,157,181,0.3)',
    borderRadius: '8px',
    padding: '0.7rem 1.5rem',
    fontSize: '0.88rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const fileBox = {
    border: '2px dashed rgba(201,168,76,0.3)',
    borderRadius: '12px',
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    background: 'rgba(201,168,76,0.04)',
    cursor: 'pointer'
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={headerRow}>
          <div>
            <p style={eyebrow}>Bulk import</p>
            <h2 style={title}>Import parts from CSV</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        <div style={tabsRow}>
          <button
            onClick={() => setActiveTab('download')}
            style={tabBtn(activeTab === 'download', false)}
          >
            1. Download template
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={tabBtn(activeTab === 'upload', false)}
          >
            2. Upload file
          </button>
          <button
            onClick={() => parsedRows.length > 0 && setActiveTab('review')}
            disabled={parsedRows.length === 0}
            style={tabBtn(activeTab === 'review', parsedRows.length === 0)}
          >
            3. Review and import
          </button>
        </div>

        <div style={body}>
          {activeTab === 'download' && (
            <div>
              <p style={sectionText}>
                Download the CSV template, fill it in with your parts data using Excel, Google Sheets, or any spreadsheet tool, then save as CSV.
              </p>
              <p style={sectionText}>
                The template includes example rows to show the expected format. You can delete those rows and replace them with your data.
              </p>
              <p style={sectionText}>
                <strong style={{ color: '#f8f6f1' }}>Required columns:</strong> part_number, name<br />
                <strong style={{ color: '#f8f6f1' }}>Optional columns:</strong> description, category, quantity_on_hand, reorder_point, unit_of_measure, unit_cost, supplier_name, supplier_part_number, supplier_url, notes
              </p>
              <button onClick={downloadTemplate} style={primaryBtn}>
                Download template
              </button>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <p style={sectionText}>
                Upload your filled-in CSV file. We'll parse it in your browser and show you a preview before anything gets saved.
              </p>
              <div
                style={fileBox}
                onClick={() => fileInputRef.current?.click()}
              >
                <p style={{ color: '#c9a84c', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
                  {parsing ? 'Parsing...' : 'Choose CSV file'}
                </p>
                <p style={{ color: '#9a9db5', fontSize: '0.85rem', margin: 0 }}>
                  Click here to select a file from your computer
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={e => handleFileSelected(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              {fileName && (
                <p style={{ color: '#9a9db5', fontSize: '0.85rem', marginTop: '1rem' }}>
                  Selected: {fileName} ({Math.round(fileSize / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            <div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(154,157,181,0.15)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 500 }}>
                    {parsedRows.length} rows parsed from {fileName}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#9a9db5', fontSize: '0.78rem' }}>
                    {Math.round(fileSize / 1024)} KB · uploaded just now
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#9a9db5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Valid</p>
                    <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: '#98c379' }}>{validCount}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: '#9a9db5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Errors</p>
                    <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600, color: errorCount > 0 ? '#e06c75' : '#f8f6f1' }}>{errorCount}</p>
                  </div>
                </div>
              </div>

              <div style={{
                border: '1px solid rgba(154,157,181,0.15)',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#252850', zIndex: 1 }}>
                      <tr>
                        <th style={{ textAlign: 'center', padding: '0.6rem 0.4rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', width: '36px' }}></th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.6rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Part #</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.6rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Name</th>
                        <th style={{ textAlign: 'right', padding: '0.6rem 0.6rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Stock</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.6rem', color: '#9a9db5', fontWeight: 500, fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map(row => (
                        <tr
                          key={row.lineNumber}
                          style={{
                            borderTop: '1px solid rgba(154,157,181,0.1)',
                            background: row.isValid ? 'transparent' : 'rgba(224,108,117,0.08)'
                          }}
                        >
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                            <span style={{ color: row.isValid ? '#98c379' : '#e06c75', fontSize: '0.95rem' }}>
                              {row.isValid ? '✓' : '✗'}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                            {row.partNumber || <span style={{ color: '#6a6d85', fontStyle: 'italic' }}>missing</span>}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            {row.name || <span style={{ color: '#6a6d85', fontStyle: 'italic' }}>missing</span>}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right' }}>
                            {row.quantity_on_hand}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', color: row.isValid ? '#98c379' : '#e06c75', fontSize: '0.78rem' }}>
                            {row.isValid ? 'Ready to import' : row.errors[0]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {errorCount > 0 && (
                <p style={{ color: '#9a9db5', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  {errorCount} {errorCount === 1 ? 'row has' : 'rows have'} errors and will be skipped. Download the error report to fix them and re-upload.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: 'rgba(224,108,117,0.12)',
            border: '1px solid rgba(224,108,117,0.4)',
            borderLeft: '3px solid #e06c75',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginTop: '1rem',
            color: '#e06c75',
            fontSize: '0.85rem',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(154,157,181,0.15)',
          flexWrap: 'wrap'
        }}>
          {activeTab === 'review' && errorCount > 0 ? (
            <button onClick={downloadErrorReport} style={ghostBtn}>
              Download error report
            </button>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
            {activeTab === 'review' && validCount > 0 && (
              <button
                onClick={handleImport}
                style={{ ...primaryBtn, opacity: importing ? 0.6 : 1, cursor: importing ? 'wait' : 'pointer' }}
                disabled={importing}
              >
                {importing ? 'Importing...' : `Import ${validCount} valid ${validCount === 1 ? 'part' : 'parts'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}