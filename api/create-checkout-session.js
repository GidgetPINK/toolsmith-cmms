import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId, organizationId, email } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Price ID is required' })
  }

  const appUrl = process.env.VITE_APP_URL || 'https://toolsmith-cmms.vercel.app'

  try {
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: organizationId
        }
      },
      metadata: {
        organization_id: organizationId
      },
      // Require card upfront but do not charge until trial ends
      payment_method_collection: 'always',
      success_url: appUrl + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: appUrl + '/register'
    }

    if (email) {
      sessionConfig.customer_email = email
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: error.message })
  }
}
