# The Toolsmith Style Guide

Visual and editorial standards for The Toolsmith CMMS application and marketing site.

This document is the source of truth for design decisions across the product. When in doubt, reference this guide. When this guide is missing something, add it.

Last updated: June 2026

---

## Brand identity

The Toolsmith is a CMMS built for maintenance professionals who take their work seriously. The brand reads as refined, dark luxury for people who do skilled trades. Not flashy. Not childish. Not techy-cold. Closer to a well-made tool in a leather case than a Silicon Valley product page.

Three words to keep in mind: **professional, considered, durable.**

What we avoid:
- Cartoonish illustrations or emoji-heavy UI
- Bright primary colors (no electric blues or warning yellows)
- Casual or jokey microcopy
- Tech bro phrases ("crush it", "level up", "ninja", etc.)
- Anything that wouldn't fit comfortably in a small-shop maintenance office

---

## Color palette

### Primary surfaces

| Name | Hex | Usage |
|------|-----|-------|
| Charcoal | `#1a1a2e` | Main app background, page body |
| Navy | `#16213e` | Sidebar, sections, raised cards |
| Navy light | `#0f3460` | Gradient stops, hover surfaces |
| Card | `#1e2245` | Modal backgrounds, elevated cards |

### Brand accents

| Name | Hex | Usage |
|------|-----|-------|
| Gold | `#c9a84c` | Primary accent, CTAs, links, section labels |
| Gold light | `#e8c97a` | Hover states, gradient stops, secondary accent |

### Text colors

| Name | Hex | Usage |
|------|-----|-------|
| Cream | `#f8f6f1` | Primary body text on dark backgrounds |
| Muted | `#9a9db5` | Secondary text, descriptions, placeholders |
| Tertiary | `#6a6d85` | Disabled text, faint hints, separators |

### Semantic colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#98c379` | Confirmations, positive states |
| Critical | `#e06c75` | Errors, destructive actions, urgent warnings |
| Warning | `#e8c97a` | Amber alerts, "needs attention" |
| Info | `#6cb6e0` | In-progress states, neutral notifications |

### Status colors (work orders)

| Status | Hex | Background |
|--------|-----|------------|
| Open | `#c9a84c` | Default gold treatment |
| In progress | `#6cb6e0` | `rgba(108,182,224,0.12)` |
| Closed | `#6a6d85` | `rgba(106,109,133,0.12)` |

### Priority/criticality colors

| Priority | Text color | Background |
|----------|-----------|------------|
| Critical | `#e06c75` | `rgba(224,108,117,0.12)` |
| High | `#e8c97a` | `rgba(232,201,122,0.12)` |
| Standard | `#9a9db5` | `rgba(154,157,181,0.12)` |
| Routine | `#6a6d85` | `rgba(106,109,133,0.12)` |

### Border tokens

Borders use the gold accent at low opacity. The opacity changes signal hierarchy.

| Token | Value | Usage |
|-------|-------|-------|
| Standard | `1px solid rgba(201,168,76,0.18)` | Default borders on cards, sections |
| Emphasis | `1px solid rgba(201,168,76,0.4)` | Hover, focus, active states |
| Strong | `1px solid rgba(201,168,76,0.5)` | Pro badges, featured items |
| Subtle | `1px solid rgba(154,157,181,0.15)` | Quiet dividers, table rows |
| Critical | `1px solid rgba(224,108,117,0.3)` | Error states, destructive zones |

---

## Typography

### Font families

**CMMS application (toolsmith-cmms.vercel.app):**
- Body: `Inter, sans-serif`
- Headings and display: `Georgia, serif`
- Monospace: System default mono (for part numbers, codes, file paths)

**Marketing site (thetoolsmithapp.com):**
- Body: `DM Sans, sans-serif`
- Headings and display: `Cormorant Garamond, serif`

The serif headings on both surfaces give the brand its considered, almost editorial feel. The sans-serif body text keeps reading comfortable for long sessions.

### Type scale

