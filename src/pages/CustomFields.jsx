import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox (Yes/No)' }
]

export default function CustomFields({ profile }) {
  const navigate = useNavigate()
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpgraded, setIsUpgraded] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('text')
  const [newOptions, setNewOptions] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('text')
  const [editOptions, setEditOptions] = useState('')
  const [editRequired, setEditRequired] = useState(false)

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  async function checkAccessAndLoad() {
    if (!profile) return
    if (profile.role !== 'manager') {
      navigate('/')
      return
    }
    const { data: org } = await supabase
      .from('organizations')
      .select('is_upgraded')
      .eq('id', profile.organization_id)
      .single()

    setIsUpgraded(!!org?.is_upgraded)

    if (!org?.is_upgraded) {
      setLoading(false)
      return
    }

    await fetchFields()
  }

  async function fetchFields() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('display_order', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setFields(data || [])
    }
    setLoading(false)
  }

  function resetAddForm() {
    setNewName('')
    setNewType('text')
    setNewOptions('')
    setNewRequired(false)
    setShowAddForm(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setError(null)

    if (!newName.trim()) {
      setError('Field name is required')
      return
    }

    const options = newType === 'dropdown'
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : []

    if (newType === 'dropdown' && options.length === 0) {
      setError('Dropdown needs at least one option (comma separated)')
      return
    }

    setSaving(true)
    const maxOrder = fields.reduce((m, f) => Math.max(m, f.display_order), -1)

    const { error } = await supabase
      .from('custom_field_definitions')
      .insert({
        organization_id: profile.organization_id,
        field_name: newName.trim(),
        field_type: newType,
        options,
        is_required: newRequired,
        display_order: maxOrder + 1
      })

    if (error) {
      setError(error.message)
    } else {
      resetAddForm()
      await fetchFields()
    }
    setSaving(false)
  }

  function startEdit(field) {
    setEditingId(field.id)
    setEditName(field.field_name)
    setEditType(field.field_type)
    setEditOptions((field.options || []).join(', '))
    setEditRequired(field.is_required)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function handleSaveEdit() {
    setError(null)
    if (!editName.trim()) {
      setError('Field name is required')
      return
    }

    const options = editType === 'dropdown'
      ? editOptions.split(',').map(o => o.trim()).filter(Boolean)
      : []

    if (editType === 'dropdown' && options.length === 0) {
      setError('Dropdown needs at least one option (comma separated)')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({
        field_name: editName.trim(),
        field_type: editType,
        options,
        is_required: editRequired
      })
      .eq('id', editingId)

    if (error) {
      setError(error.message)
    } else {
      setEditingId(null)
      await fetchFields()
    }
    setSaving(false)
  }

  async function handleDelete(field) {
    const confirmed = confirm(
      `Delete "${field.field_name}"? Existing values stay in the database but stop showing up on the asset detail view.`
    )
    if (!confirmed) return

    const { error } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', field.id)

    if (error) {
      setError(error.message)
    } else {
      await fetchFields()
    }
  }

  async function moveField(field, direction) {
    const index = fields.findIndex(f => f.id === field.id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === fields.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const swapField = fields[newIndex]
    const thisOrder = field.display_order
    const swapOrder = swapField.display_order

    await supabase
      .from('custom_field_definitions')
      .update({ display_order: swapOrder })
      .eq('id', field.id)

    await supabase
      .from('custom_field_definitions')
      .update({ display_order: thisOrder })
      .eq('id', swapField.id)

    await fetchFields()
  }

  // ============ STYLES ============
  const page = {
    minHeight: '100vh',
    background: '#1A1A2E',
    color: '#F8F6F1',
    fontFamily: 'Inter, sans-serif',
    padding: '2rem 1rem'
  }

  const container = {
    maxWidth: '720px',
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
    color: '#C9A84C',
    borderRadius: '6px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif'
  }

  const heading = {
    fontSize: '1.6rem',
    fontWeight: 600,
    margin: 0,
    color: '#F8F6F1'
  }

  const subhead = {
    color: '#9A9DB5',
    fontSize: '0.95rem',
    margin: '0 0 2rem 0',
    lineHeight: 1.5
  }

  const card = {
    background: '#16213E',
    border: '1px solid rgba(154,157,181,0.15)',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '0.75rem'
  }

  const fieldHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    flexWrap: 'wrap'
  }

  const fieldName = {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#F8F6F1',
    margin: 0
  }

  const fieldMeta = {
    color: '#9A9DB5',
    fontSize: '0.85rem',
    marginTop: '0.25rem'
  }

  const requiredPill = {
    display: 'inline-block',
    background: 'rgba(201,168,76,0.15)',
    color: '#E8C97A',
    fontSize: '0.7rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    marginLeft: '0.5rem'
  }

  const actionRow = {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  }

  const iconBtn = {
    background: 'none',
    border: '1px solid rgba(154,157,181,0.25)',
    color: '#9A9DB5',
    borderRadius: '6px',
    padding: '0.4rem 0.65rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    minWidth: '36px'
  }

  const dangerBtn = {
    ...iconBtn,
    color: '#e06c75',
    border: '1px solid rgba(224,108,117,0.35)'
  }

  const primaryBtn = {
    background: '#C9A84C',
    color: '#1A1A2E',
    border: 'none',
    borderRadius: '8px',
    padding: '0.9rem 1.5rem',
    fontSize: '0.85rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    width: '100%'
  }

  const ghostBtn = {
    background: 'none',
    color: '#9A9DB5',
    border: '1px solid rgba(154,157,181,0.3)',
    borderRadius: '8px',
    padding: '0.9rem 1.5rem',
    fontSize: '0.85rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    width: '100%'
  }

  const label = {
    display: 'block',
    fontSize: '0.78rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#9A9DB5',
    marginBottom: '0.4rem'
  }

  const input = {
    width: '100%',
    background: '#1A1A2E',
    border: '1px solid rgba(154,157,181,0.25)',
    color: '#F8F6F1',
    borderRadius: '8px',
    padding: '0.7rem 0.85rem',
    fontSize: '0.95rem',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  }

  const checkboxRow = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    color: '#F8F6F1',
    fontSize: '0.95rem',
    cursor: 'pointer'
  }

  const errorBox = {
    background: 'rgba(224,108,117,0.12)',
    border: '1px solid rgba(224,108,117,0.4)',
    color: '#e06c75',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    marginBottom: '1rem'
  }

  const upgradeBox = {
    background: '#16213E',
    border: '1px solid rgba(201,168,76,0.4)',
    borderRadius: '12px',
    padding: '2rem 1.5rem',
    textAlign: 'center'
  }

  // ============ RENDER ============
  if (loading) {
    return (
      <div style={page}>
        <div style={container}>
          <p style={{ color: '#9A9DB5' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isUpgraded) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={headerRow}>
            <button style={backBtn} onClick={() => navigate('/')}>← Back</button>
            <h1 style={heading}>Custom Asset Fields</h1>
          </div>
          <div style={{ height: '1rem' }} />
          <div style={upgradeBox}>
            <h2 style={{ color: '#E8C97A', fontSize: '1.3rem', margin: '0 0 0.75rem 0' }}>
              A Pro feature
            </h2>
            <p style={{ color: '#9A9DB5', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              Define fields your team actually needs. Track FDA registration numbers, sanitation zones,
              calibration dates, whatever your operation runs on. Available on the Pro plan.
            </p>
            <button style={primaryBtn} onClick={() => navigate('/upgrade')}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={headerRow}>
          <button style={backBtn} onClick={() => navigate('/')}>← Back</button>
          <h1 style={heading}>Custom Asset Fields</h1>
        </div>
        <p style={subhead}>
          Add fields specific to your operation. They'll appear on every asset's detail view alongside
          the standard fields. Reorder with the arrows. Deleted fields keep their values in the database
          but stop displaying.
        </p>

        {error && <div style={errorBox}>{error}</div>}

        {fields.length === 0 && !showAddForm && (
          <div style={{ ...card, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <p style={{ color: '#9A9DB5', margin: '0 0 1.5rem 0' }}>
              No custom fields yet. Add your first one below.
            </p>
          </div>
        )}

        {fields.map((field, index) => (
          <div key={field.id} style={card}>
            {editingId === field.id ? (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={label}>Field Name</label>
                  <input
                    style={input}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Serial Tag Color"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={label}>Type</label>
                  <select
                    style={input}
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                  >
                    {FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {editType === 'dropdown' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={label}>Options (comma separated)</label>
                    <input
                      style={input}
                      type="text"
                      value={editOptions}
                      onChange={(e) => setEditOptions(e.target.value)}
                      placeholder="Red, Yellow, Green"
                    />
                  </div>
                )}

                <label style={{ ...checkboxRow, marginBottom: '1.25rem' }}>
                  <input
                    type="checkbox"
                    checked={editRequired}
                    onChange={(e) => setEditRequired(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#C9A84C' }}
                  />
                  Required field
                </label>

                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button
                    style={primaryBtn}
                    onClick={handleSaveEdit}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button style={ghostBtn} onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={fieldHeader}>
                  <div style={{ flex: '1 1 200px' }}>
                    <h3 style={fieldName}>
                      {field.field_name}
                      {field.is_required && <span style={requiredPill}>Required</span>}
                    </h3>
                    <div style={fieldMeta}>
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                      {field.field_type === 'dropdown' && field.options?.length > 0 && (
                        <span> · {field.options.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div style={actionRow}>
                    <button
                      style={{ ...iconBtn, opacity: index === 0 ? 0.3 : 1 }}
                      onClick={() => moveField(field, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      style={{ ...iconBtn, opacity: index === fields.length - 1 ? 0.3 : 1 }}
                      onClick={() => moveField(field, 'down')}
                      disabled={index === fields.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button style={iconBtn} onClick={() => startEdit(field)}>Edit</button>
                    <button style={dangerBtn} onClick={() => handleDelete(field)}>Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAddForm ? (
          <div style={card}>
            <h3 style={{ ...fieldName, marginBottom: '1.25rem' }}>New Custom Field</h3>

            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={label}>Field Name</label>
                <input
                  style={input}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. FDA Registration Number"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={label}>Type</label>
                <select
                  style={input}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {newType === 'dropdown' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={label}>Options (comma separated)</label>
                  <input
                    style={input}
                    type="text"
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="Red, Yellow, Green"
                  />
                </div>
              )}

              <label style={{ ...checkboxRow, marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#C9A84C' }}
                />
                Required field
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <button
                  type="submit"
                  style={primaryBtn}
                  disabled={saving}
                >
                  {saving ? 'Adding...' : 'Add Field'}
                </button>
                <button
                  type="button"
                  style={ghostBtn}
                  onClick={resetAddForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            style={{ ...primaryBtn, marginTop: '0.5rem' }}
            onClick={() => setShowAddForm(true)}
          >
            + Add Custom Field
          </button>
        )}
      </div>
    </div>
  )
}