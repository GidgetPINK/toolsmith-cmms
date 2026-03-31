import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, fullName, orgName } = req.body

  if (!email || !password || !fullName || !orgName) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  try {
    // Step 1 — check if email already exists
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', (
        await supabase.auth.admin.listUsers()
      ).data?.users?.find(u => u.email === email)?.id || 'none')

    // Step 2 — create auth user via admin API
    // This guarantees password compatibility with Supabase auth
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

    // Step 3 — create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, is_upgraded: false })
      .select()
      .single()

    if (orgError) throw orgError

    // Step 4 — create manager profile
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
    console.error('Create account error:', error)
    return res.status(500).json({ error: error.message })
  }
}