| Token | Size | Usage |
|-------|------|-------|
| Hero | `clamp(3rem, 7vw, 5.5rem)` | Marketing hero headlines |
| Display | `2rem - 2.5rem` | Major page titles |
| H1 | `1.5rem - 1.8rem` | Page headings |
| H2 | `1.25rem` | Section headings |
| H3 | `1.05rem - 1.1rem` | Card titles, subsections |
| Body | `0.95rem - 1rem` | Paragraph text |
| Small | `0.85rem - 0.88rem` | Captions, helper text |
| Label | `0.72rem - 0.78rem` | Form labels, eyebrow text |
| Micro | `0.65rem - 0.7rem` | Badge text, tiny tags |

### Font weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | `300` | Marketing body copy (rare) |
| Regular | `400` | Default body |
| Medium | `500` | Subtle emphasis, section labels |
| Semibold | `600` | Card titles, primary emphasis |
| Bold | `700` | Badges, button text, strong emphasis |

Avoid weights heavier than 700. The brand reads better with restraint.

### Letter spacing

| Context | Value |
|---------|-------|
| Body text | `0` (normal) |
| Uppercase labels | `0.06em - 0.12em` |
| Section headers (eyebrow text) | `0.18em - 0.22em` |
| Button text | `0.06em` |
| Badge text | `0.1em - 0.12em` |

### Line height

| Context | Value |
|---------|-------|
| Body paragraphs | `1.6 - 1.75` |
| UI text in tight layouts | `1.4 - 1.5` |
| Display headings | `1.05 - 1.25` |

### Section labels (eyebrow text)

A recurring pattern in the app. Small uppercase gold text that introduces a section. Use it for things like "Manager Dashboard" or "Asset Configuration."

```css
font-size: 0.72rem;
letter-spacing: 0.22em;
text-transform: uppercase;
color: #c9a84c;
font-weight: 500;
margin-bottom: 0.35rem;
```

---

## Spacing

### Border radius

| Token | Value | Usage |
|-------|-------|-------|
| Small | `4px - 6px` | Buttons, badges, inline pills |
| Medium | `8px - 10px` | Inputs, modal corners, banners |
| Large | `12px - 14px` | Cards, raised surfaces, flyouts |

### Padding patterns

| Element | Padding |
|---------|---------|
| Page (desktop) | `2rem 2.5rem` |
| Page (mobile) | `1rem 1rem` |
| Card | `1.5rem - 2.5rem` |
| Button (small) | `0.45rem 1rem` |
| Button (medium) | `0.65rem 1.25rem` |
| Button (large) | `0.85rem 2rem` |
| Input | `0.65rem 1.1rem` |
| Banner | `0.75rem 1rem` |
| Modal | `2.5rem` |

### Vertical rhythm

Use multiples of `0.25rem` for fine spacing and `0.5rem` for larger gaps. Common values:

- Tight spacing: `0.25rem - 0.5rem`
- Default spacing: `0.75rem - 1rem`
- Section spacing: `1.5rem - 2rem`
- Page section spacing: `2.5rem - 3rem`

---

## Components

### Buttons

**Primary button (gold gradient):**

Used for the single most important action on a screen. Sign Up, Save Changes, Manage Subscription.

```css
background: linear-gradient(135deg, #c9a84c, #e8c97a);
color: #1a1a2e;
border: none;
border-radius: 8px;
padding: 0.85rem 2rem;
font-size: 0.9rem;
font-weight: 700;
letter-spacing: 0.06em;
text-transform: uppercase;
font-family: Inter, sans-serif;
cursor: pointer;
```

**Secondary button (ghost):**

For supporting actions. Cancel, Back, View Details.

```css
background: transparent;
color: #c9a84c;
border: 1px solid rgba(201,168,76,0.4);
border-radius: 6px;
padding: 0.5rem 1.25rem;
font-size: 0.85rem;
letter-spacing: 0.06em;
text-transform: uppercase;
cursor: pointer;
```

**Destructive button:**

For deletion, deactivation, removal. Use sparingly.

```css
background: transparent;
color: #e06c75;
border: 1px solid rgba(224,108,117,0.4);
border-radius: 6px;
padding: 0.5rem 1.25rem;
```

**Inline link button:**

For tertiary actions that look more like links. "Forgot password?" "Edit fields."

```css
background: transparent;
color: #c9a84c;
border: none;
padding: 0;
font-size: 0.85rem;
text-decoration: underline;
cursor: pointer;
```

### Inputs

