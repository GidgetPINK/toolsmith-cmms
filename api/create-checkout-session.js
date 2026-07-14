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
  const { priceId, promoCode } = req.body

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

  // Step 4: if a promo code was supplied, resolve it server-side to a real
  // Stripe coupon. Never trust the client to tell us a coupon is valid.
  let resolvedCouponId = null
  if (promoCode) {
    try {
      const promotions = await stripe.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
        expand: ['data.coupon']
      })
      console.log('[beta-lookup] promoCode received:', promoCode)
      console.log('[beta-lookup] promotions found:', promotions.data.length)
      if (promotions.data.length > 0) {
        const match = promotions.data[0]
        const couponId = typeof match.coupon === 'string' ? match.coupon : match.coupon?.id
        if (couponId) {
          resolvedCouponId = couponId
          console.log('[beta-lookup] resolved coupon id:', resolvedCouponId)
        } else {
          console.error('[beta-lookup] promotion found but coupon id missing, shape was:', JSON.stringify(match.coupon))
        }
      }
    } catch (e) {
      console.error('[beta-lookup] Stripe lookup threw:', e.message)
      resolvedCouponId = null
    }
  } else {
    console.log('[beta-lookup] no promoCode in request body')
  }

  const isBetaSignup = !!resolvedCouponId

  // Step 5: build the checkout session using TRUSTED values from the server,
  // NEVER values from the request body
  const appUrl = process.env.VITE_APP_URL || 'https://toolsmith-cmms.app'

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
        metadata: {
          organization_id: profile.organization_id,
          user_id: profile.id,
          is_beta: isBetaSignup ? 'true' : 'false'
        }
      },
      metadata: {
        organization_id: profile.organization_id,
        user_id: profile.id,
        is_beta: isBetaSignup ? 'true' : 'false'
      },
      success_url: appUrl + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: appUrl + '/upgrade'
    }

    if (isBetaSignup) {
      // Beta testers: no trial, coupon applied automatically, no card required
      // since the coupon brings the invoice to $0.
      sessionConfig.discounts = [{ coupon: resolvedCouponId }]
      sessionConfig.payment_method_collection = 'if_required'
    } else {
      // Normal paying signups: standard 14-day trial, card required upfront
      sessionConfig.subscription_data.trial_period_days = 14
      sessionConfig.payment_method_collection = 'always'
      sessionConfig.allow_promotion_codes = true
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return res.status(500).json({ error: 'Could not create checkout session' })
  }
}