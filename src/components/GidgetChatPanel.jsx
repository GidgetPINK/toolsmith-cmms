import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase'

const APP_ROUTES = ['/team', '/settings', '/assets', '/parts', '/upgrade', '/custom-fields', '/work-order']

function convertRoutesToLinks(text) {
  // Replace plain /route mentions with markdown links
  let result = text
  for (const route of APP_ROUTES) {
    const regex = new RegExp(`(?<!\\])(${route.replace('/', '\\/')})(\\b|/)`, 'g')
    result = result.replace(regex, `[$1$2](app:$1$2)`)
  }
  return result
}

export default function GidgetChatPanel({ contextType, contextData, onClose, initialMessage }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Send initial message on mount if provided
  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage, true)
    }
    // Focus input on open
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function sendMessage(text, isAutoSend = false) {
    const messageText = (text || input).trim()
    if (!messageText || sending) return

    setError('')
    setSending(true)

    // Add user message to UI immediately
    const userMessage = { role: 'user', content: messageText }
    const newMessages = isAutoSend
      ? [userMessage]
      : [...messages, userMessage]

    if (!isAutoSend) setMessages(newMessages)
    else setMessages(newMessages)
    setInput('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('You need to be logged in')
        setSending(false)
        return
      }

      const response = await fetch('/api/gidget-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: newMessages,
          contextType: contextType || 'general',
          contextData: contextData || {}
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || data.error || 'Could not reach Gidget')
        setSending(false)
        return
      }

      setMessages([...newMessages, { role: 'assistant', content: data.message }])
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Gidget chat error:', err)
    }

    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ============ STYLES ============
  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
    display: 'flex',
    justifyContent: 'flex-end'
  }

  const panel = {
    width: '420px',
    maxWidth: '100vw',
    height: '100vh',
    background: '#16213e',
    borderLeft: '1px solid rgba(201,168,76,0.25)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif'
  }

  const header = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  }

  const headerLeft = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }

  const avatar = {
    width: '36px',
    height: '36px',
    background: '#1a1a2e',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px'
  }

  const headerTitle = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a2e',
    margin: 0,
    fontFamily: 'Georgia, serif'
  }

  const headerSubtitle = {
    fontSize: '11px',
    color: 'rgba(26,26,46,0.7)',
    margin: 0
  }

  const closeBtn = {
    background: 'transparent',
    border: 'none',
    color: '#1a1a2e',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: 1
  }

  const messagesScroll = {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#1a1a2e'
  }

  const emptyState = {
    textAlign: 'center',
    color: '#9a9db5',
    fontSize: '14px',
    padding: '2rem 1rem',
    lineHeight: 1.6
  }

  function userMessageStyle() {
    return {
      background: 'rgba(108,182,224,0.15)',
      border: '1px solid rgba(108,182,224,0.25)',
      borderRadius: '12px',
      borderTopRightRadius: '4px',
      padding: '10px 14px',
      maxWidth: '85%',
      alignSelf: 'flex-end',
      fontSize: '14px',
      color: '#f8f6f1',
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap'
    }
  }

  function assistantMessageStyle() {
    return {
      background: 'rgba(201,168,76,0.1)',
      border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: '12px',
      borderTopLeftRadius: '4px',
      padding: '12px 14px',
      maxWidth: '90%',
      alignSelf: 'flex-start',
      fontSize: '14px',
      color: '#f8f6f1',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap'
    }
  }

  const typingIndicator = {
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.25)',
    borderRadius: '12px',
    borderTopLeftRadius: '4px',
    padding: '12px 16px',
    alignSelf: 'flex-start',
    fontSize: '14px',
    color: '#9a9db5',
    fontStyle: 'italic'
  }

  const errorBox = {
    background: 'rgba(224,108,117,0.12)',
    border: '1px solid rgba(224,108,117,0.4)',
    borderLeft: '3px solid #e06c75',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    color: '#e06c75',
    fontSize: '0.82rem',
    margin: '0 16px'
  }

  const inputArea = {
    borderTop: '1px solid rgba(201,168,76,0.18)',
    padding: '12px',
    background: '#16213e',
    display: 'flex',
    gap: '8px',
    flexShrink: 0
  }

  const textInput = {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f8f6f1',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    resize: 'none',
    minHeight: '40px',
    maxHeight: '120px'
  }

  const sendBtn = {
    background: sending ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.2)',
    border: '1px solid rgba(201,168,76,0.4)',
    color: '#c9a84c',
    borderRadius: '8px',
    padding: '10px 14px',
    cursor: sending ? 'wait' : 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>
        <div style={header}>
          <div style={headerLeft}>
            <div style={avatar}>✨</div>
            <div>
              <p style={headerTitle}>Gidget</p>
              <p style={headerSubtitle}>Your AI maintenance assistant</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        <div style={messagesScroll} ref={scrollRef}>
          {messages.length === 0 && !sending && (
            <div style={emptyState}>
              Hi! I'm Gidget. Ask me anything about The Toolsmith, getting started with assets, or PM recommendations for your equipment.
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={msg.role === 'user' ? userMessageStyle() : assistantMessageStyle()}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.6 }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', lineHeight: 1.5 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', lineHeight: 1.5 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ margin: '0.25rem 0' }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: '#c9a84c', fontWeight: 600 }}>{children}</strong>,
                    em: ({ children }) => <em style={{ color: '#e8c97a' }}>{children}</em>,
                    code: ({ children }) => <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace' }}>{children}</code>,
                    h1: ({ children }) => <h3 style={{ fontSize: '1rem', margin: '0.5rem 0 0.25rem 0', color: '#f8f6f1', fontWeight: 600 }}>{children}</h3>,
                    h2: ({ children }) => <h3 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem 0', color: '#f8f6f1', fontWeight: 600 }}>{children}</h3>,
                    h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', margin: '0.5rem 0 0.25rem 0', color: '#f8f6f1', fontWeight: 600 }}>{children}</h3>,
                    a: ({ href, children }) => {
                      if (href && href.startsWith('app:')) {
                        const route = href.replace('app:', '')
                        return (
                          <button
                            onClick={() => {
                              navigate(route)
                              onClose()
                            }}
                            style={{
                              background: 'rgba(201,168,76,0.2)',
                              border: '1px solid rgba(201,168,76,0.5)',
                              color: '#c9a84c',
                              borderRadius: '4px',
                              padding: '2px 10px',
                              fontSize: '0.85em',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'Inter, sans-serif',
                              display: 'inline-block',
                              margin: '0 2px'
                            }}
                          >
                            {children}
                          </button>
                        )
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#c9a84c', textDecoration: 'underline' }}>{children}</a>
                    }
                  }}
                >
                  {convertRoutesToLinks(msg.content)}
                </ReactMarkdown>
              )}
            </div>
          ))}

          {sending && (
            <div style={typingIndicator}>Gidget is thinking...</div>
          )}
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <div style={inputArea}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gidget anything..."
            disabled={sending}
            rows={1}
            style={textInput}
          />
          <button onClick={() => sendMessage()} disabled={sending || !input.trim()} style={sendBtn}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}