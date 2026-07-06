import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'

export default function Admin({ profile }) {
  const navigate = useNavigate()
  const [isUpgraded, setIsUpgraded] = useState(false)
  const [organization, setOrganization] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!profile) return
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
    })
    fetchOrgStatus()
  }, [profile])

  async function fetchOrgStatus() {
    if (profile.role !== 'manager' || !profile.organization_id) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()
    setIsUpgraded(!!data?.is_upgraded)
    setOrganization(data || null)
    setLoading(false)
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in again')
        setPortalLoading(false)
        return
      }

      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Could not open billing portal')
        setPortalLoading(false)
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err)
      alert('Could not open billing portal. Please try again.')
      setPortalLoading(false)
    }
  }

  const isManager = profile?.role === 'manager'

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

  const sectionLabel = {
    fontSize: '0.75rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9A9DB5',
    margin: '1.5rem 0 0.75rem 0',
    fontWeight: 600
  }

  const settingRow = {
    background: '#16213E',
    border: '1px solid rgba(154,157,181,0.15)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'Inter, sans-serif',
    color: '#F8F6F1'
  }

  const settingTitle = {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#F8F6F1',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flexWrap: 'wrap'
  }

  const settingDesc = {
    color: '#9A9DB5',
    fontSize: '0.85rem',
    margin: '0.3rem 0 0 0',
    lineHeight: 1.4
  }

  const chevron = {
    color: '#C9A84C',
    fontSize: '1.5rem',
    flexShrink: 0,
    lineHeight: 1
  }

  const proBadge = {
    display: 'inline-block',
    background: 'rgba(201,168,76,0.2)',
    color: '#E8C97A',
    fontSize: '0.65rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
    fontWeight: 700
  }

  if (loading && isManager) {
    return (
      <div style={page}>
        <div style={container}>
          <p style={{ color: '#9A9DB5' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A2E' }}>
      <Sidebar profile={profile} organization={organization} />
      <div style={{ ...page, flex: 1, minWidth: 0, minHeight: 'auto' }}>
      <div style={container}>
        <h1 style={{...heading, textAlign: 'center', marginBottom: '0.5rem'}}>Admin</h1>
        <p style={{...subhead, textAlign: 'center'}}>
          Manage your account, your team, and how your assets are tracked.
        </p>

        <div style={sectionLabel}>Account</div>
        <div style={{
          ...settingRow,
          cursor: 'default',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '0.5rem',
          overflow: 'hidden',
          boxSizing: 'border-box',
          maxWidth: '100%'
        }}>
          <div>
            <h3 style={settingTitle}>{profile?.full_name || 'Unknown'}</h3>
            <p style={{ ...settingDesc, wordBreak: 'break-all' }}>{userEmail}</p>
          </div>
          <p style={{
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#c9a84c',
            margin: 0,
            fontWeight: '500'
          }}>
            {profile?.role === 'manager' ? 'Manager' : 'Technician'}
          </p>
        </div>
        <button
          style={settingRow}
          onClick={() => navigate('/change-password')}
        >
          <div style={{ flex: 1 }}>
            <h3 style={settingTitle}>Change Password</h3>
            <p style={settingDesc}>Update the password on your account</p>
          </div>
          <span style={chevron}>›</span>
        </button>

        {isManager && (
          <>
            <div style={sectionLabel}>Reports</div>
            <button
              style={settingRow}
              onClick={() => navigate('/reports')}
            >
              <div style={{ flex: 1 }}>
                <h3 style={settingTitle}>Work Order Reports</h3>
                <p style={settingDesc}>Export work order history for state surveyors and compliance audits</p>
              </div>
              <span style={chevron}>›</span>
            </button>

            <div style={sectionLabel}>Team</div>
            <button
              style={settingRow}
              onClick={() => navigate('/team')}
            >
              <div style={{ flex: 1 }}>
                <h3 style={settingTitle}>Team Management</h3>
                <p style={settingDesc}>Invite technicians, manage roles, deactivate accounts</p>
              </div>
              <span style={chevron}>›</span>
            </button>

            <div style={sectionLabel}>Billing</div>
            <button
              style={settingRow}
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              <div style={{ flex: 1 }}>
                <h3 style={settingTitle}>Manage Subscription</h3>
                <p style={settingDesc}>
                  {portalLoading
                    ? 'Opening Stripe portal...'
                    : 'Update payment method, view invoices, change plans, or cancel'}
                </p>
              </div>
              <span style={chevron}>›</span>
            </button>

            <div style={sectionLabel}>Inventory</div>
            <button
              style={settingRow}
              onClick={() => navigate(isUpgraded ? '/parts' : '/upgrade')}
            >
              <div style={{ flex: 1 }}>
                <h3 style={settingTitle}>
                  Parts and Inventory
                  {!isUpgraded && <span style={proBadge}>Pro</span>}
                </h3>
                <p style={settingDesc}>
                  {isUpgraded
                    ? 'Manage parts, track usage, monitor stock levels'
                    : 'Manage parts inventory. Available on the Pro plan.'}
                </p>
              </div>
              <span style={chevron}>›</span>
            </button>

            <div style={sectionLabel}>Asset Configuration</div>
            <button
              style={settingRow}
              onClick={() => navigate(isUpgraded ? '/admin/custom-fields' : '/upgrade')}
            >
              <div style={{ flex: 1 }}>
                <h3 style={settingTitle}>
                  Custom Asset Fields
                  {!isUpgraded && <span style={proBadge}>Pro</span>}
                </h3>
                <p style={settingDesc}>
                  {isUpgraded
                    ? 'Define fields specific to your operation'
                    : 'Define fields specific to your operation. Available on the Pro plan.'}
                </p>
              </div>
              <span style={chevron}>›</span>
            </button>
          </>
        )}
      </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}