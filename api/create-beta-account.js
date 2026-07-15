import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getRequestIdentifier } from './_rate-limit.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit: 5 beta signups per hour per IP
  const rateLimit = checkRateLimit(getRequestIdentifier(req), 'create-beta-account', 5, 60 * 60_000)
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' })
  }

  const { email, password, fullName, orgName, betaCode } = req.body

  if (!email || !password || !fullName || !orgName) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  // Gate: the beta code must match the server-side secret.
  // This blocks random signups from anyone who guesses the /register?code= URL.
  const expectedCode = process.env.BETA_ACCESS_CODE
  if (!expectedCode || betaCode !== expectedCode) {
    return res.status(403).json({ error: 'Invalid or missing beta code.' })
  }

  try {
    // Step 1 — create auth user via admin API (guarantees password compatibility)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return res.status(400).json({ error: 'An account with this email already exists.' })
      }
      throw authError
    }

    const userId = authData.user.id

    // Step 2 — create organization flagged as beta and already set up.
    // is_beta = true    → App.jsx skips the payment and subscription gates
    // setup_complete = true → no "complete your setup" redirect
    // is_upgraded = false   → this is a Lite beta, not Pro
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        is_upgraded: false,
        is_beta: true,
        setup_complete: true
      })
      .select()
      .single()

    if (orgError) throw orgError

    // Step 3 — create manager profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName,
        role: 'manager',
        organization_id: orgData.id,
        is_active: true
      })

    if (profileError) throw profileError

    return res.status(200).json({
      success: true,
      userId,
      organizationId: orgData.id,
      email
    })

  } catch (error) {
    console.error('Create beta account error:', error)
    return res.status(500).json({ error: error.message })
  }
}
