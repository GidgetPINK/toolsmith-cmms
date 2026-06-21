import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  // CORS headers — allow requests from the Toolsmith site
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, productName } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const appUrl = process.env.VITE_APP_URL || 'https://toolsmith-cmms.app'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: process.env.VITE_STRIPE_PM_SCHEDULER_PRICE,
          quantity: 1
        }
      ],
      metadata: {
        product: 'pm_scheduler',
        customer_email: email
      },
      success_url: appUrl + '/template-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://toolsmith-site.vercel.app/#shop'
    })

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Template checkout error:', error)
    return res.status(500).json({ error: error.message })
  }
}