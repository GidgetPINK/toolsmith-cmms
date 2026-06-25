import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ALLOWED_ORIGINS = [
  'https://thetoolsmithapp.com',
  'https://www.thetoolsmithapp.com',
  'https://toolsmith-cmms.app'
]

const PRIORITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  standard: 'Standard',
  routine: 'Routine'
}

const PRIORITY_COLORS = {
  critical: '#e06c75',
  high: '#e8c97a',
  standard: '#9a9db5',
  routine: '#6a6d85'
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
    // Authenticate the caller
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

    // Read body
    const { work_order_id } = req.body || {}
    if (!work_order_id) {
      return res.status(400).json({ error: 'work_order_id is required' })
    }

    // Fetch the work order
    const { data: wo, error: woError } = await supabaseAdmin
      .from('work_orders')
      .select('id, title, priority, status, assigned_to, organization_id, due_date')
      .eq('id', work_order_id)
      .single()

    if (woError || !wo) {
      return res.status(404).json({ error: 'Work order not found' })
    }

    // No assignee, no email
    if (!wo.assigned_to) {
      return res.status(200).json({ sent: false, reason: 'no_assignee' })
    }

    // Don't email the person who made the change
    if (wo.assigned_to === callerId) {
      return res.status(200).json({ sent: false, reason: 'self_assignment' })
    }

    // Verify caller is in the same org as the work order
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', callerId)
      .single()
    if (!callerProfile || callerProfile.organization_id !== wo.organization_id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Fetch the assignee's profile and email
    const { data: assigneeProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, organization_id')
      .eq('id', wo.assigned_to)
      .single()

    if (!assigneeProfile || assigneeProfile.organization_id !== wo.organization_id) {
      return res.status(403).json({ error: 'Assignee not in same org' })
    }

    // Get assignee's auth email
    const { data: assigneeAuth } = await supabaseAdmin.auth.admin.getUserById(wo.assigned_to)
    const assigneeEmail = assigneeAuth?.user?.email
    if (!assigneeEmail) {
      return res.status(200).json({ sent: false, reason: 'no_email' })
    }

    const isCritical = wo.priority === 'critical'
    const priorityLabel = PRIORITY_LABELS[wo.priority] || wo.priority
    const priorityColor = PRIORITY_COLORS[wo.priority] || '#9a9db5'

    const subject = isCritical
      ? `[CRITICAL] Work order assigned: ${wo.title}`
      : `New work order assigned: ${wo.title}`

    const workOrderUrl = 'https://toolsmith-cmms.app/work-order/' + wo.id

    const dueText = wo.due_date
      ? new Date(wo.due_date).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : null

    const greeting = assigneeProfile.full_name
      ? `Hi ${assigneeProfile.full_name.split(' ')[0]},`
      : 'Hi,'

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
        <p style="margin: 0 0 16px; font-size: 15px;">${greeting}</p>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
          You've been assigned a new work order in The Toolsmith CMMS.
        </p>
        <div style="background: #f8f6f1; border-left: 4px solid ${priorityColor}; border-radius: 6px; padding: 16px 18px; margin: 0 0 20px;">
          <div style="display: inline-block; padding: 3px 10px; border-radius: 12px; border: 1px solid ${priorityColor}; color: ${priorityColor}; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;">
            ${priorityLabel}
          </div>
          <div style="font-size: 17px; font-weight: 600; color: #1a1a2e; margin: 0 0 8px;">
            ${escapeHtml(wo.title)}
          </div>
          ${dueText ? `<div style="font-size: 13px; color: #6a6d85;">Due ${dueText}</div>` : ''}
        </div>
        <p style="margin: 0 0 24px;">
          <a href="${workOrderUrl}" style="display: inline-block; background: #c9a84c; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.04em;">
            Open work order
          </a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #9a9db5; line-height: 1.5;">
          You received this email because you were assigned to a work order in The Toolsmith CMMS.
        </p>
      </div>
    `.trim()

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Toolsmith <noreply@thetoolsmithapp.com>',
        to: [assigneeEmail],
        subject,
        html
      })
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend error:', errorText)
      return res.status(500).json({ error: 'Email send failed' })
    }

    return res.status(200).json({ sent: true })
  } catch (err) {
    console.error('send-assignment-notification error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
