import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MANAGER_COLOR = '#c9a84c'
const TECH_COLOR = '#6cb6e0'
const PHOTO_BUCKET = 'work-order-chat-photos'

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
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoUrls, setPhotoUrls] = useState({})
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const bottomRef = useRef(null)
  const chatBodyRef = useRef(null)
  const fileInputRef = useRef(null)

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
    // Load signed URLs for any new photos
    loadPhotoUrls(messages)
  }, [messages])

  // Keyboard support for lightbox close
  useEffect(() => {
    if (!lightboxUrl) return
    function handleKey(e) {
      if (e.key === 'Escape') setLightboxUrl(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightboxUrl])

  async function loadPhotoUrls(msgList) {
    const toLoad = msgList.filter(m => m.image_url && !photoUrls[m.id])
    if (toLoad.length === 0) return
    const newUrls = { ...photoUrls }
    for (const msg of toLoad) {
      const { data } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(msg.image_url, 3600)
      if (data?.signedUrl) {
        newUrls[msg.id] = data.signedUrl
      }
    }
    setPhotoUrls(newUrls)
  }

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

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10MB')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function clearPhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadPhoto() {
    if (!photoFile) return null
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const filename = workOrderId + '/' + Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filename, photoFile, {
        cacheControl: '3600',
        upsert: false
      })
    if (error) {
      console.error('Upload error:', error)
      setUploadError('Upload failed. Please try again.')
      return null
    }
    return data.path
  }

  async function handleSend() {
    const text = newMessage.trim()
    if ((!text && !photoFile) || sending) return
    setSending(true)
    setUploadError('')

    let imagePath = null
    if (photoFile) {
      imagePath = await uploadPhoto()
      if (!imagePath) {
        setSending(false)
        return
      }
    }

    const { data, error } = await supabase
      .from('work_order_messages')
      .insert({
        work_order_id: workOrderId,
        organization_id: organizationId,
        sender_id: profile.id,
        message: text,
        image_url: imagePath
      })
      .select()
      .single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMessage('')
      clearPhoto()

      // Fire chat notification email — don't block the user on the result
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + session.access_token
            },
            body: JSON.stringify({
              type: 'chat',
              message_id: data.id,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })
          }).catch(err => console.warn('Chat notification failed:', err))
        }
      } catch (err) {
        console.warn('Could not send chat notification:', err)
      }
    } else if (error) {
      console.error('Send error:', error)
      setUploadError('Failed to send. Please try again.')
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = (newMessage.trim() || photoFile) && !sending

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
            const photoUrl = photoUrls[msg.id]

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
                      {msg.image_url && (
                        <div style={{ marginBottom: msg.message ? '8px' : '0' }}>
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt="Chat attachment"
                              onClick={() => setLightboxUrl(photoUrl)}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '240px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'block'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '120px',
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6a6d85',
                              fontSize: '0.75rem',
                              fontFamily: 'Inter, sans-serif'
                            }}>
                              Loading photo...
                            </div>
                          )}
                        </div>
                      )}
                      {msg.message && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {photoPreview && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(201,168,76,0.18)',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <img
            src={photoPreview}
            alt="Preview"
            style={{
              width: '50px',
              height: '50px',
              objectFit: 'cover',
              borderRadius: '6px',
              border: '1px solid rgba(201,168,76,0.3)'
            }}
          />
          <span style={{
            flex: 1,
            fontSize: '0.78rem',
            color: '#9a9db5',
            fontFamily: 'Inter, sans-serif'
          }}>
            Photo ready to send
          </span>
          <button
            onClick={clearPhoto}
            style={{
              background: 'none',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#9a9db5',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Remove
          </button>
        </div>
      )}

      {uploadError && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(220,80,80,0.15)',
          color: '#ff9999',
          fontSize: '0.75rem',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          borderTop: '1px solid rgba(220,80,80,0.3)'
        }}>
          {uploadError}
        </div>
      )}

      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(201,168,76,0.18)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sending ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            fontSize: '1.1rem',
            color: '#c9a84c'
          }}
          aria-label="Attach photo"
          title="Attach photo"
        >
          📷
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={photoFile ? 'Add a caption (optional)...' : 'Type a message...'}
          disabled={sending}
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
          disabled={!canSend}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: !canSend
              ? 'rgba(201,168,76,0.3)'
              : 'linear-gradient(135deg, #c9a84c, #e8c97a)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !canSend ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            fontSize: '1rem'
          }}
          aria-label="Send message"
        >
          {sending ? '...' : '➤'}
        </button>
      </div>

      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={lightboxUrl}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: '8px',
              cursor: 'default'
            }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
