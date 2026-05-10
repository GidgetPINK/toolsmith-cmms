export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, system } = req.body

  if (!messages || !system) {
    return res.status(400).json({ error: 'Messages and system prompt are required' })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: system },
          ...messages
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq error:', data)
      return res.status(500).json({ error: 'Groq API error', details: data })
    }

    const reply = data.choices?.[0]?.message?.content || ''
    return res.status(200).json({ reply })

  } catch (error) {
    console.error('Gidget error:', error)
    return res.status(500).json({ error: error.message })
  }
}