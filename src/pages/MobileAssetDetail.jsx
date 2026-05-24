import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileBottomNav from '../components/MobileBottomNav'

export default function MobileAssetDetail({ profile }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const isCreating = !id || id === 'new'

  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(!isCreating)
  const [tab, setTab] = useState('details')

  useEffect(() => {
    if (!isCreating && id) {
      fetchAsset()
    }
  }, [id])

  async function fetchAsset() {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single()
    setAsset(data)
    setLoading(false)
  }

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
          {isCreating ? 'New Asset' : (loading ? 'Loading...' : asset?.name || 'Asset')}
        </span>
        <div style={{ width: '68px', flexShrink: 0 }} />
      </nav>

      {/* TABS — only show on edit mode */}
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
        ) : isCreating ? (
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.4 }}>🔧</p>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8f6f1', marginBottom: '0.5rem' }}>
              Add Asset Form Coming Next
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9a9db5', lineHeight: 1.6 }}>
              The full mobile asset creation form ships in Phase C Batch 2 with custom fields support.
            </p>
          </div>
        ) : (
          <>
            {tab === 'details' && asset && (
              <div style={{
                background: '#1e2245',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                {asset.photo_url && (
                  <img
                    src={asset.photo_url}
                    alt={asset.name}
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}
                  />
                )}
                <h2 style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#f8f6f1',
                  marginBottom: '1.25rem'
                }}>
                  {asset.name}
                </h2>
                <DetailRow label="Location" value={asset.location} />
                <DetailRow label="Category" value={asset.category} />
                <DetailRow label="Criticality" value={asset.criticality} />
                <DetailRow label="Function" value={asset.function} />
                <DetailRow label="Manufacturer" value={asset.manufacturer} />
                <DetailRow label="Model" value={asset.model} />
                <DetailRow label="Serial Number" value={asset.serial_number} />
                <DetailRow label="Install Date" value={asset.install_date} />

                <div style={{
                  height: '1px',
                  background: 'rgba(201,168,76,0.12)',
                  margin: '1.25rem 0 1rem'
                }} />

                <p style={{ color: '#9a9db5', fontSize: '0.82rem', textAlign: 'center', lineHeight: 1.55 }}>
                  Editing, photo upload, and custom fields ship in Phase C Batch 2.
                </p>
              </div>
            )}
            {tab === 'history' && (
              <div style={{
                background: 'rgba(201,168,76,0.04)',
                border: '1px dashed rgba(201,168,76,0.2)',
                borderRadius: '10px',
                padding: '2rem 1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '0.9rem', color: '#9a9db5', lineHeight: 1.55 }}>
                  Work order history for this asset ships in Batch 2.
                </p>
              </div>
            )}
            {tab === 'pm' && (
              <div style={{
                background: 'rgba(201,168,76,0.04)',
                border: '1px dashed rgba(201,168,76,0.2)',
                borderRadius: '10px',
                padding: '2rem 1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.4 }}>🗓️</p>
                <p style={{ fontSize: '0.9rem', color: '#9a9db5', lineHeight: 1.55 }}>
                  PM scheduling launching soon.
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

function DetailRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <p style={{
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#9a9db5',
        marginBottom: '0.2rem',
        fontWeight: 500
      }}>
        {label}
      </p>
      <p style={{ fontSize: '0.9rem', color: '#f8f6f1' }}>{value}</p>
    </div>
  )
}