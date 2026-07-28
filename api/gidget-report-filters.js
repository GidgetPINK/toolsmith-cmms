import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from './_rate-limit.js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const STATUSES = ['open', 'in progress', 'completed', 'closed']
const PRIORITIES = ['critical', 'high', 'standard', 'routine']
const COMPLIANCE = ['Fire Safety', 'Emergency Systems', 'Water Safety', 'Structural', 'Sanitation', '__any__', '__none__']

function isValidDate(d) {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // --- Auth (same model as gidget-chat) ---
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authentication' })
    }
    const token = authHeader.split(' ')[1]
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid authentication' })
    }
    const userId = userData.user.id

    // --- Rate limit ---
    const limit = checkRateLimit(userId, 'gidget-report-filters', 15, 60_000)
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment.',
        retryAfter: Math.ceil(limit.resetIn / 1000)
      })
    }

    // --- Profile + Pro gate (org derived server-side, never from client) ---
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', userId)
      .single()
    if (!profile) {
      return res.status(403).json({ error: 'Profile not found' })
    }
    if (profile.role !== 'manager') {
      return res.status(403).json({ error: 'Reports are available to managers' })
    }

    const orgId = profile.organization_id

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('is_upgraded')
      .eq('id', orgId)
      .single()
    if (!org?.is_upgraded) {
      return res.status(403).json({ error: 'This is a Pro feature' })
    }

    // --- Validate input ---
    const { request } = req.body || {}
    if (typeof request !== 'string' || !request.trim()) {
      return res.status(400).json({ error: 'request text required' })
    }
    if (request.length > 500) {
      return res.status(400).json({ error: 'Request is too long' })
    }

    // --- Fetch ONLY this org's filter vocabulary (scoped to orgId) ---
    const [{ data: techs }, { data: assets }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name').eq('organization_id', orgId),
      supabaseAdmin.from('assets').select('id, name').eq('organization_id', orgId)
    ])
    const techList = (techs || []).map(t => ({ id: t.id, name: t.full_name }))
    const assetList = (assets || []).map(a => ({ id: a.id, name: a.name }))

    const today = new Date().toISOString().split('T')[0]

    const systemPrompt = `You translate a facilities manager's plain-language report request into report filter values. Today is ${today}.

Return ONLY a JSON object, no prose, with these optional keys. Omit any key you cannot map with confidence rather than guessing:
- dateFrom, dateTo: "YYYY-MM-DD". Resolve relative dates ("last quarter", "past 30 days") to concrete dates using today's date.
- filterStatus: one of ${JSON.stringify(STATUSES)}
- filterPriority: one of ${JSON.stringify(PRIORITIES)}
- filterTech: an id from the technician list below, matched by name
- filterAsset: an id from the asset list below, matched by name
- filterApartment: a string of letters/numbers only
- filterCompliance: one of ${JSON.stringify(COMPLIANCE)} ("__any__" = any compliance category, "__none__" = non-compliance work)
- summary: one plain-English sentence describing what you set, naming the resolved dates.

Only use tech and asset values from these exact lists. If the request names a tech or asset not in the list, omit that filter and note it in the summary.
Technicians: ${JSON.stringify(techList)}
Assets: ${JSON.stringify(assetList)}`

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: request.trim() }]
      })
    })

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', anthropicResponse.status)
      return res.status(502).json({ error: 'AI service error' })
    }

    const data = await anthropicResponse.json()
    let raw = (data.content?.[0]?.text || '').trim()
    raw = raw.replace(/^\`\`\`json\s*/i, '').replace(/\`\`\`$/,'').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return res.status(502).json({ error: 'Could not interpret that request. Try rephrasing.' })
    }

    // --- Validate EVERY value against allowed lists server-side ---
    const validTechIds = new Set(techList.map(t => t.id))
    const validAssetIds = new Set(assetList.map(a => a.id))

    const clean = {}
    if (isValidDate(parsed.dateFrom)) clean.dateFrom = parsed.dateFrom
    if (isValidDate(parsed.dateTo)) clean.dateTo = parsed.dateTo
    if (STATUSES.includes(parsed.filterStatus)) clean.filterStatus = parsed.filterStatus
    if (PRIORITIES.includes(parsed.filterPriority)) clean.filterPriority = parsed.filterPriority
    if (validTechIds.has(parsed.filterTech)) clean.filterTech = parsed.filterTech
    if (validAssetIds.has(parsed.filterAsset)) clean.filterAsset = parsed.filterAsset
    if (typeof parsed.filterApartment === 'string') {
      const apt = parsed.filterApartment.replace(/[^A-Za-z0-9]/g, '')
      if (apt) clean.filterApartment = apt
    }
    if (COMPLIANCE.includes(parsed.filterCompliance)) clean.filterCompliance = parsed.filterCompliance

    const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : 'Filters set. Review them below before running.'

    return res.status(200).json({ filters: clean, summary })

  } catch (err) {
    console.error('gidget-report-filters error:', err.message)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
