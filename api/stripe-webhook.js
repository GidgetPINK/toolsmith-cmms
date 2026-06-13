import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: {
    bodyParser: false
  }
}

// Helper: look up org by Stripe customer ID
async function getOrgByCustomerId(customerId) {
  if (!customerId) return null
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id || null
}

// Helper: derive whether a subscription represents Pro tier
async function isProSubscription(subscriptionId) {
  if (!subscriptionId) return false
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const paidPriceId = subscription.items.data[0]?.price?.id

    const proPriceIds = [
      process.env.STRIPE_PRICE_PRO_MONTHLY,
      process.env.STRIPE_PRICE_PRO_YEARLY
    ].filter(Boolean)

    const litePriceIds = [
      process.env.STRIPE_PRICE_LITE_MONTHLY,
      process.env.STRIPE_PRICE_LITE_YEARLY
    ].filter(Boolean)

    const knownPriceIds = [...proPriceIds, ...litePriceIds]

    if (paidPriceId && !knownPriceIds.includes(paidPriceId)) {
      console.warn('Unknown price ID on subscription:', paidPriceId, 'subscription:', subscriptionId)
    }

    return proPriceIds.includes(paidPriceId)
  } catch (err) {
    console.error('Failed to fetch subscription:', err.message)
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const rawBody = Buffer.concat(chunks)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (error) {
    console.error('Webhook signature error:', error.message)
    return res.status(400).json({ error: error.message })
  }

  // Idempotency check: skip if we've already processed this event
  const { data: existingEvent } = await supabase
    .from('processed_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()

  if (existingEvent) {
    console.log('Duplicate event ignored:', event.id)
    return res.status(200).json({ received: true, duplicate: true })
  }

  // Record this event as processed before doing the work
  await supabase
    .from('processed_webhook_events')
    .upsert({ event_id: event.id, event_type: event.type })

  console.log('Webhook received:', event.type, 'id:', event.id)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const organizationId = session.metadata?.organization_id
        const product = session.metadata?.product
        const customerEmail = session.metadata?.customer_email || session.customer_email

        // Handle CMMS subscription checkout
        // Handle CMMS subscription checkout
// Handle CMMS subscription checkout
if (organizationId && session.subscription) {
  const isPro = await isProSubscription(session.subscription)
  const subscriptionForTrial = await stripe.subscriptions.retrieve(session.subscription)
  const trialEndISO = subscriptionForTrial.trial_end
    ? new Date(subscriptionForTrial.trial_end * 1000).toISOString()
    : null

  await supabase
    .from('organizations')
    .update({
      is_upgraded: isPro,
      setup_complete: true,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      trial_end: trialEndISO,
      upgraded_at: new Date().toISOString()
    })
    .eq('id', organizationId)

  // Send welcome email
  try {
    // Look up the manager's name and email for this org
    const { data: managerProfile } = await supabase
      .from('profiles')
      .select('full_name, id')
      .eq('organization_id', organizationId)
      .eq('role', 'manager')
      .limit(1)
      .maybeSingle()

    let managerEmail = session.customer_email
    if (managerProfile?.id) {
      const { data: { user } } = await supabase.auth.admin.getUserById(managerProfile.id)
      if (user?.email) managerEmail = user.email
    }

    if (managerEmail && managerProfile?.full_name) {
      // Calculate trial end date from subscription
      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      const trialEndTimestamp = subscription.trial_end
      const trialEndDate = trialEndTimestamp
        ? new Date(trialEndTimestamp * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })
        : 'the end of your trial period'

      // Map price ID to plan name
      const paidPriceId = subscription.items.data[0]?.price?.id
      let planName = 'Lite'
      if (paidPriceId === process.env.STRIPE_PRICE_PRO_MONTHLY) planName = 'Pro Monthly'
      else if (paidPriceId === process.env.STRIPE_PRICE_PRO_YEARLY) planName = 'Pro Annual'
      else if (paidPriceId === process.env.STRIPE_PRICE_LITE_YEARLY) planName = 'Lite Annual'
      else if (paidPriceId === process.env.STRIPE_PRICE_LITE_MONTHLY) planName = 'Lite Monthly'

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'Gidget at The Toolsmith <orders@thetoolsmithapp.com>',
          to: [managerEmail],
          subject: 'Welcome to The Toolsmith CMMS — your trial is active',
          html: buildWelcomeEmailHtml(managerProfile.full_name, planName, trialEndDate)
        })
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json()
        console.error('Welcome email failed to send:', errorData)
      }
    }
  } catch (emailError) {
    // Don't fail the webhook if email fails
    console.error('Failed to send welcome email:', emailError.message)
  }
}

        // Handle template purchase checkout
        if (product === 'pm_scheduler' && customerEmail) {
          await fetch(`${process.env.VITE_APP_URL}/api/send-template-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              sessionId: session.id
            })
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const orgId = await getOrgByCustomerId(subscription.customer)
        if (orgId) {
          await supabase
            .from('organizations')
            .update({
              is_upgraded: false,
              stripe_subscription_id: null,
              upgraded_at: null
            })
            .eq('id', orgId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const orgId = await getOrgByCustomerId(subscription.customer)
        if (orgId) {
          const isPro = await isProSubscription(subscription.id)
          await supabase
            .from('organizations')
            .update({
              is_upgraded: isPro,
              stripe_subscription_id: subscription.id
            })
            .eq('id', orgId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const orgId = await getOrgByCustomerId(invoice.customer)
        if (orgId) {
          await supabase
            .from('organizations')
            .update({ is_upgraded: false })
            .eq('id', orgId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const orgId = await getOrgByCustomerId(invoice.customer)
        if (orgId) {
          const isPro = await isProSubscription(invoice.subscription)
          await supabase
            .from('organizations')
            .update({
              is_upgraded: isPro,
              stripe_customer_id: invoice.customer,
              stripe_subscription_id: invoice.subscription
            })
            .eq('id', orgId)
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return res.status(500).json({ error: error.message })
  }
}

function buildWelcomeEmailHtml(name, planName, trialEndDate) {
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