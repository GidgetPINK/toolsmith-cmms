// Define all possible actions Gidget can suggest
const ACTIONS = {
  upgrade: {
    label: 'Upgrade to Pro',
    icon: '✨',
    route: '/upgrade',
    primary: true,
    keywords: ['upgrade to pro', 'upgrading to pro', 'pro plan', 'pro tier', '$49', 'pro features', 'unlock pro', 'upgrade now']
  },
  team: {
    label: 'Go to Team',
    icon: '→',
    route: '/team',
    primary: true,
    keywords: ['team page', 'invite a tech', 'invite technician', 'invite team member', 'add a tech', 'add technician', 'manage team', 'add team member', 'invite users', 'team management']
  },
  assets: {
    label: 'View Assets',
    icon: '→',
    route: '/assets',
    primary: true,
    keywords: ['assets page', 'asset registry', 'add an asset', 'create an asset', 'add equipment', 'asset list', 'view assets', 'manage assets', 'register an asset']
  },
  parts: {
    label: 'View Parts',
    icon: '→',
    route: '/parts',
    primary: true,
    keywords: ['parts page', 'parts inventory', 'add a part', 'manage parts', 'part stock', 'inventory page', 'low stock', 'out of stock']
  },
  newWorkOrder: {
    label: 'New Work Order',
    icon: '+',
    route: '/work-order/new',
    primary: true,
    keywords: ['new work order', 'create a work order', 'create work order', 'work order form', 'submit a work order', 'new task']
  },
  settings: {
    label: 'Open Settings',
    icon: '→',
    route: '/settings',
    primary: false,
    keywords: ['settings page', 'billing portal', 'manage billing', 'change password', 'organization settings', 'account settings', 'manage subscription']
  },
  customFields: {
    label: 'Custom Fields',
    icon: '→',
    route: '/custom-fields',
    primary: false,
    keywords: ['custom fields', 'custom field', 'add field', 'asset field']
  }
}

// Special context-based suggestions
const PAGE_DEFAULTS = {
  'Dashboard': ['newWorkOrder'],
  'Work Order Detail': [],
  'Assets': ['newWorkOrder'],
  'Parts and Inventory': [],
  'Settings': [],
  'Team Management': []
}

export function getActionsForResponse(responseText, currentPage) {
  if (!responseText) return []

  const lowerText = responseText.toLowerCase()
  const matched = new Set()

  // Detect actions based on keywords in the response
  for (const [actionId, action] of Object.entries(ACTIONS)) {
    for (const keyword of action.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matched.add(actionId)
        break
      }
    }
  }

  // If nothing matched but we have page defaults, use those
  if (matched.size === 0 && currentPage && PAGE_DEFAULTS[currentPage]) {
    PAGE_DEFAULTS[currentPage].forEach(a => matched.add(a))
  }

  // Convert to action objects, primary actions first, max 3
  const actions = Array.from(matched)
    .map(id => ({ id, ...ACTIONS[id] }))
    .sort((a, b) => {
      if (a.primary && !b.primary) return -1
      if (!a.primary && b.primary) return 1
      return 0
    })
    .slice(0, 3)

  return actions
}