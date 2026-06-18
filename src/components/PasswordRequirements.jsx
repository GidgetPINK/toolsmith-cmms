const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'number', label: 'One number', test: (pw) => /[0-9]/.test(pw) }
]

export function validatePassword(password) {
  const checks = {}
  let valid = true
  for (const req of REQUIREMENTS) {
    const passed = req.test(password || '')
    checks[req.id] = passed
    if (!passed) valid = false
  }
  return { valid, checks }
}

export default function PasswordRequirements({ password = '' }) {
  const { checks } = validatePassword(password)

  return (
    <ul style={{
      listStyle: 'none',
      margin: '0.65rem 0 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem'
    }}>
      {REQUIREMENTS.map((req) => {
        const met = checks[req.id]
        return (
          <li key={req.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.78rem',
            fontFamily: 'Inter, sans-serif',
            color: met ? '#98c379' : '#9a9db5',
            transition: 'color 0.2s ease-out'
          }}>
            <span aria-hidden="true" style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              fontSize: '0.7rem',
              flexShrink: 0,
              background: met ? 'rgba(152,195,121,0.15)' : 'rgba(255,255,255,0.05)',
              border: met ? '1px solid rgba(152,195,121,0.4)' : '1px solid rgba(201,168,76,0.18)',
              transition: 'all 0.2s ease-out'
            }}>
              {met ? '✓' : ''}
            </span>
            <span>{req.label}</span>
          </li>
        )
      })}
    </ul>
  )
}