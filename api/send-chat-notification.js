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
    const senderId = userData.user.id

    // Read body
    const { message_id } = req.body || {}
    if (!message_id) {
      return res.status(400).json({ error: 'message_id is required' })
    }

    // Fetch the new message
    const { data: message, error: msgError } = await supabaseAdmin
      .from('work_order_messages')
      .select('id, work_order_id, sender_id, organization_id, created_at')
      .eq('id', message_id)
      .single()

    if (msgError || !message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Caller must be the sender (only the sender can trigger notification for their own message)
    if (message.sender_id !== senderId) {
      return res.status(403).json({ error: 'Cannot notify for messages you did not send' })
    }

    // Fetch the work order
    const { data: wo } = await supabaseAdmin
      .from('work_orders')
      .select('id, title, assigned_to, organization_id')
      .eq('id', message.work_order_id)
      .single()

    if (!wo || wo.organization_id !== message.organization_id) {
      return res.status(404).json({ error: 'Work order not found' })
    }

    // Build the set of potential recipients (user IDs)
    // 1. The assigned tech (if any, and not the sender)
    // 2. Managers in the org who have ever posted in this chat (not the sender)
    const recipientIds = new Set()

    if (wo.assigned_to && wo.assigned_to !== senderId) {
      recipientIds.add(wo.assigned_to)
    }

    // Find managers who have posted in this chat
    const { data: chatHistory } = await supabaseAdmin
      .from('work_order_messages')
      .select('sender_id')
      .eq('work_order_id', wo.id)

    const senderIds = new Set((chatHistory || []).map(m => m.sender_id))
    senderIds.delete(senderId) // exclude current sender

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

    // For each recipient, check if they're "caught up" — meaning their last_read_at
    // is more recent than any previous message on this work order.
    // If they're caught up, this message is the start of a new unread streak. Send the email.
    // If they already have unread, skip.

    const recipientList = Array.from(recipientIds)

    const { data: readRecords } = await supabaseAdmin
      .from('work_order_message_reads')
      .select('user_id, last_read_at')
      .eq('work_order_id', wo.id)
      .in('user_id', recipientList)

    const lastReadMap = {}
    ;(readRecords || []).forEach(r => {
      lastReadMap[r.user_id] = r.last_read_at
    })

    // Get the latest message timestamp BEFORE the new one (i.e. excluding this message)
    const { data: prevMessages } = await supabaseAdmin
      .from('work_order_messages')
      .select('created_at')
      .eq('work_order_id', wo.id)
      .lt('created_at', message.created_at)
      .order('created_at', { ascending: false })
      .limit(1)

    const previousLatest = prevMessages?.[0]?.created_at
    // If there were no prior messages, this is the first message ever.
    // Everyone qualifies for the email.

    // Determine who actually gets emailed
    const recipientsToEmail = []
    for (const userId of recipientList) {
      if (!previousLatest) {
        // First message ever on this work order — everyone qualifies
        recipientsToEmail.push(userId)
        continue
      }
      const lastRead = lastReadMap[userId]
      // "Caught up" means last_read_at >= previousLatest message
      if (lastRead && new Date(lastRead) >= new Date(previousLatest)) {
        recipientsToEmail.push(userId)
      }
      // Otherwise they already have unread, skip
    }

    if (recipientsToEmail.length === 0) {
      return res.status(200).json({ sent: 0, reason: 'all_have_unread' })
    }

    // Look up email addresses for the qualifying recipients
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

    // Send emails in parallel
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

    return res.status(200).json({ sent: sentCount, failed: failedCount })
  } catch (err) {
    console.error('send-chat-notification error:', err)
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
