# The Toolsmith CMMS — System Context

A comprehensive reference document for The Toolsmith CMMS web application. This document is the source of truth for product, technical, and strategic context. Update it as the system evolves.

**Last updated:** June 18, 2026
**Repository:** toolsmith-cmms
**Live URL:** https://toolsmith-cmms.vercel.app
**Marketing site:** https://thetoolsmithapp.com (separate repo: toolsmith-site)

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Target Market](#target-market)
3. [Pricing & Tiers](#pricing--tiers)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Database Schema](#database-schema)
7. [Authentication & Subscription Flow](#authentication--subscription-flow)
8. [Key Components Reference](#key-components-reference)
9. [API Endpoints](#api-endpoints)
10. [Environment Variables](#environment-variables)
11. [Brand & Design System](#brand--design-system)
12. [Feature Inventory](#feature-inventory)
13. [Known Issues](#known-issues)
14. [Strategic Direction](#strategic-direction)
15. [Development Conventions](#development-conventions)

---

## Product Overview

The Toolsmith is a facilities maintenance management software (CMMS) built specifically for small facilities. It is NOT an industrial maintenance product. The target is buildings, not factories.

**Core value proposition:** Modern, mobile-first CMMS with flat pricing (not per-user) and AI assistance, built for small facilities that find existing CMMS options either too expensive or too complex.

**Key differentiators:**
- Flat pricing model (unlimited users) vs competitors' per-user pricing
- Built specifically for facilities (HVAC, plumbing, fire safety, etc.) not industrial
- Gidget AI assistant included in Pro (genuinely novel in this market)
- Modern UI design vs dated competitors like Maintenance Care
- Fast setup (under an hour with Gidget) vs days/weeks for competitors

---

## Target Market

**Primary segment (initial focus):** Small senior living communities
- Reasoning: Highest willingness to pay, regulatory urgency, defined buyer, easy to identify via state licensing databases

**Secondary segments (Phase 2):**
- Churches (especially mid-size with weekend services)
- Small schools (K-12, especially private/charter)
- Daycares
- Small medical practices
- Community centers
- Small commercial buildings

**Customer persona:** "Tom the Maintenance Director"
- Age 45-60, 15+ years in facilities work
- Manages 2-4 technicians at a 60-bed assisted living community
- Reports to Executive Director
- Annual maintenance budget responsibility: $50K-$200K
- Technical comfort: Moderate (uses iPhone, struggles with complex software)
- Pain points: Paper work orders, forgotten PMs, no parts tracking, state survey readiness

**Decision authority by price point:**
- Under $50/month: Maintenance Director decides alone
- $50-$100/month: Casual conversation with Executive Director
- $100-$300/month: Formal approval from Executive Director
- $300+/month: Budget review, possibly board approval

---

## Pricing & Tiers

### Current Pricing

**Lite Plan**
- Monthly: $19
- Annual: $190 (saves $38, ~17% discount)
- Includes: Work order management, technician management, manager dashboard, mobile access
- Team size: Marketed as "up to 10 team members" (NOT YET ENFORCED IN CODE — see Known Issues)
- 14-day free trial

**Pro Plan**
- Monthly: $49
- Annual: $490 (saves $98, ~17% discount)
- Includes: Everything in Lite PLUS Asset Registry, PM Scheduling, Parts & Inventory, Downtime Tracking, Custom Fields, Gidget AI Assistant
- Team size: Unlimited
- 14-day free trial

### Pricing Philosophy
- Pricing kept under $50/month for Lite, under $50/month for Pro, to enable Maintenance Director to approve without committee
- Flat-rate (not per-user) is core competitive position
- Stripe handles all subscription management

### Competitive Pricing Reference (as of June 2026)
- MaintainX: $16-49/user/month + free Basic tier
- UpKeep: $20-75/user/month
- Maintenance Care: ~$60/month for small facilities
- FMX: $5,000-12,000/year (enterprise)
- Limble: $28-69/user/month

---

## Tech Stack

**Frontend:**
- React 18 with Vite (not Create React App)
- React Router for navigation
- Styled with inline styles and CSS-in-JS (no Tailwind, no CSS modules)
- ReactMarkdown for rendering AI assistant output

**Backend:**
- Supabase (PostgreSQL + Auth + Storage + RLS)
- Vercel serverless functions in /api directory
- Resend for transactional email
- Stripe for billing and subscriptions
- Anthropic API (Claude Sonnet 4.6) for Gidget AI

**Hosting:**
- Vercel (production)
- Domain: thetoolsmithapp.com (marketing) and toolsmith-cmms.vercel.app (app)

**Development:**
- Node.js / npm
- Git/GitHub (username: GidgetPINK)
- VS Code as primary editor

---

## Repository Structure
---

## Database Schema

The database lives in Supabase. SQL schema is NOT currently version-controlled in the repo (this is a known gap to address).

### Tables in use

**organizations**
- Core tenant table
- Fields used by app:
  - `id` (uuid, primary key)
  - `name` (text)
  - `is_upgraded` (boolean) — TRUE for Pro tier, FALSE for Lite (despite name implying "any upgrade")
  - `setup_complete` (boolean) — TRUE after initial signup setup
  - `trial_end` (timestamptz) — Trial end date
  - `stripe_customer_id` (text)
  - `stripe_subscription_id` (text) — Null when canceled
  - `upgraded_at` (timestamptz)
- RLS: Org-scoped via organization_id matching

**profiles**
- User profiles (linked to Supabase auth.users)
- Fields:
  - `id` (uuid, matches auth.users.id)
  - `organization_id` (uuid, foreign key)
  - `full_name` (text)
  - `role` (text: 'manager' or 'technician')
  - `email` (text)
  - Possibly `is_active` or similar status field
- RLS: Users see only their own profile, managers see org members

**work_orders**
- Core work order entity
- Fields include:
  - `id`, `organization_id`, `title`, `description`
  - `priority` (Critical, High, Standard, Routine)
  - `status` (Open, In Progress, Closed)
  - `asset_id` (foreign key, nullable)
  - `assigned_to` (foreign key to profiles)
  - `due_date`
  - `created_by`, `created_at`, `updated_at`

**assets** (Pro)
- Equipment tracked by the facility
- Fields: id, organization_id, name, category, criticality, manufacturer, model, serial, install_date, photo_url, location, function

**pm_schedules** (Pro)
- Preventive maintenance tasks per asset
- Fields: id, asset_id, title, frequency_value, frequency_unit, next_due_date, priority, assigned_to

**parts** (Pro)
- Parts inventory
- Fields: id, organization_id, name, sku, stock_quantity, low_stock_threshold, location

**work_order_parts** (Pro)
- Junction table linking parts used on work orders
- Fields: work_order_id, part_id, quantity_used

**part_adjustments** (Pro)
- Audit log of stock changes
- Fields: part_id, adjustment_quantity, reason, adjusted_by, adjusted_at

**downtime_events** (Pro)
- Planned and unplanned downtime tracking
- Fields: id, asset_id, type (planned/unplanned), reason, start_time, end_time, notes
- Triggers email alerts via api/notify-downtime.js for unplanned events

**custom_field_definitions** (Pro)
- Custom field definitions for assets
- Fields: id, organization_id, field_name, field_type, required, options

**template_purchases**
- Records of one-time template product purchases (PM Scheduler template, etc.)

**processed_webhook_events**
- Idempotency table for Stripe webhooks
- Prevents duplicate processing

### Key RLS Patterns

- Most tables use `organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())`
- Security definer functions used to avoid recursion issues
- Managers vs technicians have different permissions on some tables

---

## Authentication & Subscription Flow

### Signup Flow

1. User visits /register
2. Selects plan (Lite Monthly/Yearly or Pro Monthly/Yearly)
3. Enters name, organization name, email, password
4. Clicks "Start Free Trial"
5. Redirected to Stripe Checkout (14-day trial, no charge today)
6. Stripe creates customer + subscription with trial
7. User redirected to /success
8. Stripe webhook fires asynchronously:
   - Updates organization: is_upgraded (true for Pro, false for Lite), setup_complete=true, trial_end, stripe_customer_id, stripe_subscription_id
   - Sends welcome email via Resend (tier-aware as of June 17, 2026)
9. User navigates to dashboard

### Subscription States

- **Trial:** Active subscription with trial_end in future
- **Active:** Trial ended, payment succeeded, subscription active
- **Past Due:** Payment failed, grace period
- **Canceled:** User canceled OR auto-canceled after multiple payment failures

### Subscription Gate Logic (App.jsx)

The subscription gate blocks access to the app when:
- session exists AND
- profile exists AND
- organization exists AND
- setup_complete === true AND
- is_upgraded === false

**KNOWN ISSUE:** This logic blocks Lite users (who have is_upgraded=false by design). The gate needs to also check for active trial (trial_end > now) and/or active subscription (stripe_subscription_id exists). See Known Issues section.

### Tier Detection Logic (api/stripe-webhook.js)

`isProSubscription()` function checks the price ID of the subscription against environment variables:
- STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY → returns true
- STRIPE_PRICE_LITE_MONTHLY, STRIPE_PRICE_LITE_YEARLY → returns false

This drives the `is_upgraded` boolean.

### Role-Based Access

- **Manager:** Full access to all features within their tier
- **Technician:** Can see/update work orders assigned to them. Cannot manage assets, parts, team, or settings (current limitation noted in BACKLOG)

---

## Key Components Reference

### App.jsx
Root component. Handles:
- Supabase auth session management
- Profile and organization loading
- Subscription gate logic (NEEDS FIX)
- Route definitions
- Mounting GidgetButton outside Routes but inside BrowserRouter

### Dashboard.jsx
Main manager landing page. Contains:
- Top bar with app name + Settings/Sign Out buttons (top right)
- Left sidebar with Assets section (search + Add Asset button + Maintenance Coming Up widget) — Pro only
- Main area: stat cards (Total Open, Critical, High, Standard, Routine), Inventory Alerts widget (Pro), Downtime Now widget (Pro), filter pills, work order list
- Mobile: hamburger menu in top right, bottom nav with Orders/Assets/Settings

### MobileWorkOrders.jsx
Mobile-optimized work order interface for technicians. Primary touchpoint for tech users.

### Settings.jsx
Navigation hub for: Change Password, Team Management (/team), Parts and Inventory (/parts) [Pro], Custom Fields (/settings/custom-fields) [Pro], Stripe billing portal

### Team.jsx
Team management. Lists active members. Invitation flow via api/invite-team-member.js.

### GidgetButton.jsx
Floating gold sparkle button bottom-right. Gated by `isPro` (organization.is_upgraded === true). Hidden on auth pages.

### GidgetChatPanel.jsx
Slide-out chat panel. Glassmorphism styling. ReactMarkdown rendering. Context-aware action buttons after each Gidget response.

### TrialBanner.jsx
Trial countdown banner. Shows when user is in trial period. Disappears when is_upgraded becomes true.

### gidgetActions.js
Logic for context-aware action buttons. Detects keywords in user message and Gidget response to suggest buttons (Upgrade, Team, Parts, etc.). Priority order: upgrade > parts > team > newWorkOrder.

### SubscriptionRequired.jsx
The "subscription required" gate page shown when subscription gate triggers. Has Manage Subscription button (opens Stripe portal) and Sign Out button.

---

## API Endpoints

All endpoints in /api are Vercel serverless functions.

**create-account.js** — Server-side account creation (used by Register flow)

**create-checkout-session.js** — Creates Stripe Checkout session for subscription signup

**create-portal-session.js** — Creates Stripe Customer Portal session for billing management

**create-template-checkout.js** — Creates checkout for one-time template purchases

**gidget-chat.js** — POST endpoint for Gidget AI chat
- Authenticates via Bearer token (Supabase JWT)
- Verifies user is in a Pro org (`is_upgraded === true`)
- Calls Anthropic API (claude-sonnet-4-6)
- Returns AI response

**gidget.js** — (Legacy/alternate, may be deprecated)

**invite-team-member.js** — Sends invitation email to new team member

**notify-downtime.js** — Sends email alerts when unplanned downtime is logged

**send-inquiry-email.js** — Handles marketing site contact form submissions

**send-template-email.js** — Delivers template products to customers post-purchase

**send-welcome-email.js** — Sends tier-aware welcome email (Lite vs Pro)

**stripe-webhook.js** — Handles Stripe webhook events
- checkout.session.completed → Updates organization with subscription details, sends welcome email
- customer.subscription.deleted → Sets is_upgraded=false, clears subscription IDs
- customer.subscription.updated → Updates is_upgraded based on price ID
- invoice.payment_succeeded → Ensures is_upgraded is correct after payment
- Uses processed_webhook_events table for idempotency

---

## Environment Variables

### Vite/Client (VITE_ prefix, accessible in browser)

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `VITE_STRIPE_LITE_MONTHLY` — Stripe price ID for Lite Monthly
- `VITE_STRIPE_LITE_YEARLY` — Stripe price ID for Lite Yearly
- `VITE_STRIPE_PRO_MONTHLY` — Stripe price ID for Pro Monthly
- `VITE_STRIPE_PRO_YEARLY` — Stripe price ID for Pro Yearly

### Server (process.env, serverless functions only)

- `STRIPE_SECRET_KEY` — Stripe secret API key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_LITE_MONTHLY` — Stripe price ID for Lite Monthly (server-side)
- `STRIPE_PRICE_LITE_YEARLY` — Stripe price ID for Lite Yearly (server-side)
- `STRIPE_PRICE_PRO_MONTHLY` — Stripe price ID for Pro Monthly (server-side)
- `STRIPE_PRICE_PRO_YEARLY` — Stripe price ID for Pro Yearly (server-side)
- `VITE_STRIPE_PM_SCHEDULER_PRICE` — Stripe price ID for one-time PM Scheduler template
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (admin access)
- `VITE_SUPABASE_URL` — Same as client (some API functions use this)
- `RESEND_API_KEY` — Resend email API key
- `ANTHROPIC_API_KEY` — Anthropic API key for Gidget
- `GROQ_API_KEY` — Groq API key (purpose unclear, may be legacy)
- `VITE_APP_URL` — Production app URL

---

## Brand & Design System

### Brand Identity

**Voice:** Working-class direct, no corporate jargon. "Maintenance software built by people who do the work."

**Tagline options:**
- "Maintenance software built by people who do the work"
- "CMMS for buildings, not factories"

### Color Palette

- **Charcoal:** #1a1a2e (primary dark)
- **Navy:** #16213e (secondary dark, for cards and gradients)
- **Gold:** #c9a84c (primary accent, CTAs)
- **Gold Light:** #e8c97a (hover/highlight)
- **Cream/Off-white:** #f8f6f1 (primary text on dark)
- **Muted gray:** #9a9db5 (secondary text)
- **Critical red:** #e06c75 (alerts, errors)
- **Success green:** #98c379 (badges, confirmations)

### Typography

- **Body:** Inter (sans-serif)
- **Headings/Brand:** Georgia (serif) for elegant brand moments
- **Code/Monospace:** System monospace stack

### UI Patterns

- Dark theme by default (charcoal/navy backgrounds)
- Gold accents for CTAs and key actions
- Glassmorphism effects (backdrop-blur with transparency) on overlays
- Rounded corners (8-16px)
- Subtle shadows
- Smooth animations (0.2-0.3s ease-out)

### Logo

- Wordmark: "The Toolsmith" in Georgia serif
- Tagline: "CMMS" in smaller text
- Logo file at thetoolsmithapp.com/logo.png

---

## Feature Inventory

### Built and Working

**Lite Features (all tiers):**
- Work order CRUD with 4 priority levels and 3 statuses
- Team management (invite, role assignment)
- Mobile work order interface for techs
- Manager dashboard with stat cards
- Settings hub
- Stripe subscription management
- Trial banner with countdown

**Pro Features:**
- Asset Registry (assets with photos, custom fields, criticality)
- Custom asset fields (text, number, date, dropdown, checkbox)
- PM Scheduling (recurring maintenance tasks per asset)
- Parts and Inventory (stock tracking, low stock alerts, parts on work orders)
- Downtime Tracking (planned/unplanned with email alerts to managers)
- Gidget AI Assistant (chat-based help)
- Low Stock Widget on dashboard
- Downtime Widget on dashboard
- Maintenance Coming Up sidebar widget

**Infrastructure:**
- Supabase auth with email/password
- Row-level security throughout
- Stripe Checkout for subscriptions
- Stripe Customer Portal for billing
- Resend transactional emails
- Vercel serverless API
- GitHub deployment pipeline

### In Progress (Pre-Launch)

- Tier-aware welcome emails (DONE June 17, 2026)
- Empty state improvements for Lite users
- Lite team member cap enforcement (10 max)
- Subscription gate fix for Lite users
- Pre-launch polish per BACKLOG.md

### Planned (Post-Launch)

- Work Order Chat (Pro feature)
- Cost Reporting (Pro feature, depends on Parts + Downtime)
- Capacitor mobile app wrappers (iOS + Android)
- Asset import wizard with Gidget
- PM recommendation engine entry point
- Help documentation site
- Status page
- Sentry error monitoring
- Custom auth domain
- Photo bucket privacy hardening
- Rate limiting
- CAPTCHA on signup

---

## Known Issues

### Critical (Pre-Launch Blockers)

**1. Subscription gate blocks Lite users**
- Location: src/App.jsx lines 196-198
- Issue: Gate checks `is_upgraded === false` which is the normal state for Lite users
- Impact: Lite users hit "Subscription Required" page immediately after signup
- Fix: Gate must also check `hasActiveTrial` and `hasActiveSubscription` (stripe_subscription_id exists)
- Status: Identified, not yet fixed

### High Priority

**2. Lite team member cap not enforced**
- Marketing promises "up to 10 team members" for Lite
- No code enforcement exists
- Impact: Lite users can invite unlimited members, breaking pricing model
- Fix: Add count check in invite-team-member.js (backend) and warning in Team.jsx (frontend)

**3. Pro signup card missing key features**
- Location: Marketing site pricing cards
- Missing from Pro card: Unlimited team members, Gidget AI assistant, Downtime tracking
- Impact: Pro looks weaker than it is, hurts conversion
- Fix: Update pricing card content in toolsmith-site/index-full.html

**4. Password creation has no complexity requirements visible**
- Registration form shows password fields without indicating requirements
- Users may create weak passwords or get rejected after submission
- Fix: Add visible requirements list with live validation

**5. Orphaned signup data prevents email reuse**
- If signup fails partway through, the email gets "stuck" in auth.users
- Subsequent attempts with same email fail with "Database error creating new user"
- Fix: Cleanup mechanism for failed signups, OR better error recovery in signup flow

### Medium Priority

**6. Database schema not version controlled**
- SQL schema lives only in Supabase dashboard
- No local migration files
- Risk: Schema drift, harder to reproduce dev environment
- Fix: Set up Supabase CLI migrations, commit schema

**7. Gidget knowledge gaps**
- Mobile navigation references hamburger menu that may not exist
- Tier knowledge mentions outdated tier structure
- Some specific feature details may be inaccurate
- Fix: Audit and update Gidget's system prompt in api/gidget-chat.js

**8. Gidget chat doesn't persist**
- Closing chat panel discards conversation history
- Should persist via sessionStorage with 15-30 min inactivity timeout
- Effort: ~30-45 minutes

### Low Priority / Polish

**9. Welcome email steps need verification**
- Email steps say "Add your first asset" but Lite users can't add assets
- FIXED June 17, 2026 with tier-aware emails

**10. Empty states throughout app are minimal**
- Most empty states say "No X yet" with no guidance
- Could be more helpful

**11. No in-app feedback mechanism**
- No way for users to report bugs or request features without email
- Should add a feedback widget

**12. Auto-refresh widgets**
- Downtime and Low Stock widgets don't auto-refresh when events change
- Should use Supabase realtime subscriptions

---

## Strategic Direction

### Launch Strategy (as of June 2026)

**Lite-first launch approach:**
1. Polish Lite to launch-ready quality
2. Wrap with Capacitor for iOS and Android app stores
3. Submit to App Store and Google Play
4. Keep Pro available but minimize active marketing
5. Build email list of Lite users for future Pro launch
6. Social media content strategy to drive Lite downloads

### Dual-Channel Distribution

- **Web channel:** thetoolsmithapp.com with Stripe payment
- **App store channel:** iOS and Android apps with in-app payment
- Same product, same pricing, different margins (Apple/Google take 15-30%)

### Long-term Vision: Self-Service via AI

The product bets on AI replacing traditional SaaS support costs:
- Gidget handles onboarding, product guidance, PM recommendations
- Comprehensive help docs supplement Gidget
- Goal: Scale to 500+ customers without hiring staff
- Higher gross margins (~95% vs traditional ~85%)

### Growth Targets

**Year 1 (Validation):**
- 25-50 customers
- $12K-$24K revenue
- $8K-$16K take-home

**Year 2 (Growth):**
- 100-200 customers
- $48K-$96K revenue
- $32K-$64K take-home

**Year 3 (Scale):**
- 300-500 customers
- $144K-$240K revenue
- $96K-$160K take-home

### Reference Documents

- `BACKLOG.md` — Pending feature work and improvements (per-feature detail)
- `toolsmith-gtm-dossier.docx` — Go-to-market strategy and customer personas (saved in /mnt/user-data/outputs from June 17, 2026 session)

---

## Development Conventions

### Coding Style

- React functional components with hooks
- No TypeScript (plain JavaScript)
- Inline styles for component-specific styling
- Async/await preferred over .then() chains
- Avoid em dashes in user-facing copy (project preference)

### Git Workflow

- Branch: main (single branch deployment)
- Auto-deploy: Vercel watches main and deploys on push
- Commit message style: lowercase, imperative ("fix subscription gate", not "Fixed subscription gate")
- Always commit with full path: `cd ~/Desktop/toolsmith-cmms && git add [files]`

### File Editing Approach

When editing code in this project, the developer (Ryle) prefers:
- ONE step at a time instructions
- Find/replace patterns rather than diff format
- Verification after each major change
- Always include git commit commands at end (cd, add, commit -m, push)

### Testing Approach

- Manual testing in production with 14-day trial for paid features
- Use Gmail +alias for multiple test accounts (e.g., neptuneblu25+test1@gmail.com)
- No automated test suite currently
- Local Stripe testing requires test mode keys and Stripe CLI tunneling

### Deployment

- Push to GitHub main branch
- Vercel auto-deploys (typically 30-60 seconds)
- Hard refresh browser to see changes (Cmd+Shift+R)
- Verify in production before marking complete

---

## Document Maintenance

This document should be updated when:
- New tables are added to the database
- New API endpoints are created
- Pricing changes
- Major features are completed
- Strategic direction shifts
- Critical bugs are discovered or fixed

When updating, change the "Last updated" date at the top.

---

**End of System Context Document**