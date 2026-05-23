import { useState, useEffect, useRef } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

export default function NotificationBell() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()

    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unread)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function deleteNotif(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const typeLabel = (type) => {
    const map = {
      ride_request:     'New Request',
      request_accepted: 'Accepted',
      driver_arriving:  'Driver on Way',
      ride_cancelled:   'Cancelled',
      account_verified: 'Verified',
    }
    return map[type] || 'Info'
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative btn-ghost p-2.5 rounded-xl"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-bold text-text-primary text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-green-accent hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn-ghost p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-dim text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex gap-3 hover:bg-white/[0.03] transition-colors group ${!n.is_read ? 'bg-green-accent/[0.04]' : ''}`}
                >
                  <span className="text-[9px] font-bold text-green-accent bg-green-accent/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{typeLabel(n.type)}</span>
                  <div className="flex-1 min-w-0" onClick={() => !n.is_read && markRead(n.id)}>
                    <p className={`text-xs leading-relaxed ${!n.is_read ? 'text-text-primary font-medium' : 'text-text-dim'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-text-dim/60 mt-1">
                      {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!n.is_read && <span className="inline-block w-1.5 h-1.5 bg-green-accent rounded-full mt-1" />}
                  </div>
                  <button
                    onClick={() => deleteNotif(n.id)}
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-1 flex-shrink-0 self-start"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
