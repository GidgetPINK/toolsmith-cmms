import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MANAGER_COLOR = '#c9a84c'
const TECH_COLOR = '#6cb6e0'

function getInitials(name) {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatTime(dateString) {
  const d = new Date(dateString)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDateLabel(dateString) {
  const d = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WorkOrderChat({ workOrderId, profile, organizationId }) {
  const [messages, setMessages] = useState([])
  const [senders, setSenders] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const chatBodyRef = useRef(null)

  useEffect(() => {
    if (!workOrderId) return
    fetchMessages()
    fetchSenders()
    markAsRead()

    const channel = supabase
      .channel('wo-chat-' + workOrderId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_messages',
          filter: 'work_order_id=eq.' + workOrderId
        },
        (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
          markAsRead()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workOrderId])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('work_order_messages')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }

  async function fetchSenders() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
    const map = {}
    if (data) {
      data.forEach(p => { map[p.id] = p })
    }
    setSenders(map)
  }

  async function markAsRead() {
    if (!profile?.id || !workOrderId) return
    await supabase
      .from('work_order_message_reads')
      .upsert(
        {
          user_id: profile.id,
          work_order_id: workOrderId,
          last_read_at: new Date().toISOString()
        },
        { onConflict: 'user_id,work_order_id' }
      )
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('work_order_messages')
      .insert({
        work_order_id: workOrderId,
        organization_id: organizationId,
        sender_id: profile.id,
        message: newMessage.trim()
      })
      .select()
      .single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMessage('')
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  let lastDateLabel = ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(22,33,62,0.5)',
      borderRadius: '12px',
      border: '1px solid rgba(201,168,76,0.18)',
      overflow: 'hidden',
      height: '100%',
      minHeight: '380px',
      maxHeight: '600px'
    }}>

      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem', color: '#c9a84c' }}>💬</span>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#f8f6f1',
            fontFamily: 'Inter, sans-serif'
          }}>Chat</span>
        </div>
        <span style={{
          fontSize: '0.72rem',
          color: '#9a9db5',
          fontFamily: 'Inter, sans-serif'
        }}>
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div
        ref={chatBodyRef}
        style={{
          flex: 1,
          padding: '12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {loading ? (
          <p style={{
            color: '#9a9db5',
            fontSize: '0.82rem',
            textAlign: 'center',
            padding: '2rem 0',
            fontFamily: 'Inter, sans-serif'
          }}>
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 0.5rem',
            color: '#6a6d85'
          }}>
            <p style={{
              fontSize: '0.85rem',
              marginBottom: '0.3rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              No messages yet
            </p>
            <p style={{
              fontSize: '0.75rem',
              fontFamily: 'Inter, sans-serif'
            }}>
              Start a conversation about this work order
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const sender = senders[msg.sender_id]
            const isManager = sender?.role === 'manager'
            const color = isManager ? MANAGER_COLOR : TECH_COLOR
            const name = sender?.full_name || 'Unknown'
            const initials = getInitials(name)
            const dateLabel = formatDateLabel(msg.created_at)
            let showDateLabel = false
            if (dateLabel !== lastDateLabel) {
              showDateLabel = true
              lastDateLabel = dateLabel
            }

            return (
              <div key={msg.id}>
                {showDateLabel && (
                  <div style={{
                    textAlign: 'center',
                    margin: '6px 0',
                    fontSize: '0.68rem',
                    color: '#6a6d85',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {dateLabel}
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: color + '20',
                    border: '1px solid ' + color + '66',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    color: color,
                    flexShrink: 0,
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                      marginBottom: '3px'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: color,
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        {name}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        color: '#6a6d85',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div style={{
                      background: color + '14',
                      border: '1px solid ' + color + '30',
                      borderRadius: '0 10px 10px 10px',
                      padding: '8px 10px'
                    }}>
                      <p style={{
                        fontSize: '0.82rem',
                        color: '#f8f6f1',
                        margin: 0,
                        lineHeight: 1.5,
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(201,168,76,0.18)',
        display: 'flex',
        gap: '8px',
        flexShrink: 0
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '8px',
            padding: '8px 10px',
            color: '#f8f6f1',
            fontSize: '0.82rem',
            fontFamily: 'Inter, sans-serif',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: !newMessage.trim() || sending
              ? 'rgba(201,168,76,0.3)'
              : 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            fontSize: '1rem'
          }}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
