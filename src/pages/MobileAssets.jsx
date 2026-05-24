import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MobileBottomNav from '../components/MobileBottomNav'

export default function MobileAssets({ profile }) {
  const navigate = useNavigate()
  const [assets, setAssets] = useState([])
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [assetRes, orgRes] = await Promise.all([
      supabase.from('assets').select('*').order('name'),
      supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    ])
    setAssets(assetRes.data || [])
    setOrganization(orgRes.data || null)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  const isPro = organization?.is_upgraded === true

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets
    const q = searchQuery.toLowerCase()
    return assets.filter(a =>
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q)) ||
      (a.category && a.category.toLowerCase().includes(q)) ||
      (a.function && a.function.toLowerCase().includes(q))
    )
  }, [searchQuery, assets])

  const topBar = (
    <nav style={{
      background: 'rgba(26,26,46,0.95)',
      borderBottom: '1px solid rgba(201,168,76,0.18)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span style={{
        fontFamily: 'Georgia, serif',
        color: '#c9a84c',
        fontSize: '1.1rem',
        fontWeight: '600'
      }}>
        The Toolsmith CMMS
      </span>
      <button
        onClick={handleSignOut}
        style={{
          background: 'none',
          border: '1px solid rgba(201,168,76,0.25)',
          color: '#9a9db5',
          padding: '0.35rem 0.8rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        Sign Out
      </button>
    </nav>
  )

  if (!loading && !isPro) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#1a1a2e',
        fontFamily: 'Inter, sans-serif',
        color: '#f8f6f1',
        paddingBottom: '90px'
      }}>
        {topBar}
        <div style={{ padding: '2rem 1rem' }}>
          <div style={{
            background: 'rgba(201,168,76,0.05)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '12px',
            padding: '2rem 1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem', fontSize: '1.4rem'
            }}>🔒</div>
            <h2 style={{ color: '#f8f6f1', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Unlock Asset Management
            </h2>
            <p style={{ color: '#9a9db5', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Track assets, attach work orders, and manage custom fields. Available on the Pro plan.
            </p>
            <button
              onClick={() => navigate('/upgrade')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.85rem',
                fontWeight: '700',
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
        <MobileBottomNav />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      fontFamily: 'Inter, sans-serif',
      color: '#f8f6f1',
      paddingBottom: '90px'
    }}>
      {topBar}

      <div style={{ padding: '1.25rem 1rem' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            fontWeight: '500',
            marginBottom: '0.3rem'
          }}>
            Asset Registry
          </p>
          <h1 style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '1.3rem',
            fontWeight: '400',
            color: '#f8f6f1'
          }}>
            All Assets
          </h1>
        </div>

        {/* ADD ASSET BUTTON */}
        <button
          onClick={() => navigate('/m/assets/new')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '0.85rem',
            fontSize: '0.85rem',
            fontWeight: '700',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '1rem'
          }}
        >
          + Add Asset
        </button>

        {/* SEARCH */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search assets..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '0.75rem 0.9rem',
            color: '#f8f6f1',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
            marginBottom: '1.25rem'
          }}
        />

        {/* LIST */}
        {loading ? (
          <p style={{ color: '#9a9db5', textAlign: 'center', padding: '2rem' }}>Loading assets...</p>
        ) : filteredAssets.length === 0 ? (
          <div style={{
            background: '#1e2245',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: '#9a9db5',
            fontSize: '0.9rem',
            lineHeight: 1.6
          }}>
            {searchQuery ? `No assets match "${searchQuery}"` : 'No assets yet. Tap + Add Asset to get started.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                onClick={() => navigate(`/m/assets/${asset.id}`)}
                style={{
                  background: '#1e2245',
                  border: '1px solid rgba(201,168,76,0.18)',
                  borderRadius: '10px',
                  padding: '0.9rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}
              >
                {asset.photo_url ? (
                  <img
                    src={asset.photo_url}
                    alt={asset.name}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid rgba(201,168,76,0.18)',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '8px',
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0
                  }}>🔧</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.98rem',
                    fontWeight: '600',
                    color: '#f8f6f1',
                    marginBottom: '0.2rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {asset.name}
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#9a9db5',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {asset.location || 'No location'}{asset.category ? ` · ${asset.category}` : ''}
                  </p>
                </div>
                <span style={{ color: '#c9a84c', fontSize: '1.2rem', flexShrink: 0 }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  )
}