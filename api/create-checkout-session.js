import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Service-role client for trusted lookups
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Step 1: verify the caller is authenticated
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  const token = authHeader.replace('Bearer ', '')

  // Look up the user from the token using service-role
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication' })
  }

  // Step 2: get the caller's profile (their REAL org and role)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, organization_id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return res.status(403).json({ error: 'Profile not found' })
  }

  if (!profile.is_active) {
    return res.status(403).json({ error: 'Account is inactive' })
  }

  if (profile.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers can start checkout' })
  }

  if (!profile.organization_id) {
    return res.status(403).json({ error: 'No organization associated with this account' })
  }

  // Step 3: validate the requested price against the known list
  const { priceId } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Price ID is required' })
  }

  const allowedPriceIds = [
    process.env.STRIPE_PRICE_LITE_MONTHLY,
    process.env.STRIPE_PRICE_LITE_YEARLY,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY
  ].filter(Boolean)

  if (!allowedPriceIds.includes(priceId)) {
    return res.status(400).json({ error: 'Invalid price' })
  }

  // Step 4: build the checkout session using TRUSTED values from the server,
  // NEVER values from the request body
  const appUrl = process.env.VITE_APP_URL || 'https://toolsmith-cmms.vercel.app'

  try {
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: profile.organization_id,
          user_id: profile.id
        }
      },
      metadata: {
        organization_id: profile.organization_id,
        user_id: profile.id
      },
      payment_method_collection: 'always',
      success_url: appUrl + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: appUrl + '/upgrade'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: 'Could not create checkout session' })
  }
}