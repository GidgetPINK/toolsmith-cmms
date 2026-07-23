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

  const rateLimit = checkRateLimit(getRequestIdentifier(req), 'create-beta-account', 5, 60 * 60_000)
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many signup attempts. Please try again later.' })
  }

  const rawInput = req.body
  const email = (rawInput.email || '').trim().toLowerCase()
  const password = (rawInput.password || '').trim()
  const fullName = (rawInput.fullName || '').trim()
  const orgName = (rawInput.orgName || '').trim()
  const betaCode = rawInput.betaCode

  if (!email || !password || !fullName || !orgName) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const expectedCode = process.env.BETA_ACCESS_CODE
  if (!expectedCode || betaCode !== expectedCode) {
    return res.status(403).json({ error: 'Invalid or missing beta code.' })
  }

  try {
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

    try {
      if (process.env.RESEND_API_KEY) {
        const firstName = fullName.split(' ')[0]
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'April at The Toolsmith <orders@thetoolsmithapp.com>',
            to: [email],
            reply_to: 'april.smith@thetoolsmithapp.com',
            subject: "You're in — welcome to The Toolsmith Lite beta",
            html: buildBetaWelcomeEmailHtml(firstName)
          })
        })
        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('Beta welcome email failed to send:', errorData)
        }
      }
    } catch (emailError) {
      console.error('Beta welcome email threw:', emailError)
    }

    // Notify April that someone joined the beta
    try {
      if (process.env.RESEND_API_KEY) {
        const when = new Date().toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          dateStyle: 'medium',
          timeStyle: 'short'
        })
        const alertResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'The Toolsmith <orders@thetoolsmithapp.com>',
            to: ['april.smith@thetoolsmithapp.com'],
            reply_to: email,
            subject: `New beta signup: ${orgName}`,
            html: `
              <div style="font-family:Arial,sans-serif;color:#1a1a2e;line-height:1.6;">
                <h2 style="margin:0 0 16px;">New beta signup</h2>
                <p style="margin:0 0 8px;"><strong>Organization:</strong> ${orgName}</p>
                <p style="margin:0 0 8px;"><strong>Name:</strong> ${fullName}</p>
                <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
                <p style="margin:0 0 8px;"><strong>Plan:</strong> Lite beta</p>
                <p style="margin:0 0 16px;"><strong>Signed up:</strong> ${when} (Central)</p>
                <p style="margin:0;color:#555;font-size:14px;">Reply to this email to reach them directly.</p>
              </div>
            `
          })
        })
        if (!alertResponse.ok) {
          const errorData = await alertResponse.json()
          console.error('Beta signup alert failed to send:', errorData)
        }
      }
    } catch (alertError) {
      console.error('Beta signup alert threw:', alertError)
    }

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

function buildBetaWelcomeEmailHtml(firstName) {
  const appUrl = process.env.VITE_APP_URL || 'https://toolsmith-cmms.app'
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="background:#1a1a2e;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
        <h1 style="color:#c9a84c;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:600;">The Toolsmith</h1>
        <p style="color:#9a9db5;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;margin:8px 0 0;">Lite Beta</p>
      </div>
      <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:32px;">
        <p style="color:#1a1a2e;font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Thank you for joining the beta. I built The Toolsmith because maintenance teams in senior living deserve software that respects their time, and having you test it means a lot to me personally.
        </p>
        <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
          You're all set. No card, no trial countdown. The beta runs for 30 days, and as a thank-you you'll get six months of Pro features free when Pro launches.
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#1a1a2e;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.04em;">Log in and get started</a>
        </div>
        <div style="border-top:1px solid #eee;padding-top:24px;margin-bottom:8px;">
          <p style="color:#1a1a2e;font-size:15px;font-weight:600;margin:0 0 12px;">A few things I'd love you to try</p>
          <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 12px;">
            No pressure to do all of these, but the more you put it through real use, the more useful your feedback will be:
          </p>
          <ul style="color:#444;font-size:14px;line-height:1.8;margin:0 0 8px;padding-left:20px;">
            <li>Create a few work orders for real maintenance tasks</li>
            <li>Invite a technician to your team</li>
            <li>Assign a work order and use the chat to talk it through</li>
            <li>Open it on your phone and try it like you're out in the field</li>
            <li>Mark a work order complete, then search for it and reopen it</li>
            <li>Deactivate a technician and see how that flows</li>
            <li>Change your password from the sign-in screen</li>
          </ul>
        </div>
        <div style="border-top:1px solid #eee;padding-top:24px;margin:16px 0 0;">
          <p style="color:#1a1a2e;font-size:15px;font-weight:600;margin:0 0 12px;">Tell me what you really think</p>
          <p style="color:#444;font-size:14px;line-height:1.7;margin:0 0 12px;">
            This is the part I care about most. What felt good? What frustrated you? What's missing? How did the overall design and experience feel to use? I want your honest, unfiltered reactions, the rougher the better. Nothing is too small.
          </p>
          <p style="color:#444;font-size:14px;line-height:1.7;margin:0;">
            Just reply to this email, or reach me any time at
            <a href="mailto:april.smith@thetoolsmithapp.com" style="color:#c9a84c;text-decoration:none;font-weight:600;">april.smith@thetoolsmithapp.com</a>.
            If something breaks, tell me and I'll fix it fast.
          </p>
        </div>
        <p style="color:#1a1a2e;font-size:15px;line-height:1.7;margin:28px 0 4px;">Thank you, truly.</p>
        <p style="color:#1a1a2e;font-size:15px;line-height:1.7;margin:0;font-weight:600;">April</p>
        <p style="color:#9a9db5;font-size:13px;line-height:1.6;margin:2px 0 0;">Founder, The Toolsmith</p>
      </div>
      <p style="color:#9a9db5;font-size:12px;text-align:center;margin:20px 0 0;line-height:1.6;">
        The Toolsmith CMMS · Built in Alabama
      </p>
    </div>
  </body>
  </html>
  `
}
