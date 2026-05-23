import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Car, Users, CheckCircle, XCircle, Trash2, MessageCircle,
  MapPin, Clock, ChevronDown, ChevronUp, Plus, Navigation
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

export default function MyRides() {
  const { user, profile } = useAuthStore()
  const [rides, setRides] = useState([])
  const [myRequests, setMyRequests] = useState([]) // as passenger
  const [loading, setLoading] = useState(true)
  const [expandedRide, setExpandedRide] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type, id, message }
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab] = useState('posted') // 'posted' | 'requested'

  useEffect(() => {
    if (user?.id) loadAll()
  }, [user?.id])

  async function loadAll() {
    setLoading(true)
    await Promise.allSettled([loadMyPostedRides(), loadMyRequests()])
    setLoading(false)
  }

  async function loadMyPostedRides() {
    const { data: ridesData, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[MyRides] rides error:', error.message); return }

    // For each ride, fetch its requests with passenger profiles
    const ridesWithRequests = await Promise.all((ridesData || []).map(async ride => {
      const { data: requests } = await supabase
        .from('ride_requests')
        .select('*, passenger:users!ride_requests_passenger_id_fkey(id, full_name, avatar_url, profession, is_verified, city)')
        .eq('ride_id', ride.id)
        .order('created_at', { ascending: true })
      return { ...ride, requests: requests || [] }
    }))
    setRides(ridesWithRequests)
  }

  async function loadMyRequests() {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*, ride:rides!ride_requests_ride_id_fkey(id, origin, destination, date, departure_time, fare_per_seat, status, driver_id), driver:rides!ride_requests_ride_id_fkey(driver_id)')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[MyRides] requests error:', error.message); return }

    // Fetch driver profiles
    const items = data || []
    const driverIds = [...new Set(items.map(r => r.ride?.driver_id).filter(Boolean))]
    let driversMap = {}
    if (driverIds.length) {
      const { data: drivers } = await supabase.from('users').select('id, full_name, avatar_url, phone').in('id', driverIds)
      ;(drivers || []).forEach(d => { driversMap[d.id] = d })
    }

    setMyRequests(items.map(r => ({ ...r, driverProfile: driversMap[r.ride?.driver_id] || {} })))
  }

  // ── Driver actions ──────────────────────────────────────────────
  async function acceptRequest(requestId, passengerId, ride) {
    setActionLoading(true)
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
    if (error) { toast.error('Failed to accept: ' + error.message); setActionLoading(false); return }

    // Notify passenger
    await supabase.from('notifications').insert({
      user_id: passengerId,
      type: 'request_accepted',
      message: `Your ride request from ${ride.origin} to ${ride.destination} has been accepted! You can now chat with your driver.`,
    })
    toast.success('Request accepted!')
    setActionLoading(false)
    loadMyPostedRides()
  }

  async function rejectRequest(requestId, passengerId, ride) {
    setActionLoading(true)
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
    if (error) { toast.error('Failed to reject'); setActionLoading(false); return }

    await supabase.from('notifications').insert({
      user_id: passengerId,
      type: 'ride_cancelled',
      message: `Your ride request from ${ride.origin} to ${ride.destination} was not accepted this time.`,
    })
    toast.success('Request rejected')
    setActionLoading(false)
    loadMyPostedRides()
  }

  async function deleteRide(rideId) {
    setActionLoading(true)
    // Notify all accepted passengers
    const ride = rides.find(r => r.id === rideId)
    const accepted = (ride?.requests || []).filter(r => r.status === 'accepted')
    for (const req of accepted) {
      await supabase.from('notifications').insert({
        user_id: req.passenger_id,
        type: 'ride_cancelled',
        message: `The ride from ${ride.origin} to ${ride.destination} on ${ride.date} has been cancelled by the driver.`,
      })
    }
    const { error } = await supabase.from('rides').delete().eq('id', rideId)
    if (error) { toast.error('Failed to delete ride'); setActionLoading(false); return }
    toast.success('Ride deleted')
    setConfirm(null)
    setActionLoading(false)
    setRides(prev => prev.filter(r => r.id !== rideId))
  }

  // ── Passenger actions ───────────────────────────────────────────
  async function cancelRequest(requestId, ride) {
    setActionLoading(true)
    const { error } = await supabase
      .from('ride_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
    if (error) { toast.error('Failed to cancel'); setActionLoading(false); return }

    // Notify driver
    if (ride?.driver_id) {
      await supabase.from('notifications').insert({
        user_id: ride.driver_id,
        type: 'ride_cancelled',
        message: `${profile?.full_name || 'A passenger'} has cancelled their request for your ride from ${ride.origin} to ${ride.destination}.`,
      })
    }
    toast.success('Request cancelled')
    setConfirm(null)
    setActionLoading(false)
    loadMyRequests()
  }

  const statusColor = s => s === 'accepted' ? 'badge-green' : s === 'rejected' || s === 'cancelled' ? 'badge-red' : s === 'pending' ? 'badge-yellow' : 'badge-gray'

  if (loading) return <div className="p-6 flex justify-center py-20"><LoadingSpinner size="lg" /></div>

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">My Rides</h1>
          <p className="page-subtitle">Manage your posted rides and trip requests</p>
        </div>
        <Link to="/post-ride" className="btn-primary py-2.5 px-5 text-sm">
          <Plus className="w-4 h-4" /> Post Ride
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {[
          { key: 'posted', label: `Posted Rides (${rides.length})` },
          { key: 'requested', label: `My Requests (${myRequests.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all
              ${tab === t.key ? 'border-green-accent text-green-accent' : 'border-transparent text-text-dim hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Posted Rides Tab ── */}
      {tab === 'posted' && (
        <div className="space-y-4">
          {rides.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Car className="w-12 h-12 text-text-dim mx-auto mb-3 opacity-30" />
              <p className="text-text-dim">No rides posted yet</p>
              <Link to="/post-ride" className="btn-primary mt-4 inline-flex py-2.5 px-6 text-sm">
                <Plus className="w-4 h-4" /> Post Your First Ride
              </Link>
            </div>
          ) : (
            rides.map(ride => {
              const pendingCount = ride.requests.filter(r => r.status === 'pending').length
              const acceptedCount = ride.requests.filter(r => r.status === 'accepted').length
              const isExpanded = expandedRide === ride.id

              return (
                <div key={ride.id} className="glass rounded-xl overflow-hidden">
                  {/* Ride Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-text-primary mb-2">
                          <MapPin className="w-4 h-4 text-green-accent flex-shrink-0" />
                          {ride.origin}
                          <span className="text-text-dim font-normal">to</span>
                          {ride.destination}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-text-dim">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ride.date} at {ride.departure_time}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ride.available_seats} seats</span>
                          <span className="text-green-accent font-semibold">{formatPKR(ride.fare_per_seat)}/seat</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={statusColor(ride.status)}>{ride.status}</span>
                        {pendingCount > 0 && (
                          <span className="badge-yellow">{pendingCount} pending</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => setExpandedRide(isExpanded ? null : ride.id)}
                        className="btn-secondary py-2 px-4 text-xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Requests ({ride.requests.length})
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {acceptedCount > 0 && (
                        <Link to={`/chat/${ride.id}`} className="btn-ghost py-2 px-3 text-xs border border-border rounded-xl">
                          <MessageCircle className="w-3.5 h-3.5" /> Chat
                        </Link>
                      )}
                      {acceptedCount > 0 && (
                        <Link to={`/tracking/${ride.id}`} className="btn-ghost py-2 px-3 text-xs border border-border rounded-xl">
                          <Navigation className="w-3.5 h-3.5" /> Track
                        </Link>
                      )}
                      <button
                        onClick={() => setConfirm({ type: 'deleteRide', id: ride.id })}
                        className="ml-auto btn-ghost py-2 px-3 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Requests Panel */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {ride.requests.length === 0 ? (
                        <p className="text-text-dim text-sm text-center py-6">No requests yet</p>
                      ) : (
                        <div className="divide-y divide-border/40">
                          {ride.requests.map(req => (
                            <div key={req.id} className="p-4 flex items-center gap-3">
                              <Avatar url={req.passenger?.avatar_url} name={req.passenger?.full_name} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary">{req.passenger?.full_name}</p>
                                <p className="text-xs text-text-dim">{req.passenger?.profession} · {req.passenger?.city}</p>
                                {req.passenger?.is_verified && <span className="badge-green text-[10px] py-0 mt-1">Verified</span>}
                              </div>
                              <span className={`${statusColor(req.status)} text-xs`}>{req.status}</span>
                              {req.status === 'pending' && (
                                <div className="flex gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => acceptRequest(req.id, req.passenger_id, ride)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-accent border border-green-accent/30 rounded-lg hover:bg-green-accent/10 transition-all disabled:opacity-50"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Accept
                                  </button>
                                  <button
                                    onClick={() => rejectRequest(req.id, req.passenger_id, ride)}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── My Requests Tab ── */}
      {tab === 'requested' && (
        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <Users className="w-12 h-12 text-text-dim mx-auto mb-3 opacity-30" />
              <p className="text-text-dim">No ride requests sent yet</p>
              <Link to="/find-ride" className="btn-primary mt-4 inline-flex py-2.5 px-6 text-sm">
                Find a Ride
              </Link>
            </div>
          ) : (
            myRequests.map(req => (
              <div key={req.id} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-text-primary mb-2">
                      <MapPin className="w-4 h-4 text-green-accent flex-shrink-0" />
                      {req.ride?.origin}
                      <span className="text-text-dim font-normal">to</span>
                      {req.ride?.destination}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-text-dim">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{req.ride?.date} at {req.ride?.departure_time}</span>
                      <span className="text-green-accent font-semibold">{formatPKR(req.ride?.fare_per_seat)}/seat</span>
                    </div>
                    {req.driverProfile?.full_name && (
                      <div className="flex items-center gap-2 mt-3">
                        <Avatar url={req.driverProfile?.avatar_url} name={req.driverProfile?.full_name} size="xs" />
                        <span className="text-xs text-text-dim">Driver: <span className="text-text-primary font-medium">{req.driverProfile?.full_name}</span></span>
                      </div>
                    )}
                  </div>
                  <span className={statusColor(req.status)}>{req.status}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {req.status === 'accepted' && (
                    <>
                      <Link to={`/chat/${req.ride_id}`} className="btn-secondary py-2 px-4 text-xs">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat with Driver
                      </Link>
                      <Link to={`/tracking/${req.ride_id}`} className="btn-ghost py-2 px-3 text-xs border border-border rounded-xl">
                        <Navigation className="w-3.5 h-3.5" /> Track Driver
                      </Link>
                    </>
                  )}
                  {(req.status === 'pending' || req.status === 'accepted') && (
                    <button
                      onClick={() => setConfirm({ type: 'cancelRequest', id: req.id, ride: req.ride })}
                      className="ml-auto btn-ghost py-2 px-3 text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        danger
        title={confirm?.type === 'deleteRide' ? 'Delete Ride' : 'Cancel Request'}
        message={
          confirm?.type === 'deleteRide'
            ? 'This will permanently delete your ride and notify all accepted passengers. This cannot be undone.'
            : 'Are you sure you want to cancel this ride request?'
        }
        confirmLabel={confirm?.type === 'deleteRide' ? 'Delete Ride' : 'Cancel Request'}
        loading={actionLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm.type === 'deleteRide') deleteRide(confirm.id)
          else cancelRequest(confirm.id, confirm.ride)
        }}
      />
    </div>
  )
}
