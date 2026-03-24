import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    )
  } catch (error) {
    console.error('Webhook signature error:', error)
    return res.status(400).json({ error: 'Webhook signature verification failed' })
  }

  const organizationId = event.data.object.metadata?.organization_id

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        )
        if (organizationId) {
          await supabase
            .from('organizations')
            .update({
              is_upgraded: true,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              upgraded_at: new Date().toISOString()
            })
            .eq('id', organizationId)
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

      default:
        break
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return res.status(500).json({ error: error.message })
  }
}
