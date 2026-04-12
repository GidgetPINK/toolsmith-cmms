import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Assets({ profile }) {
  const [organization, setOrganization] = useState(null)
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [orgRes, assetRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single(),
      supabase
        .from('assets')
        .select('*')
        .order('name')
    ])
    setOrganization(orgRes.data || null)
    setAssets(assetRes.data || [])
    setLoading(false)
  }

  async function handleAddAsset(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase
      .from('assets')
      .insert({
        name,
        location,
        category,
        organization_id: profile.organization_id
      })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setName('')
    setLocation('')
    setCategory('')
    setShowAddForm(false)
    fetchAll()
    setSubmitting(false)
  }

  async function handleDeleteAsset(id) {
    if (!confirm('Delete this asset? This cannot be undone.')) return
    await supabase.from('assets').delete().eq('id', id)
    fetchAll()
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.18)',
    borderRadius: '8px',
    padding: '0.8rem 1rem',
    color: '#f8f6f1',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    color: '#9a9db5',
    fontSize: '0.78rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '0.5rem',
    fontWeight: '500'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1'
    }}>

      {/* NAV */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 5%',
        background: 'rgba(26,26,46,0.95)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <span style={{
          fontFamily: 'Georgia, serif',
          color: '#c9a84c',
          fontSize: '1.3rem',
          fontWeight: '600'
        }}>
          The Toolsmith CMMS
        </span>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: '1px solid rgba(201,168,76,0.18)',
            color: '#9a9db5',
            padding: '0.4rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          Back
        </button>
      </nav>

      <div style={{ padding: '2.5rem 5%' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p style={{
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            marginBottom: '0.4rem',
            fontWeight: '500'
          }}>
            Asset Management
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            Assets
          </h1>
        </div>

        {loading ? (
          <p style={{ color: '#9a9db5' }}>Loading...</p>
        ) : !organization?.is_upgraded ? (

          /* UPGRADE PROMPT — LITE PLAN */
          <div style={{ maxWidth: '640px' }}>
            <div style={{
              background: '#1e2245',
              border: '1px solid rgba(201,168,76,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '1.5rem'
            }}>
              {/* BLURRED PREVIEW */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(201,168,76,0.18)',
                position: 'relative'
              }}>
                <p style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#c9a84c',
                  marginBottom: '1rem',
                  fontWeight: '500'
                }}>
                  Preview
                </p>
                <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
                  {[
                    { name: 'Air Compressor Unit 1', location: 'Building A', category: 'Mechanical' },
                    { name: 'HVAC Rooftop Unit 2', location: 'Building B', category: 'HVAC' },
                    { name: 'Conveyor Belt Line 3', location: 'Warehouse', category: 'Electrical' }
                  ].map((a, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.85rem 0',
                      borderBottom: i < 2 ? '1px solid rgba(201,168,76,0.08)' : 'none',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ fontWeight: '500', marginBottom: '0.2rem' }}>{a.name}</p>
                        <p style={{ fontSize: '0.82rem', color: '#9a9db5' }}>{a.location}</p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#c9a84c',
                        border: '1px solid rgba(201,168,76,0.3)',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '20px'
                      }}>
                        {a.category}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(26,26,46,0.6)',
                  borderRadius: '12px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>🔒</span>
                </div>
              </div>

              {/* UPGRADE CTA */}
              <div style={{ padding: '1.75rem' }}>
                <h2 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem'
                }}>
                  Asset Management is a Pro Feature
                </h2>
                <p style={{
                  color: '#9a9db5',
                  fontSize: '0.9rem',
                  lineHeight: '1.7',
                  marginBottom: '1.5rem'
                }}>
                  Upgrade to Pro to add, edit, and manage your full asset
                  registry. Attach spec sheets, set criticality levels, and
                  link assets directly to work orders and PM schedules.
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  marginBottom: '1.75rem'
                }}>
                  {[
                    'Full asset registry with search and filtering',
                    'Attach OEM spec sheets and documents',
                    'Set criticality — Critical, Important, Standard',
                    'Link assets to work orders and PM schedules',
                    'Asset health reports and cost tracking'
                  ].map((f, i) => (
                    <p key={i} style={{
                      fontSize: '0.87rem',
                      color: '#9a9db5',
                      display: 'flex',
                      gap: '0.6rem',
                      alignItems: 'flex-start'
                    }}>
                      <span style={{ color: '#c9a84c', flexShrink: 0 }}>✓</span>
                      {f}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/upgrade')}
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.9rem 2rem',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  Upgrade to Pro — $49/month
                </button>
                <p style={{
                  color: '#9a9db5',
                  fontSize: '0.78rem',
                  marginTop: '0.75rem'
                }}>
                  Cancel any time. No contracts.
                </p>
              </div>
            </div>
          </div>

        ) : (

          /* FULL ASSET MANAGEMENT — PRO PLAN */
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <p style={{ color: '#9a9db5', fontSize: '0.9rem' }}>
                {assets.length} {assets.length === 1 ? 'asset' : 'assets'} in your registry
              </p>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                  border: 'none',
                  color: '#1a1a2e',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {showAddForm ? 'Cancel' : '+ Add Asset'}
              </button>
            </div>

            {/* ADD ASSET FORM */}
            {showAddForm && (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '1.75rem',
                marginBottom: '1.75rem'
              }}>
                <h3 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem'
                }}>
                  New Asset
                </h3>
                <form onSubmit={handleAddAsset}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div>
                      <label style={labelStyle}>Asset Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="Air Compressor Unit 1"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Building A"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Select category</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Electrical">Electrical</option>
                        <option value="HVAC">HVAC</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Vehicle">Vehicle</option>
                        <option value="Safety">Safety</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <p style={{
                      color: '#e06c75',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: 'rgba(224,108,117,0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(224,108,117,0.2)'
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                      color: '#1a1a2e',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.75rem',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {submitting ? 'Saving...' : 'Save Asset'}
                  </button>
                </form>
              </div>
            )}

            {/* ASSET LIST */}
            {assets.length === 0 ? (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '3rem',
                textAlign: 'center',
                color: '#9a9db5'
              }}>
                No assets yet. Click Add Asset to get started.
              </div>
            ) : (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                {assets.map((asset, index) => (
                  <div
                    key={asset.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.1rem 1.5rem',
                      borderBottom: index < assets.length - 1
                        ? '1px solid rgba(201,168,76,0.08)'
                        : 'none',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <p style={{
                        fontWeight: '500',
                        fontSize: '0.95rem',
                        color: '#f8f6f1',
                        marginBottom: '0.2rem'
                      }}>
                        {asset.name}
                      </p>
                      <p style={{ fontSize: '0.82rem', color: '#9a9db5' }}>
                        {asset.location || 'No location set'}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      {asset.category && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#c9a84c',
                          border: '1px solid rgba(201,168,76,0.3)',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '20px'
                        }}>
                          {asset.category}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(224,108,117,0.3)',
                          color: '#e06c75',
                          borderRadius: '6px',
                          padding: '0.3rem 0.75rem',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}