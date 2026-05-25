import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileBottomNav from '../components/MobileBottomNav'

const CATEGORIES = ['Mechanical', 'Electrical', 'HVAC', 'Plumbing', 'Vehicle', 'Safety', 'Other']
const CRITICALITY_LEVELS = ['Low', 'Standard', 'High', 'Critical']

const PRIORITY_COLOR = {
  critical: '#e06c75',
  high: '#e8c97a',
  standard: '#9a9db5',
  routine: '#6a6d85'
}

const STATUS_COLOR = {
  open: '#c9a84c',
  'in progress': '#6cb6e0',
  closed: '#6a6d85'
}

const mobileInputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.18)',
  borderRadius: '8px',
  padding: '0.85rem 0.95rem',
  color: '#f8f6f1',
  fontSize: '0.95rem',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box'
}

const mobileLabelStyle = {
  display: 'block',
  color: '#9a9db5',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '0.45rem',
  fontWeight: '500'
}

export default function MobileAssetDetail({ profile }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const isCreating = !id || id === 'new'

  const [tab, setTab] = useState('details')
  const [loading, setLoading] = useState(!isCreating)
  const [organizationId, setOrganizationId] = useState(profile?.organization_id || null)

  // Form state
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [criticality, setCriticality] = useState('Standard')
  const [functionText, setFunctionText] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [installDate, setInstallDate] = useState('')
  const [customFieldValues, setCustomFieldValues] = useState({})
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState(null)

  // Photo state
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  // Action state
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Reference data
  const [customFieldDefs, setCustomFieldDefs] = useState([])
  const [workOrders, setWorkOrders] = useState([])
  const [profiles, setProfiles] = useState([])

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    setError(null)

    // Always fetch custom field definitions and profiles
    const [cfdRes, profRes] = await Promise.all([
      supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('display_order', { ascending: true }),
      supabase.from('profiles').select('*')
    ])
    setCustomFieldDefs(cfdRes.data || [])
    setProfiles(profRes.data || [])

    if (isCreating) {
      setLoading(false)
      return
    }

    // Fetch the asset
    const { data: assetData, error: assetErr } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single()

    if (assetErr) {
      setError(`Could not load asset: ${assetErr.message}`)
      setLoading(false)
      return
    }

    if (assetData) {
      setName(assetData.name || '')
      setLocation(assetData.location || '')
      setCategory(assetData.category || '')
      setCriticality(assetData.criticality || 'Standard')
      setFunctionText(assetData.function || '')
      setSerialNumber(assetData.serial_number || '')
      setManufacturer(assetData.manufacturer || '')
      setModel(assetData.model || '')
      setInstallDate(assetData.install_date || '')
      setCustomFieldValues(assetData.custom_fields || {})
      setPhotoPreview(assetData.photo_url || null)
      setOriginalPhotoUrl(assetData.photo_url || null)
      setOrganizationId(assetData.organization_id || profile?.organization_id || null)
    }

    // Fetch work orders for this asset
    const { data: woData } = await supabase
      .from('work_orders')
      .select('*')
      .eq('asset_id', id)
      .order('created_at', { ascending: false })
    setWorkOrders(woData || [])

    setLoading(false)
  }

  function updateCustomFieldValue(defId, value) {
    setCustomFieldValues(prev => ({ ...prev, [defId]: value }))
  }

  function validateRequiredCustomFields() {
    for (const def of customFieldDefs) {
      if (!def.is_required) continue
      const value = customFieldValues[def.id]
      if (def.field_type === 'checkbox') {
        if (value === undefined || value === null) {
          return `${def.field_name} is required`
        }
      } else {
        if (value === undefined || value === null || value === '') {
          return `${def.field_name} is required`
        }
      }
    }
    return null
  }

  function renderCustomFieldInput(def) {
    const value = customFieldValues[def.id]

    if (def.field_type === 'text') {
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={mobileInputStyle}
        />
      )
    }

    if (def.field_type === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={mobileInputStyle}
        />
      )
    }

    if (def.field_type === 'date') {
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={mobileInputStyle}
        />
      )
    }

    if (def.field_type === 'dropdown') {
      return (
        <select
          value={value ?? ''}
          onChange={e => updateCustomFieldValue(def.id, e.target.value)}
          style={{ ...mobileInputStyle, cursor: 'pointer' }}
        >
          <option value="">Select</option>
          {(def.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (def.field_type === 'checkbox') {
      return (
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.7rem',
          color: '#f8f6f1', fontSize: '0.95rem', cursor: 'pointer',
          padding: '0.5rem 0'
        }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => updateCustomFieldValue(def.id, e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: '#c9a84c', cursor: 'pointer' }}
          />
          Yes
        </label>
      )
    }

    return null
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadPhoto() {
    if (!photoFile) return originalPhotoUrl
    setUploadingPhoto(true)
    const orgId = organizationId || profile?.organization_id
    const ext = photoFile.name.split('.').pop()
    const filename = `${orgId}/${Date.now()}.${ext}`
    const { data, error: uploadError } = await supabase.storage
      .from('asset-photos')
      .upload(filename, photoFile, { contentType: photoFile.type, upsert: false })
    setUploadingPhoto(false)
    if (uploadError) { setError(`Photo upload failed: ${uploadError.message}`); return null }
    const { data: urlData } = supabase.storage.from('asset-photos').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  async function handleSave(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Asset Name is required')
      return
    }

    const validationError = validateRequiredCustomFields()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    const photoUrl = await uploadPhoto()
    if (error) { setSubmitting(false); return }

    const orgId = organizationId || profile?.organization_id

    const payload = {
      name: name.trim(),
      location,
      category,
      criticality,
      function: functionText,
      serial_number: serialNumber,
      manufacturer,
      model,
      install_date: installDate || null,
      organization_id: orgId,
      photo_url: photoUrl,
      custom_fields: customFieldValues
    }

    let result
    if (isCreating) {
      result = await supabase.from('assets').insert(payload).select().single()
    } else {
      result = await supabase.from('assets').update(payload).eq('id', id)
    }

    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    navigate('/m/assets')
  }

  async function handleDelete() {
    if (isCreating) return
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return

    setDeleting(true)
    if (originalPhotoUrl) {
      const path = originalPhotoUrl.split('/asset-photos/')[1]
      if (path) await supabase.storage.from('asset-photos').remove([path])
    }
    const { error: delError } = await supabase.from('assets').delete().eq('id', id)
    if (delError) {
      setError(delError.message)
      setDeleting(false)
      return
    }
    setDeleting(false)
    navigate('/m/assets')
  }

  function getTechName(techId) {
    const tech = profiles.find(p => p.id === techId)
    return tech ? tech.full_name : 'Unassigned'
  }

  function handleCreateWorkOrderForAsset() {
    navigate(`/work-order/new?asset=${id}`)
  }

  const isSaving = submitting || uploadingPhoto

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      paddingBottom: '90px'
    }}>
      {/* TOP BAR */}
      <nav style={{
        background: 'rgba(26,26,46,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem'
      }}>
        <button
          onClick={() => navigate('/m/assets')}
          style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.3)',
            color: '#c9a84c',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0
          }}
        >
          ← Back
        </button>
        <span style={{
          fontFamily: 'Georgia, serif',
          color: '#f8f6f1',
          fontSize: '0.95rem',
          fontWeight: '600',
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {isCreating ? 'New Asset' : (loading ? 'Loading...' : name || 'Asset')}
        </span>
        <div style={{ width: '68px', flexShrink: 0 }} />
      </nav>

      {/* TABS — only show in edit mode */}
      {!isCreating && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(201,168,76,0.18)',
          background: '#16213e',
          position: 'sticky',
          top: '57px',
          zIndex: 30
        }}>
          {[
            { id: 'details', label: 'Details' },
            { id: 'history', label: 'Work Orders' },
            { id: 'pm', label: 'PM Schedule' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: tab === t.id ? '#c9a84c' : '#9a9db5',
                padding: '0.85rem 0.5rem',
                fontSize: '0.78rem',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                borderBottom: tab === t.id ? '2px solid #c9a84c' : '2px solid transparent',
                marginBottom: '-1px',
                letterSpacing: '0.04em'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* CONTENT */}
      <div style={{ padding: '1.25rem 1rem' }}>
        {loading ? (
          <p style={{ color: '#9a9db5', textAlign: 'center', padding: '2rem' }}>Loading...</p>
        ) : (
          <>
            {(isCreating || tab === 'details') && (
              <form onSubmit={handleSave}>
                {/* PHOTO */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={mobileLabelStyle}>Asset Photo</label>
                  {photoPreview ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={photoPreview}
                        alt="Asset"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid rgba(201,168,76,0.2)',
                          display: 'block'
                        }}
                      />
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: 'rgba(26,26,46,0.9)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            color: '#c9a84c',
                            borderRadius: '6px',
                            padding: '0.4rem 0.7rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={removePhoto}
                          style={{
                            background: 'rgba(224,108,117,0.18)',
                            border: '1px solid rgba(224,108,117,0.3)',
                            color: '#e06c75',
                            borderRadius: '6px',
                            padding: '0.4rem 0.7rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '1px dashed rgba(201,168,76,0.3)',
                        borderRadius: '8px',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'rgba(201,168,76,0.03)'
                      }}
                    >
                      <p style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>📷</p>
                      <p style={{ fontSize: '0.88rem', color: '#c9a84c', fontWeight: '500', marginBottom: '0.25rem' }}>
                        Tap to upload a photo
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#9a9db5' }}>JPG, PNG, or WebP, max 5MB</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </div>

                {/* FIELDS */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Asset Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Air Compressor Unit 1"
                    style={mobileInputStyle}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Building A"
                    style={mobileInputStyle}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ ...mobileInputStyle, cursor: 'pointer' }}
                  >
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Criticality</label>
                  <select
                    value={criticality}
                    onChange={e => setCriticality(e.target.value)}
                    style={{ ...mobileInputStyle, cursor: 'pointer' }}
                  >
                    {CRITICALITY_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Function</label>
                  <textarea
                    value={functionText}
                    onChange={e => setFunctionText(e.target.value)}
                    placeholder="Supplies compressed air to the production line..."
                    rows={3}
                    style={{ ...mobileInputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Manufacturer</label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={e => setManufacturer(e.target.value)}
                    placeholder="Ingersoll Rand"
                    style={mobileInputStyle}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="SSR-EP25"
                    style={mobileInputStyle}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={mobileLabelStyle}>Serial Number</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    placeholder="SN-12345"
                    style={mobileInputStyle}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={mobileLabelStyle}>Install Date</label>
                  <input
                    type="date"
                    value={installDate}
                    onChange={e => setInstallDate(e.target.value)}
                    style={mobileInputStyle}
                  />
                </div>

                {/* CUSTOM FIELDS */}
                {customFieldDefs && customFieldDefs.length > 0 && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.5rem 0 1.25rem' }} />
                    <p style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: '#c9a84c',
                      marginBottom: '1rem',
                      fontWeight: '500'
                    }}>
                      Custom Fields
                    </p>
                    {customFieldDefs.map(def => (
                      <div key={def.id} style={{ marginBottom: '1rem' }}>
                        <label style={mobileLabelStyle}>
                          {def.field_name}{def.is_required && ' *'}
                        </label>
                        {renderCustomFieldInput(def)}
                      </div>
                    ))}
                    <div style={{ height: '0.5rem' }} />
                  </>
                )}

                {error && (
                  <p style={{
                    color: '#e06c75',
                    fontSize: '0.88rem',
                    marginBottom: '1rem',
                    padding: '0.7rem 0.9rem',
                    background: 'rgba(224,108,117,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(224,108,117,0.2)',
                    lineHeight: 1.4
                  }}>
                    {error}
                  </p>
                )}

                {/* SAVE BUTTON */}
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.95rem',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: '0.75rem'
                  }}
                >
                  {uploadingPhoto ? 'Uploading photo...' : submitting ? 'Saving...' : isCreating ? 'Create Asset' : 'Save Changes'}
                </button>

                {/* DELETE BUTTON — edit mode only */}
                {!isCreating && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: '1px solid rgba(224,108,117,0.4)',
                      color: '#e06c75',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      fontSize: '0.85rem',
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      opacity: deleting ? 0.6 : 1,
                      marginBottom: '0.75rem'
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete Asset'}
                  </button>
                )}

                {/* CREATE WORK ORDER BUTTON — edit mode only */}
                {!isCreating && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(201,168,76,0.12)', margin: '0.5rem 0 0.75rem' }} />
                    <button
                      type="button"
                      onClick={handleCreateWorkOrderForAsset}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.3)',
                        color: '#c9a84c',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      + Create Work Order for This Asset
                    </button>
                  </>
                )}
              </form>
            )}

            {/* WORK ORDERS TAB */}
            {!isCreating && tab === 'history' && (
              <div>
                {workOrders.length === 0 ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed rgba(201,168,76,0.2)',
                    borderRadius: '10px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.9rem', color: '#9a9db5', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                      No work orders for this asset yet.
                    </p>
                    <button
                      onClick={handleCreateWorkOrderForAsset}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.3)',
                        color: '#c9a84c',
                        borderRadius: '8px',
                        padding: '0.7rem 1.25rem',
                        fontSize: '0.82rem',
                        fontWeight: '500',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif'
                      }}
                    >
                      + Create First Work Order
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {workOrders.map(wo => (
                      <div
                        key={wo.id}
                        onClick={() => navigate(`/work-order/${wo.id}`)}
                        style={{
                          background: '#1e2245',
                          border: '1px solid rgba(201,168,76,0.18)',
                          borderRadius: '10px',
                          padding: '0.95rem 1rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.18rem 0.55rem',
                            borderRadius: '20px',
                            fontSize: '0.62rem',
                            fontWeight: '700',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: PRIORITY_COLOR[wo.priority] || '#9a9db5',
                            border: `1px solid ${PRIORITY_COLOR[wo.priority] || '#9a9db5'}`
                          }}>
                            {wo.priority}
                          </span>
                          <span style={{
                            padding: '0.18rem 0.55rem',
                            borderRadius: '20px',
                            fontSize: '0.62rem',
                            letterSpacing: '0.08em',
                            textTransform: 'capitalize',
                            color: STATUS_COLOR[wo.status] || '#9a9db5',
                            border: `1px solid ${STATUS_COLOR[wo.status] || '#9a9db5'}`
                          }}>
                            {wo.status}
                          </span>
                        </div>
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.3rem', color: '#f8f6f1' }}>
                          {wo.title}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: '#9a9db5' }}>
                          {getTechName(wo.assigned_to)} · {new Date(wo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    <button
                      onClick={handleCreateWorkOrderForAsset}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(201,168,76,0.25)',
                        color: '#c9a84c',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        marginTop: '0.25rem'
                      }}
                    >
                      + Create Work Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PM SCHEDULE TAB */}
            {!isCreating && tab === 'pm' && (
              <div style={{
                background: 'rgba(201,168,76,0.04)',
                border: '1px dashed rgba(201,168,76,0.2)',
                borderRadius: '10px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.5 }}>🗓️</p>
                <p style={{ fontSize: '0.95rem', color: '#f8f6f1', fontWeight: '500', marginBottom: '0.5rem' }}>
                  PM Scheduling Coming Soon
                </p>
                <p style={{ fontSize: '0.82rem', color: '#9a9db5', lineHeight: 1.55 }}>
                  Once PM scheduling launches, this tab will let you create recurring maintenance tasks for this asset.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  )
}