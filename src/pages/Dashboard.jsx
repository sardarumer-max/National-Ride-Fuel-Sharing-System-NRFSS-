import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Car, Search, TrendingUp, Clock, CheckCircle, ArrowRight, Bell, Plus, Zap, List, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import RideCard from '../components/ui/RideCard'
import Avatar from '../components/ui/Avatar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { profile, user } = useAuthStore()
  const navigate = useNavigate()
  const [myRides, setMyRides] = useState([])
  const [matchedRides, setMatchedRides] = useState([])
  const [notifications, setNotifications] = useState([])
  const [stats, setStats] = useState({ ridesMonth: 0, saved: 0, rating: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.id) {
      loadDashboard()
      const cleanup = subscribeNotifications()
      return cleanup
    }
  }, [user?.id])

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      await Promise.allSettled([
        loadMyRides(),
        loadMatchedRides(),
        loadNotifications(),
        loadStats(),
      ])
    } catch (e) {
      console.error('Dashboard load error:', e)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function loadMyRides() {
    const { data, error } = await supabase
      .from('rides')
      .select('id, origin, destination, date, departure_time, available_seats, fare_per_seat, status, vehicle_type')
      .eq('driver_id', user.id)
      .order('date', { ascending: false })
      .limit(6)
    if (!error) setMyRides(data || [])
    else console.warn('[Dashboard] myRides error:', error.message)
  }

  async function loadMatchedRides() {
    // Simple query without FK join — fetch driver name separately
    const { data, error } = await supabase
      .from('rides')
      .select('id, origin, destination, date, departure_time, available_seats, fare_per_seat, vehicle_type, fuel_type, status, driver_id')
      .in('status', ['upcoming', 'active'])
      .neq('driver_id', user.id)
      .gt('available_seats', 0)
      .order('created_at', { ascending: false })
      .limit(4)

    if (error) { console.warn('[Dashboard] matchedRides error:', error.message); return }

    // Fetch driver profiles separately to avoid FK name issues
    const driverIds = [...new Set((data || []).map(r => r.driver_id).filter(Boolean))]
    let driversMap = {}
    if (driverIds.length > 0) {
        const { data: drivers } = await supabase
        .from('users')
        .select('id, full_name, profession, is_verified, avg_rating, avatar_url')
        .in('id', driverIds)
      ;(drivers || []).forEach(d => { driversMap[d.id] = d })
    }

    setMatchedRides((data || []).map(r => {
      const driver = driversMap[r.driver_id] || {}
      return {
        ...r,
        driver_name:   driver.full_name || 'Driver',
        driver_avatar: driver.avatar_url || null,
        profession:    driver.profession,
        is_verified:   driver.is_verified,
        rating:        driver.avg_rating,
        match_percentage: Math.floor(Math.random() * 30 + 65),
      }
    }))
  }

  async function loadNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error) setNotifications(data || [])
    else console.warn('[Dashboard] notifications error:', error.message)
  }

  async function loadStats() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('rides')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', user.id)
      .gte('created_at', startOfMonth)
    setStats(s => ({ ...s, ridesMonth: count || 0, saved: (count || 0) * 450 }))
  }

  function subscribeNotifications() {
    if (!user?.id) return () => {}
    // Remove any existing channel with same name (handles React StrictMode double-invoke)
    const channelName = `dash-notif-${user.id}`
    supabase.removeChannel(supabase.channel(channelName))

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 5))
        toast(`${payload.new.message}`)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  async function markAllRead() {
    if (notifications.length === 0) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications([])
    toast.success('All notifications cleared')
  }

  async function requestRide(rideId) {
    if (!user?.id) { toast.error('Please log in first'); return }
    const { error } = await supabase.from('ride_requests').insert({
      ride_id: rideId,
      passenger_id: user.id,
      status: 'pending',
    })
    if (error) {
      if (error.code === '23505') toast.error('Already requested this ride')
      else toast.error('Request failed: ' + error.message)
    } else {
      toast.success('Ride request sent!')
      const ride = matchedRides.find(r => r.id === rideId)
      if (ride?.driver_id) {
        await supabase.from('notifications').insert({
          user_id: ride.driver_id,
          type: 'ride_request',
          message: `${profile?.full_name || 'Someone'} wants to join your ride from ${ride.origin} → ${ride.destination}`,
        })
      }
      // Optimistically reduce seats
      setMatchedRides(prev => prev.map(r =>
        r.id === rideId ? { ...r, available_seats: Math.max(0, r.available_seats - 1) } : r
      ))
    }
  }

  const statusBadge = (s) =>
    s === 'completed' ? 'badge-green' :
    s === 'cancelled' ? 'badge-red' :
    s === 'active' ? 'badge-blue' : 'badge-yellow'

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-text-dim mb-4"><AlertCircle className="w-12 h-12 mx-auto" /></div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Dashboard Error</h2>
        <p className="text-text-dim text-sm mb-5">{error}</p>
        <button onClick={loadDashboard} className="btn-primary py-2.5 px-6">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* ── Welcome Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-text-primary">
            Welcome back,{' '}
            <span className="gradient-text">{profile?.full_name?.split(' ')[0] || 'there'}</span>
          </h1>
          <p className="text-text-dim mt-1 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/post-ride" className="btn-primary py-2.5 px-5 text-sm">
            <Plus className="w-4 h-4" /> Post Ride
          </Link>
          <Link to="/find-ride" className="btn-secondary py-2.5 px-5 text-sm">
            <Search className="w-4 h-4" /> Find Ride
          </Link>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Car,        label: 'Rides This Month', value: stats.ridesMonth,                              color: 'text-green-accent' },
          { icon: TrendingUp, label: 'PKR Saved',         value: formatPKR(stats.saved),                      color: 'text-green-accent' },
          { icon: CheckCircle, label: 'Rating',            value: profile?.avg_rating ? `${profile.avg_rating}★` : 'N/A', color: 'text-yellow-400' },
          { icon: Bell,       label: 'Notifications',     value: notifications.length,                         color: notifications.length > 0 ? 'text-green-accent' : 'text-text-dim' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon"><Icon className="w-5 h-5" /></div>
            <div>
              <div className={`text-2xl font-black ${color}`}>{loading ? '—' : value}</div>
              <div className="text-xs text-text-dim mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── My Rides ── */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary">My Posted Rides</h2>
            <Link to="/post-ride" className="text-green-accent text-sm hover:underline flex items-center gap-1">
              Post new <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="glass rounded-xl p-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : myRides.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <Car className="w-12 h-12 text-text-dim mx-auto mb-3 opacity-40" />
              <p className="text-text-dim text-sm mb-4">No rides posted yet</p>
              <Link to="/post-ride" className="btn-primary py-2.5 px-6 text-sm inline-flex">
                <Plus className="w-4 h-4" /> Post Your First Ride
              </Link>
            </div>
          ) : (
            <div className="glass rounded-xl overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Route</th>
                    <th>Seats</th>
                    <th>Fare/Seat</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myRides.map(ride => (
                    <tr key={ride.id}>
                      <td className="text-text-dim text-xs whitespace-nowrap">{ride.date}</td>
                      <td>
                        <div className="flex items-center gap-1 text-xs max-w-[180px]">
                          <span className="font-semibold text-text-primary truncate">{ride.origin}</span>
                          <ArrowRight className="w-3 h-3 text-text-dim flex-shrink-0" />
                          <span className="truncate text-text-dim">{ride.destination}</span>
                        </div>
                      </td>
                      <td className="text-text-dim text-sm">{ride.available_seats}</td>
                      <td className="text-green-accent font-semibold text-sm">{formatPKR(ride.fare_per_seat)}</td>
                      <td><span className={statusBadge(ride.status)}>{ride.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Notifications ── */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-accent" />
              Notifications
              {notifications.length > 0 && (
                <span className="badge-green py-0.5 px-2 text-xs">{notifications.length}</span>
              )}
            </h2>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-text-dim hover:text-text-primary transition-colors">
                Clear all
              </button>
            )}
          </div>
          <div className="glass rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-6 flex justify-center"><LoadingSpinner /></div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-text-dim text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {notifications.map(n => (
                  <div key={n.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex gap-2.5">
                      <span className="w-2 h-2 bg-green-accent rounded-full mt-2 flex-shrink-0 animate-pulse" />
                      <div>
                        <p className="text-sm text-text-primary leading-snug">{n.message}</p>
                        <p className="text-xs text-text-dim mt-1">
                          {new Date(n.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nearby Rides ── */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-accent" /> Rides Available Near You
          </h2>
          <Link to="/find-ride" className="text-green-accent text-sm hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : matchedRides.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Search className="w-10 h-10 text-text-dim mx-auto mb-3 opacity-40" />
            <p className="text-text-dim text-sm">No rides available right now</p>
            <p className="text-text-dim/60 text-xs mt-1">Check back later or post your own ride</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {matchedRides.map(ride => (
              <RideCard key={ride.id} ride={ride} onRequest={requestRide} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
