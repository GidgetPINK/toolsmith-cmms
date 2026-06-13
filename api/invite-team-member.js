import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ALLOWED_ORIGINS = [
  'https://thetoolsmithapp.com',
  'https://www.thetoolsmithapp.com',
  'https://toolsmith-cmms.vercel.app'
]

function isValidEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Authenticate the caller (manager making the invitation)
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authentication' })
    }

    const token = authHeader.split(' ')[1]
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid authentication' })
    }

    const callerId = userData.user.id

    // Verify caller is an active manager
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id, is_active, full_name')
      .eq('id', callerId)
      .single()

    if (callerError || !callerProfile) {
      return res.status(404).json({ error: 'Manager profile not found' })
    }

    if (!callerProfile.is_active) {
      return res.status(403).json({ error: 'Your account is inactive' })
    }

    if (callerProfile.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can invite team members' })
    }

    // Validate input
    const { email, name, role } = req.body || {}

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'Name is too long' })
    }

    if (!role || !['manager', 'technician'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const orgId = callerProfile.organization_id

    // Get organization name for the email
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    const orgName = orgData?.name || 'your team'

    // Check if user already exists
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail)

    let userId

    if (existingUser) {
      userId = existingUser.id

      // Check if they already have a profile (already on a team)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, organization_id')
        .eq('id', userId)
        .maybeSingle()

      if (existingProfile) {
        if (existingProfile.organization_id === orgId) {
          return res.status(400).json({ error: 'This person is already on your team' })
        } else {
          return res.status(400).json({ error: 'This email is already associated with another organization' })
        }
      }
    } else {
      // Create new auth user with random password
      const tempPassword = generateRandomPassword()
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: cleanName }
      })

      if (createError) {
        console.error('Auth user creation failed:', createError)
        return res.status(500).json({ error: 'Could not create account: ' + createError.message })
      }

      userId = newUserData.user.id
    }

    // Create the profile linking the user to the org
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name: cleanName,
        role: role,
        organization_id: orgId,
        is_active: true
      })

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      return res.status(500).json({ error: 'Could not add team member: ' + profileError.message })
    }

    // Generate password reset link for the invitee
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: 'https://toolsmith-cmms.vercel.app/reset-password'
      }
    })

    if (linkError) {
      console.error('Link generation failed:', linkError)
      // Don't fail the whole request, user is created but won't get email
    }

    const resetLink = linkData?.properties?.action_link

    // Send invitation email via Resend
    if (resetLink) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'The Toolsmith <orders@thetoolsmithapp.com>',
            to: [cleanEmail],
            subject: `${callerProfile.full_name} invited you to ${orgName} on The Toolsmith`,
            html: buildInvitationEmail(cleanName, callerProfile.full_name, orgName, role, resetLink)
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('Invitation email failed:', errorData)
        }
      } catch (emailError) {
        console.error('Email send error:', emailError)
      }
    }

    return res.status(200).json({
      success: true,
      userId,
      email: cleanEmail,
      name: cleanName,
      role
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ error: 'Something went wrong: ' + err.message })
  }
}

function buildInvitationEmail(teamMemberName, managerName, orgName, role, resetLink) {
  const roleLabel = role === 'manager' ? 'a manager' : 'a technician'
  const appUrl = 'https://toolsmith-cmms.vercel.app'

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1A1A2E;padding:24px 40px;text-align:center;">
      <h1 style="color:#C9A84C;font-size:20px;margin:0;">The Toolsmith CMMS</h1>
      <p style="color:#9A9DB5;font-size:12px;margin:6px 0 0;">thetoolsmithapp.com</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1A1A2E;font-size:20px;margin:0 0 16px;">You're invited to join ${orgName}.</h2>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hey ${teamMemberName},
      </p>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
        ${managerName} added you to ${orgName} as ${roleLabel} on The Toolsmith CMMS. The Toolsmith helps maintenance teams track assets, schedule work, and stay on top of preventive maintenance.
      </p>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        To get started, click the button below to set your password and log in.
      </p>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="${resetLink}" style="display:inline-block;background:#C9A84C;color:#1A1A2E;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;">Set your password</a>
      </div>

      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 8px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 24px;word-break:break-all;">
        ${resetLink}
      </p>

      <div style="background:#F8F6F1;border-left:4px solid #C9A84C;padding:16px 20px;border-radius:0 8px 8px 0;">
        <p style="color:#1A1A2E;font-size:13px;margin:0;font-weight:bold;">A few things to know</p>
        <p style="color:#555;font-size:13px;margin:8px 0 0;line-height:1.6;">
          The link above expires in one hour for security. If it expires, ask ${managerName} to resend the invitation.
        </p>
      </div>

      <p style="color:#888;font-size:13px;line-height:1.6;margin:32px 0 0;">
        Questions? Reply to this email or reach out to ${managerName} directly.
      </p>
    </div>
    <div style="background:#1A1A2E;padding:16px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:11px;margin:0;">The Toolsmith CMMS &nbsp;|&nbsp; thetoolsmithapp.com</p>
    </div>
  </div>
</body>
</html>`
}