# Toolsmith CMMS Backlog

Deferred features, bug fixes, and product decisions that need attention but aren't blocking current work. Items roughly ordered by priority within each category.

When picking up an item from this file, move it to the relevant phase plan or open a ticket, then remove it from here.

Last updated: July 20, 2026

---

## Next session (queued July 20, 2026)

Picked up in this order.

### Reports page: two bugs

File: `src/pages/Reports.jsx`. Pro-only, so no beta tester will hit these.

1. **Completed status missing.** `STATUSES` offers open, in_progress, closed. The Completed status was added July 17 and Reports predates it. A completed work order also renders with the grey fallback badge instead of green. Fix `STATUSES` and `statusBadge()`.
2. **Priority filter never matches.** `PRIORITIES` uses `urgent`, `high`, `standard`, `low`. Work orders are created in `WorkOrderForm.jsx` with `critical`, `high`, `standard`, `routine`. Filtering by Urgent or Low returns an empty report with no error, which reads as "no work was done." Worse of the two.

### Dashboard list: hide finished work, oldest first

Files: `src/pages/Dashboard.jsx`, and mirror in `src/pages/MobileWorkOrders.jsx`.

1. **Exclude completed and closed.** `activeWorkOrders` is currently `status !== 'closed'`, so completed work still appears in the feed and counts toward TOTAL OPEN. Change to exclude both.
2. **Sort oldest first.** The fetch uses `.order('created_at', { ascending: false })`. Flip to `true` so aging open work rises to the top instead of being buried.

**Decision needed first:** if completed work orders disappear from the Dashboard, how does a manager find them to close them? Right now search is the only path, and it requires knowing a search term. Options: a Completed filter chip, a separate review queue, or accept search-only. Worth deciding before building, because it affects the four-status workflow.

### Queue search fields

