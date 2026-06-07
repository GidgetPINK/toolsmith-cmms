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

      await fetch(`${process.env.VITE_APP_URL}/api/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: managerEmail,
          name: managerProfile.full_name,
          planName,
          trialEndDate
        })
      })
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