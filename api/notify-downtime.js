import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

    // Validate input
    const { downtime_event_id } = req.body || {}
    if (!downtime_event_id) {
      return res.status(400).json({ error: 'downtime_event_id is required' })
    }

    // Fetch the downtime event with related data
    const { data: event, error: eventError } = await supabaseAdmin
      .from('downtime_events')
      .select(`
        id,
        organization_id,
        started_at,
        downtime_type,
        reason,
        start_notes,
        created_by,
        assets:asset_id ( id, name, location ),
        work_orders:work_order_id ( id, title )
      `)
      .eq('id', downtime_event_id)
      .single()

    if (eventError || !event) {
      return res.status(404).json({ error: 'Downtime event not found' })
    }

    // Verify caller belongs to the same org
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', callerId)
      .single()

    if (!callerProfile || callerProfile.organization_id !== event.organization_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Only send alerts for unplanned downtime
    if (event.downtime_type !== 'unplanned') {
      return res.status(200).json({ message: 'Planned downtime, no alert sent' })
    }

    // Get the org name
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', event.organization_id)
      .single()

    const orgName = orgData?.name || 'your organization'

    // Get the person who logged the downtime
    const { data: loggerProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', event.created_by)
      .single()

    const loggerName = loggerProfile?.full_name || 'A team member'

    // Find all active managers in the org
    const { data: managers, error: managersError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', event.organization_id)
      .eq('role', 'manager')
      .eq('is_active', true)

    if (managersError || !managers || managers.length === 0) {
      console.error('No active managers found:', managersError)
      return res.status(200).json({ message: 'No managers to notify' })
    }

    // Get email addresses for the managers
    const managerEmails = []
    for (const m of managers) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(m.id)
      if (user?.email) {
        managerEmails.push({ email: user.email, name: m.full_name })
      }
    }

    if (managerEmails.length === 0) {
      return res.status(200).json({ message: 'No manager emails found' })
    }

    // Format the time
    const startedAt = new Date(event.started_at)
    const timeStr = startedAt.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const assetName = event.assets?.name || 'Unknown asset'
    const assetLocation = event.assets?.location || ''
    const workOrderInfo = event.work_orders?.title || null
    const appUrl = 'https://toolsmith-cmms.vercel.app'

    // Send email to each manager
    const emailPromises = managerEmails.map(m =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'The Toolsmith Alerts <orders@thetoolsmithapp.com>',
          to: [m.email],
          subject: `ALERT: ${assetName} is down`,
          html: buildAlertEmail({
            managerName: m.name,
            assetName,
            assetLocation,
            loggerName,
            timeStr,
            reason: event.reason,
            notes: event.start_notes,
            workOrderInfo,
            orgName,
            appUrl
          })
        })
      })
    )

    const results = await Promise.allSettled(emailPromises)
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length

    return res.status(200).json({
      success: true,
      managersNotified: successCount,
      totalManagers: managerEmails.length
    })
  } catch (err) {
    console.error('Notification error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function buildAlertEmail({ managerName, assetName, assetLocation, loggerName, timeStr, reason, notes, workOrderInfo, orgName, appUrl }) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1A1A2E;padding:32px 40px;text-align:center;">
      <img src="https://thetoolsmithapp.com/logo.png" alt="The Toolsmith" style="width:80px;height:auto;display:inline-block;margin-bottom:8px;" />
      <h1 style="color:#C9A84C;font-size:20px;margin:8px 0 0 0;font-family:Georgia,serif;">The Toolsmith CMMS</h1>
      <p style="color:#9A9DB5;font-size:12px;margin:6px 0 0;">${orgName}</p>
    </div>

    <div style="background:#e06c75;padding:16px 40px;text-align:center;">
      <p style="color:#ffffff;font-size:14px;font-weight:bold;margin:0;letter-spacing:0.06em;text-transform:uppercase;">⚠ Unplanned Downtime Alert</p>
    </div>

    <div style="padding:32px 40px;">
      <h2 style="color:#1A1A2E;font-size:22px;margin:0 0 8px;font-family:Georgia,serif;">${assetName} is down</h2>
      ${assetLocation ? `<p style="color:#666;font-size:14px;margin:0 0 24px;">${assetLocation}</p>` : ''}

      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${managerName ? `Hey ${managerName},` : 'Hi there,'}
      </p>

      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${loggerName} just logged an unplanned downtime event on <strong>${assetName}</strong>. Quick details below.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:10px 14px;background:#1E2245;color:#C9A84C;font-weight:bold;width:35%;font-size:13px;letter-spacing:0.04em;">Started</td>
          <td style="padding:10px 14px;background:#F8F6F1;color:#1A1A2E;font-size:14px;">${timeStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#16213E;color:#C9A84C;font-weight:bold;font-size:13px;letter-spacing:0.04em;">Reason</td>
          <td style="padding:10px 14px;background:#FFFFFF;color:#1A1A2E;font-size:14px;">${reason}</td>
        </tr>
        ${workOrderInfo ? `
        <tr>
          <td style="padding:10px 14px;background:#1E2245;color:#C9A84C;font-weight:bold;font-size:13px;letter-spacing:0.04em;">Work Order</td>
          <td style="padding:10px 14px;background:#F8F6F1;color:#1A1A2E;font-size:14px;">${workOrderInfo}</td>
        </tr>` : ''}
        ${notes ? `
        <tr>
          <td style="padding:10px 14px;background:#16213E;color:#C9A84C;font-weight:bold;font-size:13px;letter-spacing:0.04em;vertical-align:top;">Notes</td>
          <td style="padding:10px 14px;background:#FFFFFF;color:#1A1A2E;font-size:14px;line-height:1.6;">${notes}</td>
        </tr>` : ''}
      </table>

      <div style="text-align:center;margin:0 0 24px;">
        <a href="${appUrl}" style="display:inline-block;background:#C9A84C;color:#1A1A2E;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;">Open Dashboard</a>
      </div>

      <p style="color:#888;font-size:13px;line-height:1.6;margin:24px 0 0;">
        You're receiving this because you're an active manager in ${orgName}.
      </p>
    </div>

    <div style="background:#1A1A2E;padding:16px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:11px;margin:0;">The Toolsmith CMMS &nbsp;|&nbsp; thetoolsmithapp.com</p>
    </div>
  </div>
</body>
</html>`
}