File: `src/pages/Queue.jsx`. Search covers title and description only. Dashboard and MobileWorkOrders also match apartment number, created date, and asset name. Bring Queue up to match, minus tech name (the Queue loads only the signed-in tech's own work orders, so it would be meaningless).

### Asset history shows created date only

File: `src/pages/Dashboard.jsx`, AssetFlyout, around the line rendering `Assigned: {getTechName(...)} · created date`. Add the closed date so asset history reflects when work actually finished.

### Blog post #2 (marketing site)

Repo: `~/Desktop/toolsmith-site` (paste files as raw text, not accessible to Claude). Title: "5 Signs Your Team Has Outgrown Spreadsheets". Tag: Guides. CTA to `/register`. Add to the Field Notes grid and to `sitemap.xml`, then request indexing in Search Console.

### Change Log polish (only if it bothers you after using it)

New component `src/components/WorkOrderChangeLog.jsx`. Two things that may want changing once you've lived with it: it sits in the 320px chat column which is narrow for before/after values, and entries are oldest-first so recent activity requires scrolling. Both are small changes.

---

## Resolved (was in this file, now shipped)

- **Status workflow: add Completed status** — shipped July 17. Four-status model is live: Open, In Progress, Completed, Closed. The old entry under "Open product decisions" below is stale and can be deleted.

---

## Open product decisions

These need a decision before they can be built.

### Status workflow: add Completed status

**Current state:** Open → In Progress → Closed (3 statuses)

**Possible expansion:** Open → In Progress → Completed → Closed (4 statuses)

The 4-status model is industry standard for CMMS. Techs mark work Completed when finished. Managers review and move to Closed.

**Why deferred:** Small teams often don't need the manager review step. The current 3-status workflow may be sufficient for the target customer.

**Decision needed:** Stick with 3 statuses, expand to 4, or make the review step configurable per organization.

---

## High priority backlog

These are real product gaps that should be addressed before broader rollout.

### Lite team member cap enforcement
**Problem:** Marketing site promises Lite plan is capped at 10 team members. No code enforcement exists. Lite users can currently invite unlimited members.
**Required behavior:**
- Backend: api/invite-team-member.js must check current member count vs cap before creating invitation
- Frontend: Team.jsx should show cap status (e.g., "7 of 10 members") and disable invite button when at cap
- Show clear upgrade-to-Pro CTA when Lite user hits cap
- Cap applies to active members only (deactivated members don't count toward limit)
**Implementation notes:**
- Determine if cap is "10 members total" or "10 active members"
- Pro tier should be unlimited (or very high cap like 1000)
- Use organization.is_upgraded flag to differentiate
- Frontend should query current count on Team page load
- Backend must enforce server-side regardless of frontend
**Effort:** ~1-2 hours
**Pre-launch blocker:** Yes (for Lite launch)

---

### Work Order Chat
**Problem:** Lite and Pro users have no way to communicate about a work order in-app. Notes and status updates exist but there's no conversational thread tied to each work order.
**Required behavior:**
- Chat thread on each work order
- All assigned members can post and read
- Real-time updates (or polling refresh)
- Message history persists with the work order
- Available in both Lite and Pro (reclassified from Pro-only on June 18, 2026)
**Implementation notes:**
- New work_order_messages table with RLS scoped to assigned members + managers
- Real-time updates via Supabase realtime subscription
- Component on WorkOrderForm.jsx for viewing/posting
- Mobile-friendly UI for techs
- Consider notification/badge when new messages
**Effort:** 6-8 hours
**Pre-launch blocker:** Yes (now considered a core feature for both tiers)

---

### Team invitation onboarding popup (first dashboard visit)
**Problem:** New managers land on an empty dashboard with no guidance on how to invite their team. Settings → Team Management is two clicks away and not discoverable.
**Required behavior:**
- Popup or banner shown on first dashboard visit when manager has no team members invited
- Friendly tone, not blocking
- Brief explanation of how to invite (Settings → Team Management)
- For Lite users, reminder that team is capped at 10 members
- Dismissible, persists dismissed state in profile or org
- Disappears permanently once team members exist
**Implementation notes:**
- Check on Dashboard.jsx mount: is this manager? do they have zero team members?
- Show popup or banner if both true
- Store dismissed state to avoid re-showing on every visit
- Could use the same popup pattern for the "first unassigned work order" reminder below
**Effort:** ~1-1.5 hours

---

### Team invitation popup (first unassigned work order)
**Problem:** When a new manager creates their first work order without an assignee (because they have no team), there's no contextual reminder to invite their team first.
**Required behavior:**
- Popup appears when manager saves first work order with no assigned_to value
- Only triggers if manager has zero team members invited
- Gentle reminder, not blocking the save
- Offers quick "Invite a tech now" action or "Save anyway"
- Does not appear if team members exist (even unassigned would be a choice)
**Implementation notes:**
- Check on WorkOrderForm.jsx save: no assigned_to AND no team members in org AND manager role
- Show modal before save completes
- "Save anyway" closes modal and saves
- "Invite now" navigates to Team page, work order stays as unsaved draft
- This pairs naturally with the first-dashboard popup above
**Effort:** ~1 hour

---

### Password complexity requirements visible at signup
**Problem:** Registration form shows password and confirm password fields with no visible indication of complexity requirements. Users either create weak passwords OR enter password, submit, and get rejected.
**Required behavior:**
- Visible requirements list below password field
- Live validation as user types (green checkmark when each requirement met)
- Requirements: min 8 characters, at least one uppercase, at least one number (verify what Supabase requires)
- Helper text or tooltip explaining each requirement
**Implementation notes:**
- Check Supabase Auth password policy settings
- Add requirement list component to Register.jsx
- Use real-time validation (onChange)
- Same treatment on CompletePaymentSetup.jsx and ResetPassword.jsx
**Effort:** ~1-2 hours

---

### Pro signup card content (marketing site)
**Problem:** Pro plan card on toolsmith-site/index-full.html lists "Everything in Lite, Asset management, PM scheduling, Reporting and analytics, Parts tracking" but is missing key differentiators.
**Missing from Pro card:**
- Unlimited team members (vs Lite's 10)
- Gidget AI assistant (major differentiator)
- Downtime tracking (built but not listed)
**Required behavior:**
- Update Pro card to lead with strongest features
- Recommended order: Everything in Lite, Unlimited team members, Gidget AI assistant, Asset management, PM scheduling, Parts tracking, Downtime tracking, Reporting
**Effort:** ~15 minutes

---

### Subscription gate fix for Lite users
**Status:** ✅ FIXED June 18, 2026
**What was wrong:** App.jsx subscription gate checked only is_upgraded === false, which is the normal state for Lite users. This blocked all Lite users from accessing the app after signup with a "Subscription Required" page.
**The fix:** Gate now also checks for active trial (trial_end > now) and active subscription (stripe_subscription_id exists). Only blocks when ALL three are false.
**Documented here for reference. Can be removed from backlog.**

---

### Tech permissions for assets

**Problem:** Techs cannot see assets or create work orders against them. Currently only managers have asset access.

**Required behavior:**
- Techs CAN view assets (read-only)
- Techs CAN create work orders against any asset
- Techs CANNOT edit asset details
- Techs CANNOT deactivate assets
- Techs CANNOT edit custom fields
- Techs CAN edit work orders they are assigned to

**Implementation notes:**
- Update RLS policies on `assets` to allow tech select
- Add manager check on Assets.jsx edit/delete buttons
- Allow tech access to asset detail view (read-only mode)
- Update MobileAssetDetail similarly
- Verify work order creation flow lets techs select any asset

---

### Tech invitation email

**Problem:** When a manager creates a tech account, the tech does not receive an email with access details. They have no way to log in unless the manager tells them their credentials out of band.

**Required behavior:**
- When a manager invites a tech, an email is sent to the tech's address
- Email contains: welcome message, organization name, login URL, instructions to set their initial password
- Email uses a password reset token so the tech sets their own password rather than receiving one in plaintext

**Implementation notes:**
- New API endpoint `/api/invite-tech` that creates auth user with random temp password, sends password reset email
- Frontend Team.jsx update to call the new endpoint instead of creating user directly
- Email template needs to be created (Resend or similar)
- Verify ResetPassword.jsx flow works for first-time setup

---

### Scheduled work orders not tied to assets

**Problem:** Currently, scheduled recurring work can only be created via PM Scheduling, which lives inside the Asset detail flow. There's no way to schedule routine non-asset work like trash removal, facility checks, or other generic recurring tasks.

**Required behavior:**
- Standalone scheduled work orders that recur on a defined frequency
- Can be created without selecting an asset
- Same scheduling primitives as PM (every N days/weeks/months/years)
- Auto-generate work orders on schedule

**Implementation notes:**
- New table or extension to existing `pm_schedules` (or a similar table) with nullable asset_id
- New "Schedule" creation flow accessible from WorkOrderForm when no asset is selected, or from a dedicated Schedules page
- Background job (Supabase Edge Function or pg_cron) to materialize work orders on their due date
- Visible to techs on their Queue/dashboard once Phase 5 of Parts completes

---

### Techs cannot see upcoming work

**Problem:** Techs can see assigned work orders in their Queue, but there's no surface for upcoming PMs they're assigned to, or work scheduled for them in the future.

**Required behavior:**
- Tech dashboard shows upcoming work items beyond just open Queue items
- Could be a "My Schedule" section or expanded Queue with future items

**Implementation notes:**
- Decide between adding to Queue.jsx or building a dedicated schedule view
- Pull from `pm_schedules` filtered by assigned_to = current tech
- Pull from future-dated work orders assigned to tech
- Sort by due date

**Depends on:** Scheduled work orders feature above

---

### Tech routine card on dashboard

**Problem:** Managers see various dashboard cards including upcoming PMs. Techs don't have an equivalent surface for their routine work.

**Required behavior:**
- Tech dashboard (Queue.jsx or new page) shows a card or section for their assigned routine work
- Filterable by today, this week, overdue

**Depends on:** Tech permissions for assets, scheduled work orders, "techs cannot see upcoming work" above

---

## Polish and quality of life

### Gidget chat persistence with inactivity timeout
**Current state:** Closing the Gidget chat panel discards all conversation history. If the user clicks an action button (like "Go to Parts") and then reopens Gidget, the previous conversation is gone.
**Required behavior:** Persist chat history in browser sessionStorage so it survives panel close, navigation between pages, and page refreshes within a session. Auto-expire after 15-30 minutes of inactivity. Conversation clears when the browser tab is closed.
**Implementation notes:**
- Use sessionStorage to persist messages array with a timestamp
- On panel mount, check timestamp — if more than 15 minutes since last activity, start fresh
- Update timestamp on every new message
- Clear from sessionStorage if user explicitly hits a "New chat" button (future addition)
- This is Approach B from architecture discussion (vs in-memory only or database-backed)
**Effort:** ~30-45 minutes

### Verify and fix Gidget's mobile navigation knowledge
**Current state:** Gidget tells mobile users to access Settings via "a hamburger menu (☰) in the top right" which does not exist in the actual mobile UI.
**Required behavior:** Audit the actual mobile navigation structure (top bar buttons, bottom nav tabs, where Settings actually lives on mobile), then update Gidget's system prompt to accurately reflect it.
**Implementation notes:**
- Check src/pages/MobileWorkOrders.jsx and src/components/MobileBottomNav.jsx for actual mobile nav
- Update the MOBILE NAVIGATION section in api/gidget-chat.js BASE_PERSONA
- Test by asking Gidget mobile-specific questions
**Effort:** ~15-20 minutes

### Auto-refresh Downtime Now widget when events change
**Current state:** The dashboard DowntimeWidget only re-fetches data when its modal closes. If downtime is logged from the asset detail tab or another user's session, the dashboard widget shows stale data until manual refresh.
**Required behavior:** Subscribe to changes on the `downtime_events` table via Supabase realtime. When ANY insert/update/delete happens for this org's events, re-fetch widget data automatically.
**Implementation notes:**
- Use `supabase.channel('downtime_events').on('postgres_changes', ...)` pattern
- Subscribe on mount, unsubscribe on unmount
- Filter to organization_id to avoid cross-org noise
- Apply same pattern to LowStockWidget for parts changes
**Effort:** ~15-20 minutes

### Clickable event count on Downtime Now widget
**Current state:** The "Events" metric in the Downtime Now widget shows a number but is not interactive.
**Required behavior:** Clicking the event count opens a list of this month's downtime events. Either a modal or a dedicated /downtime page.
**Implementation notes:**
- Building a /downtime page is the better long-term choice since it lays groundwork for a full downtime reports view
- Should show all events from current month with filters (planned/unplanned, by asset, by reason)
- Stat cards at top mirror the widget metrics
- Click event to navigate to that asset's downtime tab
**Effort:** ~45-60 minutes for dedicated page, ~20 min for modal

### Downtime tab on mobile asset detail
**Current state:** The Downtime tab exists on desktop Asset Flyout but not on the mobile asset detail view.
**Required behavior:** Add the same Downtime tab to MobileAssetDetail.jsx with the same metrics and event history.
**Implementation notes:**
- Import AssetDowntimeTab into MobileAssetDetail.jsx
- Add Downtime to the mobile tab array
- Render the AssetDowntimeTab component conditionally
**Effort:** ~15-20 minutes

These improve the product but aren't blocking.

### Tappable stat cards on Parts page

**Behavior:** Clicking "Out of stock" card filters table to out-of-stock parts. Clicking "Below reorder" filters to low stock. Clicking "Total parts" clears filters.

**Effort:** ~30 minutes

---


**Effort:** ~15 minutes

---

### Upgrade CSV import template to xlsx format
---

### Set up Supabase custom auth domain

**Current state:** Password reset and invitation links route through Supabase's auth servers, so users briefly see a `supabase.co` URL when clicking links from emails.

**Required behavior:** Configure a custom auth subdomain (e.g., `auth.thetoolsmithapp.com`) so all auth-related URLs use your domain instead of Supabase's.

**Implementation notes:**
- Supabase dashboard: configure custom auth domain
- Cloudflare DNS: add CNAME record pointing `auth.thetoolsmithapp.com` to Supabase
- Wait for DNS propagation (usually under 5 minutes with Cloudflare)
- Verify in Supabase dashboard
- Test that reset and invitation links use the new domain

**Effort:** ~15 minutes

---

### Upgrade CSV import template to xlsx format

**Current state:** Bulk import uses CSV templates with a warning text row instructing users not to edit the headers. Validation catches header mismatches but cannot prevent them at file edit time.

**Possible upgrade:** Generate xlsx template files using SheetJS with:
- Frozen header row (always visible while scrolling)
- Protected/locked header cells (user cannot edit without unprotecting)
- Data validation dropdowns for category and unit_of_measure (Excel rejects invalid values at entry time)
- Number formatting on quantity and cost columns
- Accept both .xlsx and .csv on upload

**Why deferred:** SheetJS adds ~400KB to the bundle and the current CSV flow works correctly. Validation catches all the edge cases the lock/freeze would prevent. Should be prioritized when a real customer asks for it.

**Effort:** ~1-2 hours

---

## Post-launch (deferred infrastructure)

These were noted earlier but parked until after initial launch.

- Terms of Service generation (needs paid generator or alternative)
- Sentry error monitoring
- Photo bucket → private with signed URLs
- Rate limiting on public endpoints
- CAPTCHA on signup
- Phase 2a Gidget AI onboarding entry points
- Orphaned signup data cleanup (failed signups can prevent email reuse — foundational signup robustness)
- Database schema version control via Supabase CLI migrations
- Optional: edit Termly published Privacy Policy to remove "Anthropic" from AI providers list

---

## Current build focus

**Strategic direction (as of June 18, 2026):** Lite-first launch. Pro stays available but not actively marketed. Focus is on polishing Lite to launch-ready quality, building Capacitor wrappers for iOS and Android app stores, and submitting to stores. Pro continues to be developed in parallel but is not the launch product.

### Pre-launch (Lite launch blockers)
These must be complete before Lite can launch to app stores:
- Lite team member cap enforcement (10 max)
- Work Order Chat (reclassified to Lite, ~6-8 hours)
- Team invitation onboarding popups (first dashboard + first unassigned WO)
- Password complexity requirements at signup
- Pro signup card content update (marketing site)
- Capacitor wrapping for iOS and Android
- App store assets (icons, screenshots, descriptions)
- Apple Developer Program + Google Play Console setup
- Privacy Policy and Terms of Service review

### Post-launch Pro work
Continue building these in parallel during Lite launch, then promote Pro once Lite is established:
- Org-level timezone configuration. Currently the assignment notification email uses the assigner's browser timezone, which works for most cases but breaks down if the assigner is in a different timezone than the assignee. Proper fix: add a `timezone` column to organizations, auto-detect from the manager's browser at signup, allow override in Admin. Then email-sending code reads the org timezone instead of the request body. Cleaner architecture and works for all customers regardless of timezone.
- Push notifications for mobile app users (post-Capacitor). When the iOS and Android apps launch via Capacitor wrapping, add native push notifications for: work order assignment, new chat messages, approaching SLA breach. Push complements email rather than replacing it. Required: push notification permission flow inside the app, device token storage in profiles table, integration with FCM (Firebase Cloud Messaging) or OneSignal, backend changes to send push alongside email. Email stays for web/desktop users.
- Bundle size optimization. Main JS bundle is currently 1.3 MB which triggers Vite's 500 kB warning. Vite suggests dynamic import() to code-split the application or build.rollDownOptions.output.codeSplitting. Worth doing once we have real user traffic data to identify which routes are visited most. Faster page loads on mobile, especially over cellular.
- Cost Reporting (depends on Parts and Downtime data — both complete)
- Downtime work order integration (Downtime Tracking core loop complete)
- Asset import wizard with Gidget
- PM recommendation engine entry point
- Gidget chat persistence with sessionStorage
- Gidget natural-language reports (Pro upgrade path for Work Order Reports). Manager types a request like "show me all resident-reported HVAC issues last quarter" or "give me a surveyor report for fire safety equipment" and Gidget sets the report filters and runs the download. Same filter logic, CSV/PDF generation, and download mechanics as the existing Reports page. Adds an "Ask Gidget" card above the filters on /reports. Lite users see it as a locked Pro feature, becoming a natural upsell point inside the existing workflow.
- Configurable SLAs with due date automation. Pro upgrade path for the hard-coded Lite SLAs (Critical 4hr, High 24hr, Standard 72hr, Routine 7d). Pro adds an Admin → SLA Settings page where managers configure their own hours per priority. Could also include business-hour math (skip nights/weekends), SLA compliance reporting (% of work orders closed within SLA), and breach notifications when work orders approach or exceed SLA. Foundation already exists: due_date column, calculate_work_order_due_date trigger, card-level visual states (normal/approaching/overdue). Pro just needs the customization UI and the function logic to read from per-org settings instead of hard-coded values.

### Recently completed (June 17-18, 2026)
- Tier-aware welcome emails (Lite vs Pro)
- Subscription gate fix to allow Lite users
- SYSTEM_CONTEXT.md master reference document
