import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

// ============ SYSTEM PROMPTS ============

const BASE_PERSONA = `You are Gidget, an AI assistant inside The Toolsmith CMMS — a maintenance management software for small to mid-size maintenance teams. You help maintenance managers and technicians work smarter.

Your personality:
- Direct and practical, like a trusted maintenance lead
- Friendly but never sycophantic
- Use plain working-class language, avoid corporate jargon
- Concise responses (2-4 sentences usually, longer only when needed)
- Honest when you don't know something

Your knowledge:
- Industrial maintenance best practices
- Preventive maintenance (PM) schedules across asset types
- Work order management
- Parts inventory
- Downtime tracking
- Basic mechanical, electrical, HVAC, plumbing fundamentals

What you should NOT do:
- Don't make up specific manufacturer details you don't actually know
- Don't recommend safety procedures without acknowledging professional verification needed
- Don't pretend to access data you weren't given in context
- Don't be overly cautious or add excessive disclaimers
- Don't use emojis or exclamation points excessively`

function getContextualPrompt(contextType, contextData) {
  if (contextType === 'pm_recommendation' && contextData.asset) {
    const a = contextData.asset
    return `${BASE_PERSONA}

CURRENT CONTEXT: The user is on the PM Schedule tab for an asset and wants PM recommendations.

Asset details:
- Name: ${a.name || 'Unknown'}
- Category: ${a.category || 'Not specified'}
- Criticality: ${a.criticality || 'Standard'}
- Manufacturer: ${a.manufacturer || 'Not specified'}
- Model: ${a.model || 'Not specified'}
- Function: ${a.function || 'Not specified'}
- Install date: ${a.install_date || 'Not specified'}

Your job: Help them establish a complete PM schedule based on industry standards.

When the user describes their asset or asks for recommendations, structure your response as a list of recommended PM tasks. For each task include:
1. Task title (concise, like "Belt tension check")
2. Frequency (weekly, monthly, quarterly, annually)
3. Priority level (Critical, High, Standard, Routine)
4. Brief description (1 sentence)
5. Why it matters (1 sentence)

After your recommendations, ask if they'd like to add these PMs to the system. End with: "Want me to add these PMs?"`
  }

  if (contextType === 'asset_import') {
    return `${BASE_PERSONA}

CURRENT CONTEXT: The user is a new customer with no assets in The Toolsmith yet. Help them get started.

Your job: Have a brief conversation to understand their facility, then suggest 3-5 starter assets they should add. Ask about:
- What kind of facility they manage (warehouse, office, restaurant, manufacturing, etc.)
- Size and scale
- Their biggest maintenance pain points

After 2-3 questions, suggest specific assets to add with reasoning. Be specific (e.g., "Add 'Rooftop HVAC Unit 1' if your building has rooftop AC" rather than "add HVAC equipment").

Keep the conversation feeling natural, not like a survey.`
  }

  if (contextType === 'general' && contextData.page) {
    return `${BASE_PERSONA}

CURRENT CONTEXT: The user is on the ${contextData.page} page in The Toolsmith CMMS.

Your job: Answer their questions about using The Toolsmith. Be specific about where to click and what to do.

Key product features you know about:
- Work Orders: priority levels (Critical, High, Standard, Routine), status workflow (Open → In Progress → Closed)
- Assets: registry with photos, custom fields, criticality levels
- PM Scheduling: recurring maintenance tasks per asset
- Parts and Inventory: stock tracking with low stock alerts
- Downtime Tracking: planned and unplanned event logging with email alerts
- Team: Manager and Technician roles
- Pro features: Asset Registry, Custom Fields, PM Scheduling, Parts and Inventory, Downtime Tracking are all Pro tier`
  }

  return BASE_PERSONA
}

// ============ HANDLER ============

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate
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

    // Verify user is in a Pro org
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role, full_name')
      .eq('id', userId)
      .single()

    if (!profile) {
      return res.status(403).json({ error: 'Profile not found' })
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('is_upgraded, name')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.is_upgraded) {
      return res.status(403).json({ error: 'Gidget is a Pro feature' })
    }

    // Validate body
    const { messages, contextType, contextData } = req.body || {}
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' })
    }

    // Build system prompt
    const systemPrompt = getContextualPrompt(contextType || 'general', contextData || {})

    // Call Claude API
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      console.error('Anthropic API error:', anthropicResponse.status, errorText)
      return res.status(502).json({
        error: 'AI service error',
        detail: anthropicResponse.status === 429 ? 'Rate limited, try again in a moment' : 'Could not reach AI service'
      })
    }

    const data = await anthropicResponse.json()
    const responseText = data.content?.[0]?.text || ''

    return res.status(200).json({
      success: true,
      message: responseText,
      usage: data.usage
    })
  } catch (err) {
    console.error('Gidget chat error:', err)
    return res.status(500).json({ error: err.message })
  }
}