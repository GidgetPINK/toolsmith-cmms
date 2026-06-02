import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Team({ profile }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('technician')
  const [invitePassword, setInvitePassword] = useState('')
  const [showInvitePassword, setShowInvitePassword] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name')
    setMembers(data || [])
    setLoading(false)
  }

  async function handleCreateMember(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    if (invitePassword.length < 8) {
      setError('Password must be at least 8 characters.')
      setSubmitting(false)
      return
    }

    const { data, error } = await supabase.rpc('create_team_member', {
      member_email: inviteEmail,
      member_password: invitePassword,
      member_name: inviteName,
      member_role: inviteRole,
      member_org_id: profile.organization_id
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess(inviteName + ' has been added to your team.')
    setInviteEmail('')
    setInviteName('')
    setInvitePassword('')
    setInviteRole('technician')
    fetchMembers()
    setSubmitting(false)
  }

  async function handleRoleChange(memberId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId)

    if (error) {
      setError(error.message)
    } else {
      fetchMembers()
    }
  }

  async function handleToggleActive(memberId, currentStatus) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', memberId)

    if (error) {
      setError(error.message)
    } else {
      fetchMembers()
    }
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

  const passwordInputStyle = {
    ...inputStyle,
    padding: '0.8rem 3rem 0.8rem 1rem'
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

  const showBtnStyle = {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9a9db5',
    fontSize: '0.78rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: 'Inter, sans-serif',
    padding: '0'
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

      <div style={{ padding: '2.5rem 5%', maxWidth: '780px', margin: '0 auto' }}>

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
            Team Management
          </p>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            Your Team
          </h1>
        </div>

        {/* CURRENT MEMBERS */}
        <div style={{
          background: '#1e2245',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '2.5rem'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(201,168,76,0.18)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#f8f6f1'
            }}>
              Members
            </h2>
            <span style={{
              fontSize: '0.78rem',
              color: '#9a9db5',
              letterSpacing: '0.06em'
            }}>
              {members.length} {members.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          {loading ? (
            <p style={{ color: '#9a9db5', padding: '1.5rem' }}>
              Loading team...
            </p>
          ) : (
            members.map((member, index) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.1rem 1.5rem',
                  borderBottom: index < members.length - 1
                    ? '1px solid rgba(201,168,76,0.08)'
                    : 'none',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  opacity: member.is_active ? 1 : 0.5
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: member.is_active
                      ? member.role === 'manager'
                        ? 'rgba(201,168,76,0.15)'
                        : 'rgba(154,157,181,0.15)'
                      : 'rgba(100,100,100,0.15)',
                    border: '1px solid ' + (member.is_active
                      ? member.role === 'manager'
                        ? 'rgba(201,168,76,0.4)'
                        : 'rgba(154,157,181,0.3)'
                      : 'rgba(100,100,100,0.3)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: member.is_active
                      ? member.role === 'manager' ? '#c9a84c' : '#9a9db5'
                      : '#666',
                    flexShrink: 0
                  }}>
                    {member.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{
                      fontWeight: '500',
                      fontSize: '0.95rem',
                      color: member.is_active ? '#f8f6f1' : '#666',
                      marginBottom: '0.15rem'
                    }}>
                      {member.full_name}
                      {member.id === profile.id && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.7rem',
                          color: '#9a9db5',
                          fontWeight: '400'
                        }}>
                          (you)
                        </span>
                      )}
                      {!member.is_active && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.7rem',
                          color: '#e06c75',
                          fontWeight: '400'
                        }}>
                          Disabled
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  {member.is_active && (
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.id, e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(201,168,76,0.18)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        color: '#f8f6f1',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        outline: 'none'
                      }}
                    >
                      <option value="technician">Technician</option>
                      <option value="manager">Manager</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleToggleActive(member.id, member.is_active)}
                    style={{
                      background: 'none',
                      border: '1px solid ' + (member.is_active
                        ? 'rgba(224,108,117,0.4)'
                        : 'rgba(152,195,121,0.4)'),
                      color: member.is_active ? '#e06c75' : '#98c379',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {member.is_active ? 'Disable' : 'Re-enable'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ADD MEMBER FORM */}
        <div style={{
          background: '#1e2245',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(201,168,76,0.18)'
          }}>
            <h2 style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#f8f6f1'
            }}>
              Add Team Member
            </h2>
          </div>

          <form
            onSubmit={handleCreateMember}
            autoComplete="off"
            style={{ padding: '1.5rem' }}
          >
            <input
              type="text"
              name="prevent-autofill"
              style={{ display: 'none' }}
              readOnly
            />
            <input
              type="password"
              name="prevent-autofill-pw"
              style={{ display: 'none' }}
              readOnly
            />

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  name="member-fullname"
                  autoComplete="new-password"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="text"
                  name="member-email"
                  autoComplete="new-password"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  placeholder="jane@company.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label style={labelStyle}>Temporary Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    name="member-password"
                    autoComplete="new-password"
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    required
                    placeholder="Min 8 characters"
                    style={passwordInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword(!showInvitePassword)}
                    style={showBtnStyle}
                  >
                    {showInvitePassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="technician">Technician</option>
                  <option value="manager">Manager</option>
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

            {success && (
              <p style={{
                color: '#98c379',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(152,195,121,0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(152,195,121,0.2)'
              }}>
                {success}
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
                padding: '0.9rem 2rem',
                fontSize: '0.9rem',
                fontWeight: '700',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {submitting ? 'Adding...' : 'Add Team Member'}
            </button>
          </form>
        </div>

        <p style={{
          color: '#9a9db5',
          fontSize: '0.8rem',
          marginTop: '1rem',
          lineHeight: '1.6'
        }}>
          New members will use the temporary password you set here to log in
          for the first time. Let them know their credentials directly — they
          can update their password after signing in.
        </p>

      </div>
    </div>
  )
}