```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(201,168,76,0.18);
border-radius: 8px;
padding: 0.8rem 1.1rem;
font-size: 0.95rem;
color: #f8f6f1;
font-family: Inter, sans-serif;
width: 100%;
box-sizing: border-box;
```

**Focus state:**

```css
border-color: #c9a84c;
outline: none;
```

**Placeholder:**

```css
color: #6a6d85;
```

### Cards and raised surfaces

Default card pattern used across Settings, Team, Assets pages.

```css
background: #16213e;
border: 1px solid rgba(154,157,181,0.15);
border-radius: 12px;
padding: 1.25rem 1.5rem;
```

For elevated cards (modals, key callouts), use the slightly purple-tinted background:

```css
background: #1e2245;
border: 1px solid rgba(201,168,76,0.18);
border-radius: 14px;
padding: 2rem 2.5rem;
```

### Banners

Four urgency tiers, each with a colored left border accent and matching background tint.

**Info banner (gold, default):**

```css
background: rgba(201,168,76,0.08);
border: 1px solid rgba(201,168,76,0.4);
border-left: 3px solid #c9a84c;
border-radius: 8px;
padding: 0.75rem 1rem;
```

**Warning banner (amber):**

```css
background: rgba(232,201,122,0.12);
border: 1px solid rgba(232,201,122,0.6);
border-left: 3px solid #e8c97a;
```

**Urgent banner (red):**

```css
background: rgba(224,108,117,0.12);
border: 1px solid rgba(224,108,117,0.6);
border-left: 3px solid #e06c75;
```

**Expired banner (dark red):**

```css
background: rgba(224,108,117,0.18);
border: 1px solid rgba(224,108,117,0.8);
border-left: 3px solid #e06c75;
```

The expired tier is for terminal states. It cannot be dismissed.

### Badges

Small uppercase pills used for tier labels, status indicators, and feature gating.

**Pro badge:**

```css
display: inline-block;
background: rgba(201,168,76,0.2);
color: #e8c97a;
font-size: 0.65rem;
letter-spacing: 0.12em;
text-transform: uppercase;
padding: 0.2rem 0.55rem;
border-radius: 4px;
font-weight: 700;
```

**Status badge:**

Same pattern, but with status-specific colors. Background opacity stays around 0.15, text uses the strong status color.

### Flyouts (slide-in panels)

Used for asset detail, part detail, and similar drawer-style interactions. Slides in from the right.

```css
position: fixed;
inset: 0;
background: rgba(0,0,0,0.6);
z-index: 100;
display: flex;
justify-content: flex-end;
```

The inner panel:

```css
width: 480px;
max-width: 100vw;
height: 100vh;
background: #1a1a2e;
border-left: 1px solid rgba(201,168,76,0.25);
display: flex;
flex-direction: column;
box-shadow: -10px 0 40px rgba(0,0,0,0.5);
```

### Modals

Centered overlay with darkened backdrop. Used for confirmations, multi-step flows like Bulk Import.

```css
position: fixed;
inset: 0;
background: rgba(0,0,0,0.6);
z-index: 100;
display: flex;
align-items: center;
justify-content: center;
padding: 2rem 1rem;
```

Inner modal:

```css
background: #1e2245;
border: 1px solid rgba(201,168,76,0.25);
border-radius: 14px;
padding: 2.5rem;
max-width: 520px;
width: 100%;
```

---

## Layout patterns

### Page structure

The standard app page has three layers stacked vertically:

1. **Fixed nav** at the top. Sticky, blurred background. Sign out, settings menu, branding.
2. **Optional sidebar** (260px wide on desktop). Sticky. Houses asset filters, navigation aids.
3. **Main content area** (`flex: 1`). Padding `2rem 2.5rem`. Contains the actual page content.

Banners sit at the top of the main content area, not above the nav.

### Mobile responsive

Below 768px:
- Sidebar collapses to top (no longer fixed-width)
- Page padding reduces to `1rem 1rem`
- Nav uses hamburger menu instead of horizontal items
- Tables become card-style stacked layouts

### Settings nav pattern

Each settings option is a button-styled row with a chevron on the right. Sections are introduced by an eyebrow label above the rows.

