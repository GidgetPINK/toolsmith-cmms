import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_SHEETS_COPY_LINK = 'https://docs.google.com/spreadsheets/d/17uqQ92QHDnUpmn_vRFKiIuSgKkJQgDwPQbjD5-nGD_g/copy'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, sessionId } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  // Send email via Resend
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'The Toolsmith <orders@thetoolsmithapp.com>',
        to: [email],
        subject: 'Your Preventive Maintenance Scheduler is ready — The Toolsmith',
        html: buildEmailHTML(email)
      })
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData)
      return res.status(500).json({ error: 'Failed to send email', details: resendData })
    }

    console.log('Email sent successfully:', resendData.id)

    // Log delivery to Supabase
    try {
      await supabase
        .from('template_purchases')
        .insert({
          email,
          product: 'pm_scheduler',
          stripe_session_id: sessionId,
          delivered_at: new Date().toISOString()
        })
    } catch (err) {
      console.log('Supabase log error (non-fatal):', err.message)
    }

    return res.status(200).json({ success: true, emailId: resendData.id })

  } catch (error) {
    console.error('Send email error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function buildEmailHTML(email) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">

    <!-- HEADER -->
    <div style="background:#1A1A2E;padding:32px 40px;text-align:center;">
      <h1 style="color:#C9A84C;font-size:22px;margin:0;letter-spacing:0.04em;">
        The Toolsmith
      </h1>
      <p style="color:#9A9DB5;font-size:12px;margin:6px 0 0;">
        thetoolsmithapp.com
      </p>
    </div>

    <!-- BODY -->
    <div style="padding:40px;">
      <h2 style="color:#1A1A2E;font-size:20px;margin:0 0 16px;">
        Your PM Scheduler is ready.
      </h2>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Thank you for your purchase. Your Preventive Maintenance Scheduler
        is ready to use. Click the button below to make your own copy in
        Google Sheets — it saves directly to your Google Drive.
      </p>

      <!-- GOOGLE SHEETS BUTTON -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${GOOGLE_SHEETS_COPY_LINK}"
           style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C97A);
                  color:#1A1A2E;padding:14px 36px;border-radius:8px;font-size:15px;
                  font-weight:700;text-decoration:none;letter-spacing:0.04em;">
          Open Google Sheets Template
        </a>
      </div>

      <!-- WHAT YOU GET -->
      <div style="background:#F8F6F1;border-left:4px solid #C9A84C;
                  padding:20px 24px;margin:32px 0;border-radius:0 8px 8px 0;">
        <p style="color:#1A1A2E;font-size:14px;font-weight:700;margin:0 0 12px;">
          What is included:
        </p>
        <ul style="color:#444;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>12-month rolling PM calendar</li>
          <li>Equipment master database</li>
          <li>Task tracker with auto-calculated status</li>
          <li>Parts inventory with reorder alerts</li>
          <li>Dashboard with live compliance KPIs</li>
          <li>Apps Script automation menu</li>
        </ul>
      </div>

      <!-- SETUP INSTRUCTIONS -->
      <h3 style="color:#1A1A2E;font-size:16px;margin:32px 0 12px;">
        Getting Started
      </h3>
      <ol style="color:#444;font-size:14px;line-height:2;margin:0;padding-left:20px;">
        <li>Click the button above and select <strong>Make a copy</strong></li>
        <li>Open <strong>Extensions &gt; Apps Script</strong> in your copy</li>
        <li>Paste the contents of <strong>Code.gs</strong> from your setup guide</li>
        <li>Run <strong>onOpen()</strong> once to authorize</li>
        <li>Refresh — the <strong>PM Scheduler menu</strong> appears in your toolbar</li>
      </ol>

      <p style="color:#666;font-size:13px;line-height:1.7;margin:24px 0 0;">
        Need help getting set up? Reply to this email and we will walk
        you through it.
      </p>
    </div>

    <!-- EXCEL COMING SOON -->
    <div style="background:#16213E;padding:24px 40px;">
      <p style="color:#9A9DB5;font-size:13px;margin:0;line-height:1.7;">
        <strong style="color:#C9A84C;">Excel version coming soon.</strong>
        We will notify you by email when the Excel version with VBA macros
        is available — no additional charge for existing buyers.
      </p>
    </div>

    <!-- FOOTER -->
    <div style="background:#1A1A2E;padding:24px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:12px;margin:0;">
        The Toolsmith &nbsp;|&nbsp; thetoolsmithapp.com
      </p>
      <p style="color:#6A6D85;font-size:11px;margin:8px 0 0;">
        You received this email because you purchased the PM Scheduler
        from The Toolsmith.
      </p>
    </div>

  </div>
</body>
</html>
`
}