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

    const { type } = req.body || {}

    if (type === 'assignment') {
      return handleAssignment(req, res, callerId)
    } else if (type === 'chat') {
      return handleChat(req, res, callerId)
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "assignment" or "chat"' })
    }
  } catch (err) {
    console.error('send-notification error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ============================================================
// ASSIGNMENT NOTIFICATION
// ============================================================

async function handleAssignment(req, res, callerId) {
  const { work_order_id } = req.body || {}
  if (!work_order_id) {
    return res.status(400).json({ error: 'work_order_id is required' })
  }

  const { data: wo, error: woError } = await supabaseAdmin
    .from('work_orders')
    .select('id, title, priority, status, assigned_to, organization_id, due_date')
    .eq('id', work_order_id)
    .single()

  if (woError || !wo) {
    return res.status(404).json({ error: 'Work order not found' })
  }

  if (!wo.assigned_to) {
    return res.status(200).json({ sent: false, reason: 'no_assignee' })
  }

  if (wo.assigned_to === callerId) {
    return res.status(200).json({ sent: false, reason: 'self_assignment' })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('organization_id')
    .eq('id', callerId)
    .single()
  if (!callerProfile || callerProfile.organization_id !== wo.organization_id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { data: assigneeProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, organization_id')
    .eq('id', wo.assigned_to)
    .single()

  if (!assigneeProfile || assigneeProfile.organization_id !== wo.organization_id) {
    return res.status(403).json({ error: 'Assignee not in same org' })
  }

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

  // Use the assigner's browser timezone if provided, fall back to UTC
  const timezone = req.body?.timezone || 'UTC'
  const dueText = wo.due_date
    ? new Date(wo.due_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: timezone
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
    console.error('Resend error (assignment):', errorText)
    return res.status(500).json({ error: 'Email send failed' })
  }

  return res.status(200).json({ sent: true, type: 'assignment' })
}

// ============================================================
// CHAT NOTIFICATION
// ============================================================

async function handleChat(req, res, senderId) {
  const { message_id } = req.body || {}
  if (!message_id) {
    return res.status(400).json({ error: 'message_id is required' })
  }

  const { data: message, error: msgError } = await supabaseAdmin
    .from('work_order_messages')
    .select('id, work_order_id, sender_id, organization_id, created_at')
    .eq('id', message_id)
    .single()

  if (msgError || !message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  if (message.sender_id !== senderId) {
    return res.status(403).json({ error: 'Cannot notify for messages you did not send' })
  }

  const { data: wo } = await supabaseAdmin
    .from('work_orders')
    .select('id, title, assigned_to, organization_id')
    .eq('id', message.work_order_id)
    .single()

  if (!wo || wo.organization_id !== message.organization_id) {
    return res.status(404).json({ error: 'Work order not found' })
  }

  // Build potential recipients
  const recipientIds = new Set()

  if (wo.assigned_to && wo.assigned_to !== senderId) {
    recipientIds.add(wo.assigned_to)
  }

  const { data: chatHistory } = await supabaseAdmin
    .from('work_order_messages')
    .select('sender_id')
    .eq('work_order_id', wo.id)

  const senderIds = new Set((chatHistory || []).map(m => m.sender_id))
  senderIds.delete(senderId)

  if (senderIds.size > 0) {
    const { data: managerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .in('id', Array.from(senderIds))
      .eq('role', 'manager')
      .eq('organization_id', wo.organization_id)

    ;(managerProfiles || []).forEach(p => recipientIds.add(p.id))
  }

  if (recipientIds.size === 0) {
    return res.status(200).json({ sent: 0, reason: 'no_recipients' })
  }

  const recipientList = Array.from(recipientIds)

  // Check "caught up" status
  const { data: readRecords } = await supabaseAdmin
    .from('work_order_message_reads')
    .select('user_id, last_read_at')
    .eq('work_order_id', wo.id)
    .in('user_id', recipientList)

  const lastReadMap = {}
  ;(readRecords || []).forEach(r => {
    lastReadMap[r.user_id] = r.last_read_at
  })

  const { data: prevMessages } = await supabaseAdmin
    .from('work_order_messages')
    .select('created_at')
    .eq('work_order_id', wo.id)
    .lt('created_at', message.created_at)
    .order('created_at', { ascending: false })
    .limit(1)

  const previousLatest = prevMessages?.[0]?.created_at

  const recipientsToEmail = []
  for (const userId of recipientList) {
    if (!previousLatest) {
      recipientsToEmail.push(userId)
      continue
    }
    const lastRead = lastReadMap[userId]
    if (lastRead && new Date(lastRead) >= new Date(previousLatest)) {
      recipientsToEmail.push(userId)
    }
  }

  if (recipientsToEmail.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'all_have_unread' })
  }

  const emailsToSend = []
  for (const userId of recipientsToEmail) {
    const { data: userAuth } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userAuth?.user?.email
    if (email) {
      emailsToSend.push({ userId, email })
    }
  }

  if (emailsToSend.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'no_emails' })
  }

  const subject = `New message: ${wo.title}`
  const workOrderUrl = 'https://toolsmith-cmms.app/work-order/' + wo.id

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
        A work order you're involved with has a new message.
      </p>
      <div style="background: #f8f6f1; border-left: 4px solid #c9a84c; border-radius: 6px; padding: 16px 18px; margin: 0 0 20px;">
        <div style="font-size: 17px; font-weight: 600; color: #1a1a2e;">
          ${escapeHtml(wo.title)}
        </div>
      </div>
      <p style="margin: 0 0 24px;">
        <a href="${workOrderUrl}" style="display: inline-block; background: #c9a84c; color: #1a1a2e; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.04em;">
          Open work order
        </a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #9a9db5; line-height: 1.5;">
        You received this email because you're assigned to or have posted in this work order's chat. You'll only get one email until you've read the new messages.
      </p>
    </div>
  `.trim()

  const sendResults = await Promise.allSettled(
    emailsToSend.map(({ email }) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'The Toolsmith <noreply@thetoolsmithapp.com>',
          to: [email],
          subject,
          html
        })
      })
    )
  )

  const sentCount = sendResults.filter(r => r.status === 'fulfilled' && r.value.ok).length
  const failedCount = sendResults.length - sentCount

  if (failedCount > 0) {
    console.warn(`Chat notification: ${sentCount} sent, ${failedCount} failed`)
  }

  return res.status(200).json({ sent: sentCount, failed: failedCount, type: 'chat' })
}

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
