export default async function handler(req, res) {
  const allowedOrigins = [
  'https://thetoolsmithapp.com',
  'https://www.thetoolsmithapp.com',
  'https://toolsmith-cmms.vercel.app'
]
const origin = req.headers.origin
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin)
}
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name, email, company, teamSize, projectDescription } = req.body

  if (!name || !email || !projectDescription) {
    return res.status(400).json({ error: 'Name, email, and project description are required' })
  }

  try {
    // ── 1. Internal notification email to the team ──
    const internalResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'The Toolsmith <orders@thetoolsmithapp.com>',
        to: ['gidgetpink@gmail.com'],
        reply_to: email,
        subject: `New CMMS Inquiry — ${name} at ${company || 'Unknown Company'}`,
        html: buildInquiryEmail(name, email, company, teamSize, projectDescription)
      })
    })

    if (!internalResponse.ok) {
      const errorData = await internalResponse.json()
      console.error('Internal email failed:', errorData)
      return res.status(500).json({ error: 'Failed to send notification email', details: errorData })
    }

    // ── 2. Fetch the PDF from the public URL ──
    let pdfBase64 = null
    try {
      const pdfResponse = await fetch('https://toolsmith-cmms.vercel.app/Toolsmith_Build_Guide.pdf')
      if (pdfResponse.ok) {
        const arrayBuffer = await pdfResponse.arrayBuffer()
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64')
      } else {
        console.error('PDF fetch failed with status:', pdfResponse.status)
      }
    } catch (pdfError) {
      console.error('Could not fetch PDF:', pdfError.message)
    }

    // ── 3. Confirmation email to the visitor ──
    const confirmationPayload = {
      from: 'Gidget at The Toolsmith <orders@thetoolsmithapp.com>',
      to: [email],
      subject: 'We received your inquiry — The Toolsmith',
      html: buildConfirmationEmail(name)
    }

    if (pdfBase64) {
      confirmationPayload.attachments = [{
        filename: 'Toolsmith_Build_Guide.pdf',
        content: pdfBase64
      }]
    }

    const confirmResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(confirmationPayload)
    })

    if (!confirmResponse.ok) {
      const errorData = await confirmResponse.json()
      console.error('Confirmation email failed:', errorData)
      // Still return success since the internal notification went through
    }

    return res.status(200).json({ success: true, pdfAttached: !!pdfBase64 })

  } catch (error) {
    console.error('Inquiry email error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function buildInquiryEmail(name, email, company, teamSize, projectDescription) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1A1A2E;padding:24px 40px;text-align:center;">
      <h1 style="color:#C9A84C;font-size:20px;margin:0;">The Toolsmith</h1>
      <p style="color:#9A9DB5;font-size:12px;margin:6px 0 0;">New Custom CMMS Inquiry</p>
    </div>
    <div style="padding:32px 40px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px;background:#1E2245;color:#C9A84C;font-weight:bold;width:35%;">Name</td>
          <td style="padding:12px;background:#F8F6F1;color:#1A1A2E;">${name}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#16213E;color:#C9A84C;font-weight:bold;">Email</td>
          <td style="padding:12px;background:#FFFFFF;color:#1A1A2E;">${email}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#1E2245;color:#C9A84C;font-weight:bold;">Company</td>
          <td style="padding:12px;background:#F8F6F1;color:#1A1A2E;">${company || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#16213E;color:#C9A84C;font-weight:bold;">Team Size</td>
          <td style="padding:12px;background:#FFFFFF;color:#1A1A2E;">${teamSize || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding:12px;background:#1E2245;color:#C9A84C;font-weight:bold;vertical-align:top;">Project</td>
          <td style="padding:12px;background:#F8F6F1;color:#1A1A2E;line-height:1.6;">${projectDescription}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#F8F6F1;border-left:4px solid #C9A84C;border-radius:0 8px 8px 0;">
        <p style="color:#1A1A2E;font-size:13px;margin:0;">Reply directly to this email to respond to ${name} at ${email}.</p>
      </div>
    </div>
    <div style="background:#1A1A2E;padding:16px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:11px;margin:0;">The Toolsmith &nbsp;|&nbsp; thetoolsmithapp.com</p>
    </div>
  </div>
</body>
</html>`
}

function buildConfirmationEmail(name) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1A1A2E;padding:24px 40px;text-align:center;">
      <h1 style="color:#C9A84C;font-size:20px;margin:0;">The Toolsmith</h1>
      <p style="color:#9A9DB5;font-size:12px;margin:6px 0 0;">thetoolsmithapp.com</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1A1A2E;font-size:20px;margin:0 0 16px;">Got it, ${name}.</h2>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your inquiry has been received. I will review your project details and get back to you within one business day to schedule your discovery call.
      </p>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Attached to this email is The Toolsmith Build Guide, a complete walkthrough of our process from inquiry to launch, the three pricing tiers, and what to expect at each step.
      </p>
      <div style="background:#F8F6F1;border-left:4px solid #C9A84C;padding:16px 20px;border-radius:0 8px 8px 0;">
        <p style="color:#1A1A2E;font-size:13px;margin:0;font-weight:bold;">What happens next</p>
        <p style="color:#555;font-size:13px;margin:8px 0 0;line-height:1.6;">
          I will review your project scope and reach out within one business day to schedule a short discovery call. If the scope needs clarification, I may follow up with a few quick questions first. Reply directly to this email any time.
        </p>
      </div>
    </div>
    <div style="background:#1A1A2E;padding:16px 40px;text-align:center;">
      <p style="color:#9A9DB5;font-size:11px;margin:0;">The Toolsmith &nbsp;|&nbsp; thetoolsmithapp.com</p>
    </div>
  </div>
</body>
</html>`
}