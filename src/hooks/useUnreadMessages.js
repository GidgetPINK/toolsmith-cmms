import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function useUnreadMessages(profileId) {
  const [unreadIds, setUnreadIds] = useState(new Set())

  useEffect(() => {
    if (!profileId) return
    fetchUnread()

    const channel = supabase
      .channel('unread-watcher')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_messages'
        },
        () => {
          fetchUnread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profileId])

  async function fetchUnread() {
    const [msgRes, readRes] = await Promise.all([
      supabase
        .from('work_order_messages')
        .select('work_order_id, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('work_order_message_reads')
        .select('work_order_id, last_read_at')
        .eq('user_id', profileId)
    ])

    const messages = msgRes.data || []
    const reads = readRes.data || []

    const latestByWo = {}
    messages.forEach(m => {
      if (!latestByWo[m.work_order_id] || m.created_at > latestByWo[m.work_order_id]) {
        latestByWo[m.work_order_id] = m.created_at
      }
    })

    const readByWo = {}
    reads.forEach(r => {
      readByWo[r.work_order_id] = r.last_read_at
    })

    const result = new Set()
    Object.keys(latestByWo).forEach(woId => {
      const lastMsg = latestByWo[woId]
      const lastRead = readByWo[woId]
      if (!lastRead || lastMsg > lastRead) {
        result.add(woId)
      }
    })

    setUnreadIds(result)
  }

  return unreadIds
}
