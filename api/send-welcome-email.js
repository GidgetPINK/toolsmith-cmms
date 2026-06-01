export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name, planName, trialEndDate } = req.body

  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Gidget at The Toolsmith <orders@thetoolsmithapp.com>',
        to: [email],
        subject: 'Welcome to The Toolsmith CMMS — your trial is active',
        html: buildWelcomeEmail(name, planName, trialEndDate)
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Welcome email failed:', errorData)
      return res.status(500).json({ error: 'Failed to send welcome email', details: errorData })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function buildWelcomeEmail(name, planName, trialEndDate) {
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
      <h2 style="color:#1A1A2E;font-size:20px;margin:0 0 16px;">Welcome, ${name}.</h2>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your account is active and your 14-day free trial has started. You will not be charged until your trial ends on <strong>${trialEndDate}</strong>.
      </p>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        You signed up for the <strong>${planName}</strong> plan. You can change plans, update your payment method, or cancel any time from the Settings page in your dashboard.
      </p>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="${appUrl}" style="display:inline-block;background:#C9A84C;color:#1A1A2E;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;">Open Dashboard</a>
      </div>

      <div style="background:#F8F6F1;border-left:4px solid #C9A84C;padding:20px 24px;border-radius:0 8px 8px 0;margin:0 0 24px;">
        <p style="color:#1A1A2E;font-size:13px;margin:0 0 12px;font-weight:bold;">Quick start steps</p>
        <ol style="color:#555;font-size:13px;margin:0;padding-left:20px;line-height:1.7;">
          <li><strong>Add your first asset.</strong> Go to Assets and add the equipment you maintain.</li>
          <li><strong>Invite your team.</strong> From Settings → Team Management, add your technicians.</li>
          <li><strong>Create a work order.</strong> Click "+ New Work Order" from the dashboard to track maintenance tasks.</li>
          <li><strong>Set up PM schedules.</strong> For Pro accounts, add preventive maintenance schedules to each asset.</li>
        </ol>
      </div>

      <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 8px;">
        Questions or need help? Reply to this email and I will get back to you.
      </p>
      <p style="color:#888;font-size:13px;line-height:1.6;margin:24px 0 0;">
        Thanks for trying Toolsmith.<br>
        Gidget
      </p>
    </div>
    <div style="background:#1A1A2E;padding:16px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:11px;margin:0;">The Toolsmith CMMS &nbsp;|&nbsp; thetoolsmithapp.com</p>
    </div>
  </div>
</body>
</html>`
}