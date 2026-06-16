// Define all possible actions Gidget can suggest
const ACTIONS = {
  upgrade: {
    label: 'Upgrade to Pro',
    icon: '✨',
    route: '/upgrade',
    primary: true,
    keywords: ['upgrade', 'pro plan', 'pro tier', '$49', 'pro features', 'unlock pro', 'pro feature', 'on lite', 'lite plan', 'lite tier']
  },
  team: {
    label: 'Go to Team',
    icon: '→',
    route: '/team',
    primary: true,
    keywords: ['team management', 'invite a tech', 'invite technician', 'invite team member', 'add a tech', 'add technician', 'manage team', 'add team member', 'invite users', 'team page']
  },
  parts: {
    label: 'Go to Parts and Inventory',
    icon: '→',
    route: '/parts',
    primary: true,
    keywords: ['parts and inventory', 'parts inventory', 'add a part', 'manage parts', 'part stock', 'inventory alert', 'low stock', 'out of stock', 'view all parts', 'parts page']
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
    keywords: ['billing portal', 'manage billing', 'change password', 'organization settings', 'account settings', 'manage subscription', 'click settings', 'go to settings']
  },
  customFields: {
    label: 'Custom Fields',
    icon: '→',
    route: '/settings/custom-fields',
    primary: false,
    keywords: ['custom fields', 'custom field', 'add field', 'asset field']
  }
}

// Special context-based suggestions based on current page
const PAGE_DEFAULTS = {
  'Dashboard': [],
  'Work Order Detail': [],
  'Assets': [],
  'Parts and Inventory': [],
  'Settings': [],
  'Team Management': []
}

// Priority order for primary buttons when multiple match
// Lower number = higher priority
const PRIMARY_PRIORITY = {
  upgrade: 1,
  parts: 2,
  team: 3,
  newWorkOrder: 4,
  assets: 5
}

export function getActionsForResponse(responseText, currentPage, userMessage) {
  if (!responseText) return []

  const lowerResponse = responseText.toLowerCase()
  const lowerUserMessage = (userMessage || '').toLowerCase()
  const combinedText = `${lowerUserMessage} ${lowerResponse}`

  const matched = new Set()

  // Detect actions based on keywords in BOTH user question and response
  for (const [actionId, action] of Object.entries(ACTIONS)) {
    for (const keyword of action.keywords) {
      if (combinedText.includes(keyword.toLowerCase())) {
        matched.add(actionId)
        break
      }
    }
  }

  // If nothing matched but we have page defaults, use those
  if (matched.size === 0 && currentPage && PAGE_DEFAULTS[currentPage]) {
    PAGE_DEFAULTS[currentPage].forEach(a => matched.add(a))
  }

  // Convert to action objects with priority sorting
  const actions = Array.from(matched)
    .map(id => ({ id, ...ACTIONS[id] }))
    .sort((a, b) => {
      // Primary actions first
      if (a.primary && !b.primary) return -1
      if (!a.primary && b.primary) return 1
      // Among primary actions, use priority order
      if (a.primary && b.primary) {
        return (PRIMARY_PRIORITY[a.id] || 99) - (PRIMARY_PRIORITY[b.id] || 99)
      }
      return 0
    })
    .slice(0, 3)

  return actions
}