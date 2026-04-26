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

  const organizationId = event.data?.object?.metadata?.organization_id

  console.log('Webhook received:', event.type, 'org:', organizationId)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
  const session = event.data.object
  const organizationId = session.metadata?.organization_id
  const product = session.metadata?.product
  const customerEmail = session.metadata?.customer_email || session.customer_email

  // Handle CMMS subscription checkout
  if (organizationId) {
    await supabase
      .from('organizations')
      .update({
        is_upgraded: session.metadata?.plan === 'pro',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        upgraded_at: new Date().toISOString()
      })
      .eq('id', organizationId)
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
        if (organizationId) {
          await supabase
            .from('organizations')
            .update({
              is_upgraded: false,
              stripe_subscription_id: null,
              upgraded_at: null
            })
            .eq('id', organizationId)
        }
        break
      }

      case 'invoice.payment_failed': {
        if (organizationId) {
          await supabase
            .from('organizations')
            .update({ is_upgraded: false })
            .eq('id', organizationId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        if (organizationId) {
          await supabase
            .from('organizations')
            .update({
              stripe_customer_id: event.data.object.customer,
              stripe_subscription_id: event.data.object.subscription
            })
            .eq('id', organizationId)
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