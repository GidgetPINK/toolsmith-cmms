import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const event = req.body

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid event' })
    }

    const organizationId = event.data?.object?.metadata?.organization_id

    console.log('Webhook received:', event.type, 'org:', organizationId)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (organizationId) {
          const { error } = await supabase
            .from('organizations')
            .update({
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              upgraded_at: new Date().toISOString()
            })
            .eq('id', organizationId)

          if (error) {
            console.error('Supabase error:', error)
            return res.status(500).json({ error: error.message })
          }

          console.log('Organization updated successfully')
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