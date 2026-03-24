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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
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
      success_url: process.env.VITE_APP_URL + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.VITE_APP_URL + '/register'
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: error.message })
  }
}
