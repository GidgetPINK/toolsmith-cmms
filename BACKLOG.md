# Toolsmith CMMS Backlog

Deferred features, bug fixes, and product decisions that need attention but aren't blocking current work. Items roughly ordered by priority within each category.

When picking up an item from this file, move it to the relevant phase plan or open a ticket, then remove it from here.

Last updated: June 2026

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

- Welcome email diagnosis (code exists, didn't deliver on first test)
- Terms of Service generation (needs paid generator or alternative)
- Sentry error monitoring
- Photo bucket → private with signed URLs
- Rate limiting on public endpoints
- CAPTCHA on signup
- Phase 2a Gidget AI onboarding entry points
- First-run experience for empty dashboards
- Optional: edit Termly published Privacy Policy to remove "Anthropic" from AI providers list

---

## Current build focus

In active development:
- **Downtime Tracking** — Core loop complete (log, end, dashboard widget, email alerts, asset detail tab). Work order integration remaining.

Remaining Pro features after Downtime Tracking:
- Cost Reporting (depends on Parts and Downtime data)
- Work Order Chat (the big differentiator, ~6-8 hours)
