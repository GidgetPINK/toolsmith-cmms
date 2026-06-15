import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase'

const APP_ROUTES = ['/team', '/settings', '/assets', '/parts', '/upgrade', '/custom-fields', '/work-order']

function convertRoutesToLinks(text) {
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

  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage, true)
    }
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

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

    const userMessage = { role: 'user', content: messageText }
    const newMessages = isAutoSend ? [userMessage] : [...messages, userMessage]

    setMessages(newMessages)
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

  return (
    <>
      <style>{`
        @keyframes gidgetFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes gidgetSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes gidgetBubbleIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gidgetPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .gidget-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 150;
          display: flex;
          justify-content: flex-end;
          animation: gidgetFadeIn 0.2s ease-out;
        }
        .gidget-panel {
          width: 440px;
          max-width: 100vw;
          height: 100vh;
          background: linear-gradient(180deg, #16213e 0%, #1a1a2e 100%);
          border-left: 1px solid rgba(201,168,76,0.25);
          display: flex;
          flex-direction: column;
          box-shadow: -16px 0 48px rgba(0,0,0,0.6);
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
          animation: gidgetSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @media (max-width: 480px) {
          .gidget-panel {
            width: 100vw;
            max-width: 100vw;
          }
        }
        .gidget-bubble-user {
          background: rgba(108,182,224,0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(108,182,224,0.3);
          border-radius: 16px;
          border-top-right-radius: 4px;
          padding: 12px 16px;
          max-width: 85%;
          align-self: flex-end;
          color: #f8f6f1;
          line-height: 1.55;
          text-align: left;
          animation: gidgetBubbleIn 0.25s ease-out;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .gidget-bubble-assistant {
          background: rgba(201,168,76,0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 16px;
          border-top-left-radius: 4px;
          padding: 14px 16px;
          max-width: 90%;
          align-self: flex-start;
          color: #f8f6f1;
          line-height: 1.6;
          text-align: left;
          animation: gidgetBubbleIn 0.25s ease-out;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .gidget-typing {
          background: rgba(201,168,76,0.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 16px;
          border-top-left-radius: 4px;
          padding: 14px 18px;
          align-self: flex-start;
          color: #c9a84c;
          font-size: 0.85rem;
          animation: gidgetBubbleIn 0.25s ease-out;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .gidget-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c9a84c;
          animation: gidgetPulse 1.4s ease-in-out infinite;
        }
        .gidget-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .gidget-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .gidget-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 10px;
          padding: 12px 14px;
          color: #f8f6f1;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          resize: none;
          min-height: 44px;
          max-height: 140px;
          line-height: 1.5;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .gidget-input:focus {
          border-color: rgba(201,168,76,0.5);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.1);
        }
        .gidget-input::placeholder {
          color: #6a6d85;
        }
        .gidget-send-btn {
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          border: none;
          color: #1a1a2e;
          border-radius: 10px;
          padding: 0 18px;
          height: 44px;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: transform 0.15s, opacity 0.2s, box-shadow 0.2s;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(201,168,76,0.2);
        }
        .gidget-send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201,168,76,0.35);
        }
        .gidget-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .gidget-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          color: #1a1a2e;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          margin: 4px 4px 4px 0;
          transition: transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 2px 6px rgba(201,168,76,0.2);
          vertical-align: middle;
        }
        .gidget-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(201,168,76,0.35);
        }
        .gidget-header {
          background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(232,201,122,0.08));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(201,168,76,0.25);
          padding: 18px 20px;
          display: grid;
          grid-template-columns: 36px 1fr 36px;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .gidget-close-btn {
          background: transparent;
          border: 1px solid rgba(201,168,76,0.25);
          color: #c9a84c;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.15s;
        }
        .gidget-close-btn:hover {
          background: rgba(201,168,76,0.1);
          transform: scale(1.05);
        }
        .gidget-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #c9a84c, #e8c97a);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(201,168,76,0.3);
        }
        .gidget-header-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #f8f6f1;
          margin: 0;
          font-family: 'Georgia', serif;
          text-align: center;
          letter-spacing: 0.01em;
        }
        .gidget-header-subtitle {
          font-size: 0.7rem;
          color: #c9a84c;
          margin: 2px 0 0 0;
          text-align: center;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .gidget-messages {
          flex: 1;
          padding: 20px 18px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .gidget-messages::-webkit-scrollbar {
          width: 6px;
        }
        .gidget-messages::-webkit-scrollbar-thumb {
          background: rgba(201,168,76,0.2);
          border-radius: 3px;
        }
        .gidget-input-area {
          border-top: 1px solid rgba(201,168,76,0.2);
          padding: 14px 16px 18px 16px;
          background: rgba(22,33,62,0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .gidget-empty {
          text-align: center;
          color: #9a9db5;
          font-size: 14px;
          padding: 2.5rem 1.5rem;
          line-height: 1.7;
        }
        .gidget-empty-title {
          color: #c9a84c;
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .gidget-error {
          background: rgba(224,108,117,0.12);
          border: 1px solid rgba(224,108,117,0.4);
          border-left: 3px solid #e06c75;
          border-radius: 8px;
          padding: 0.7rem 0.9rem;
          color: #e06c75;
          font-size: 0.82rem;
          margin: 0 16px 8px 16px;
        }
      `}</style>

      <div className="gidget-overlay" onClick={onClose}>
        <div className="gidget-panel" onClick={e => e.stopPropagation()}>
          <div className="gidget-header">
            <div className="gidget-avatar">✨</div>
            <div>
              <p className="gidget-header-title">Gidget</p>
              <p className="gidget-header-subtitle">AI assistant</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="gidget-close-btn">×</button>
          </div>

          <div className="gidget-messages" ref={scrollRef}>
            {messages.length === 0 && !sending && (
              <div className="gidget-empty">
                <p className="gidget-empty-title">Hi, I'm Gidget</p>
                <p style={{ margin: 0 }}>
                  Ask me about The Toolsmith, getting started with your facility's assets, or PM recommendations for your equipment.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.role === 'user' ? 'gidget-bubble-user' : 'gidget-bubble-assistant'}
                style={{ fontSize: '14px' }}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 0.6rem 0', lineHeight: 1.6, textAlign: 'left' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', lineHeight: 1.6, textAlign: 'left' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', lineHeight: 1.6, textAlign: 'left' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ margin: '0.3rem 0' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ color: '#e8c97a', fontWeight: 600 }}>{children}</strong>,
                      em: ({ children }) => <em style={{ color: '#e8c97a' }}>{children}</em>,
                      code: ({ children }) => <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'monospace', color: '#e8c97a' }}>{children}</code>,
                      h1: ({ children }) => <h3 style={{ fontSize: '1rem', margin: '0.6rem 0 0.4rem 0', color: '#f8f6f1', fontWeight: 600, textAlign: 'left' }}>{children}</h3>,
                      h2: ({ children }) => <h3 style={{ fontSize: '0.95rem', margin: '0.6rem 0 0.4rem 0', color: '#f8f6f1', fontWeight: 600, textAlign: 'left' }}>{children}</h3>,
                      h3: ({ children }) => <h3 style={{ fontSize: '0.9rem', margin: '0.6rem 0 0.4rem 0', color: '#f8f6f1', fontWeight: 600, textAlign: 'left' }}>{children}</h3>,
                      a: ({ href, children }) => {
                        if (href && href.startsWith('app:')) {
                          const route = href.replace('app:', '')
                          const buttonLabel = getRouteLabel(route)
                          return (
                            <button
                              onClick={() => {
                                navigate(route)
                                onClose()
                              }}
                              className="gidget-action-btn"
                            >
                              {buttonLabel} →
                            </button>
                          )
                        }
                        return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#e8c97a', textDecoration: 'underline' }}>{children}</a>
                      }
                    }}
                  >
                    {convertRoutesToLinks(msg.content)}
                  </ReactMarkdown>
                )}
              </div>
            ))}

            {sending && (
              <div className="gidget-typing">
                <span>Gidget is thinking</span>
                <span className="gidget-typing-dot"></span>
                <span className="gidget-typing-dot"></span>
                <span className="gidget-typing-dot"></span>
              </div>
            )}
          </div>

          {error && <div className="gidget-error">{error}</div>}

          <div className="gidget-input-area">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Gidget anything..."
              disabled={sending}
              rows={1}
              className="gidget-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="gidget-send-btn"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function getRouteLabel(route) {
  const labels = {
    '/upgrade': 'Upgrade now',
    '/team': 'Go to team',
    '/settings': 'Open settings',
    '/assets': 'View assets',
    '/parts': 'View parts',
    '/custom-fields': 'Custom fields',
    '/work-order': 'New work order'
  }
  return labels[route] || `Go to ${route}`
}