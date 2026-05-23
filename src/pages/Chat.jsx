import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, ArrowLeft, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Chat() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [ride, setRide] = useState(null)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState({}) // userId -> profile
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const channelRef = useRef(null)

  useEffect(() => {
    if (!user?.id || !rideId) return
    initialize()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, rideId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initialize() {
    setLoading(true)

    // Load ride info
    const { data: rideData, error: rideErr } = await supabase
      .from('rides')
      .select('*, driver:users!rides_driver_id_fkey(id, full_name, avatar_url, profession)')
      .eq('id', rideId)
      .single()

    if (rideErr || !rideData) {
      toast.error('Ride not found')
      navigate('/my-rides')
      return
    }
    setRide(rideData)

    // Check authorization: must be driver OR accepted passenger
    const isDriver = rideData.driver_id === user.id
    let isPassenger = false
    if (!isDriver) {
      const { data: req } = await supabase
        .from('ride_requests')
        .select('id')
        .eq('ride_id', rideId)
        .eq('passenger_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle()
      isPassenger = !!req
    }

    if (!isDriver && !isPassenger) {
      toast.error('You are not part of this ride')
      navigate('/my-rides')
      return
    }
    setAuthorized(true)

    // Build participants map (driver + all accepted passengers)
    const partMap = {}
    if (rideData.driver) partMap[rideData.driver.id] = rideData.driver

    const { data: acceptedReqs } = await supabase
      .from('ride_requests')
      .select('passenger_id, passenger:users!ride_requests_passenger_id_fkey(id, full_name, avatar_url, profession)')
      .eq('ride_id', rideId)
      .eq('status', 'accepted')
    ;(acceptedReqs || []).forEach(r => {
      if (r.passenger) partMap[r.passenger.id] = r.passenger
    })
    setParticipants(partMap)

    // Load messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('ride_id', rideId)
      .order('created_at', { ascending: true })
    setMessages(msgs || [])
    setLoading(false)

    // Subscribe to new messages — must call .on() BEFORE .subscribe()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`chat-${rideId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `ride_id=eq.${rideId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()
  }

  async function sendMessage(e) {
    e?.preventDefault()
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    setText('')

    const { error } = await supabase.from('messages').insert({
      ride_id: rideId,
      sender_id: user.id,
      content,
    })

    if (error) {
      toast.error('Failed to send message')
      setText(content) // restore
    }
    setSending(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  function formatDateGroup(ts) {
    const d = new Date(ts)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  if (loading) return <div className="flex justify-center items-center h-full py-20"><LoadingSpinner size="lg" /></div>
  if (!authorized) return null

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-green-accent/10 border border-green-accent/20 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-green-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{ride?.origin} → {ride?.destination}</p>
            <p className="text-xs text-text-dim">{ride?.date} · {Object.keys(participants).length} participant{Object.keys(participants).length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex -space-x-2 flex-shrink-0">
          {Object.values(participants).slice(0, 3).map(p => (
            <Avatar key={p.id} url={p.avatar_url} name={p.full_name} size="xs" className="border-2 border-bg-secondary" />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-text-dim text-sm py-12">
            <MessageCircleIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-dim px-2">{formatDateGroup(msgs[0].created_at)}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {msgs.map((msg, i) => {
              const isMe = msg.sender_id === user.id
              const sender = participants[msg.sender_id]
              const prevMsg = msgs[i - 1]
              const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8">
                    {showAvatar && !isMe && (
                      <Avatar url={sender?.avatar_url} name={sender?.full_name} size="xs" />
                    )}
                  </div>

                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showAvatar && (
                      <p className={`text-[10px] text-text-dim mb-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {isMe ? 'You' : sender?.full_name || 'User'}
                      </p>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-green-600/80 text-white rounded-tr-sm'
                        : 'bg-white/[0.07] text-text-primary rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-text-dim/60 mt-1 px-1">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-bg-secondary">
        <form onSubmit={sendMessage} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="input flex-1 resize-none min-h-[44px] max-h-28 py-3 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px' }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="btn-primary py-3 px-4 flex-shrink-0 disabled:opacity-40"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// Inline icon for empty state
function MessageCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}