```html
<div className="settingsSection">
  <div className="sectionLabel">Account</div>
  <button className="settingRow">
    <div>
      <h3>Change Password</h3>
      <p>Update the password on your account</p>
    </div>
    <span className="chevron">›</span>
  </button>
</div>
```

---

## Iconography

The app currently uses Unicode symbols rather than an icon font library. This keeps the bundle small and avoids the maintenance burden of an icon set.

Standard symbols:

| Symbol | Usage |
|--------|-------|
| `›` | Chevron right (navigation, expand) |
| `‹` | Chevron left (back) |
| `×` | Close, dismiss |
| `+` | Add, create |
| `✓` | Success, confirmation |
| `⚠` | Warning |
| `!` | Urgent attention |
| `◆` | Trial banner (info tier) |
| `←` | Back navigation |

If the icon set grows beyond 10-15 symbols, consider adopting Lucide React or Heroicons (matching the brand's restrained aesthetic).

---

## Voice and tone

### Writing principles

**No em dashes.** Use commas, semicolons, or parentheses instead. This is the single hardest rule to maintain because em dashes feel natural in English prose. The discipline matters because the brand voice is built on precision.

**No filter words.** Cut "just", "really", "very", "actually", "basically." These weaken sentences without adding meaning.

**No AI filler.** Avoid "I'd love to help with that", "Let me", "Feel free to", "Don't hesitate to." Get to the point.

**Sentence case in UI.** Never Title Case in interface elements. Settings page headers, button labels, modal titles all use sentence case. Like this: "Add part" not "Add Part."

**Imperative for actions.** Buttons and form labels use the imperative voice. "Save changes" not "Save your changes." "Add asset" not "Adding a new asset."

**Friendly but professional.** This is software for working professionals. Speak to them like a colleague, not a customer.

### Microcopy patterns

**Empty states** explain what's missing and how to add it:

> Your parts inventory is empty. Add your first part or import from CSV to get started.

**Errors** explain what went wrong and how to fix it:

> Stock must be a number. Update row 47 in your CSV.

**Confirmations** are explicit, especially for destructive actions:

> Permanently delete this asset? Work order history will be preserved.

**Success messages** are brief:

> Part saved.

**Trial status** uses urgency-appropriate language:

> 14 days left in your trial (info)
> 5 days left in your trial (warning)
> Trial ends tomorrow (urgent)
> Your trial has ended (expired)

### Tone calibration by audience

**To managers:** Direct, business-aware. "Update payment method to keep access."

**To technicians:** Action-focused, no jargon. "Mark this work order complete."

**To prospective customers (marketing site):** Slightly more polished, restrained marketing language. No hype.

---

## Code conventions

### Inline styles in React

The app uses inline style objects rather than CSS modules or styled-components. This keeps each component self-contained and matches how the codebase has grown.

```jsx
const headerStyle = {
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#f8f6f1',
  margin: 0
}

<h1 style={headerStyle}>Title</h1>
```

When a component has many style objects, define them at the top of the component function before the return statement. Group related styles together.

### Color values in code

Use lowercase hex values without quotes inside style objects:

```jsx
// Good
{ color: '#c9a84c' }

// Avoid
{ color: '#C9A84C' }
```

For colors with alpha, use `rgba()`:

```jsx
{ borderColor: 'rgba(201, 168, 76, 0.18)' }
```

### Conditional styling

Use the spread pattern for conditional style merging:

```jsx
<div style={{
  ...baseStyle,
  ...(isActive && activeStyle),
  ...(hasError && errorStyle)
}}>
```

### Naming conventions

- Files: `PascalCase.jsx` for components, `camelCase.js` for utilities
- Components: `PascalCase` (e.g., `TrialBanner`)
- State variables: `camelCase` (e.g., `isUpgraded`, `portalLoading`)
- Style objects: `camelCase` (e.g., `headerStyle`, `cardWrapper`)
- Database columns: `snake_case` (e.g., `stripe_customer_id`, `trial_end`)

---

## Updating this guide

When you add a new component, color, or pattern that will recur across the app, add it here. The guide is only useful if it reflects current reality.

When you change a brand decision (palette tweak, font change, voice update), update this document in the same commit as the code change.

If a section feels stale or wrong, fix it. This is a living document.

---

*The Toolsmith Style Guide v1.0*
