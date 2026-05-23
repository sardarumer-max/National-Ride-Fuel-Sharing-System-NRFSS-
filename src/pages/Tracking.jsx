import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, Navigation, MapPin, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

// Custom map markers
const driverIcon = L.divIcon({
  html: `<div style="
    width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,#16a34a,#22c55e);
    border:3px solid white;box-shadow:0 0 12px rgba(34,197,94,0.6);
    display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;
  ">D</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

const passengerIcon = L.divIcon({
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#2563eb,#3b82f6);
    border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);
    display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:bold;
  ">P</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [60, 60] })
    } else if (positions.length === 1) {
      map.setView(positions[0], 14)
    }
  }, [positions, map])
  return null
}

export default function Tracking() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [ride, setRide] = useState(null)
  const [isDriver, setIsDriver] = useState(false)
  const [driverLoc, setDriverLoc] = useState(null) // { lat, lng }
  const [passengerLoc, setPassengerLoc] = useState(null)
  const [driverProfile, setDriverProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const watchRef    = useRef(null)
  const intervalRef  = useRef(null)
  const channelRef   = useRef(null)

  useEffect(() => {
    if (!user?.id || !rideId) return
    initialize()
    return () => {
      cleanup()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id, rideId])

  async function initialize() {
    setLoading(true)

    const { data: rideData, error } = await supabase
      .from('rides')
      .select('*, driver:users!rides_driver_id_fkey(id, full_name, avatar_url)')
      .eq('id', rideId)
      .single()
    if (error || !rideData) { toast.error('Ride not found'); navigate('/my-rides'); return }
    setRide(rideData)
    setDriverProfile(rideData.driver)

    const driverCheck = rideData.driver_id === user.id
    setIsDriver(driverCheck)

    if (!driverCheck) {
      const { data: req } = await supabase
        .from('ride_requests')
        .select('id')
        .eq('ride_id', rideId)
        .eq('passenger_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle()
      if (!req) { toast.error('Access denied'); navigate('/my-rides'); return }
    }
    setAuthorized(true)

    // Load existing locations
    const { data: locs } = await supabase
      .from('locations')
      .select('*')
      .eq('ride_id', rideId)
    ;(locs || []).forEach(loc => {
      if (loc.user_id === rideData.driver_id) setDriverLoc({ lat: loc.lat, lng: loc.lng })
      else setPassengerLoc({ lat: loc.lat, lng: loc.lng })
    })

    // Subscribe to location updates — .on() must come before .subscribe()
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`tracking-${rideId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'locations',
        filter: `ride_id=eq.${rideId}`,
      }, payload => {
        const loc = payload.new
        if (loc.user_id === rideData.driver_id) setDriverLoc({ lat: loc.lat, lng: loc.lng })
        else setPassengerLoc({ lat: loc.lat, lng: loc.lng })
      })
      .subscribe()

    setLoading(false)
  }

  const pushLocation = useCallback(async (lat, lng) => {
    await supabase.from('locations').upsert({
      user_id: user.id,
      ride_id: rideId,
      lat,
      lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,ride_id' })
  }, [user?.id, rideId])

  async function startBroadcasting() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }

    setBroadcasting(true)

    // Immediate first read
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        await pushLocation(lat, lng)
        if (isDriver) {
          // Notify all accepted passengers the driver is on the way
          const { data: accepted } = await supabase
            .from('ride_requests')
            .select('passenger_id')
            .eq('ride_id', rideId)
            .eq('status', 'accepted')
          for (const r of (accepted || [])) {
            await supabase.from('notifications').insert({
              user_id: r.passenger_id,
              type: 'driver_arriving',
              message: `Your driver ${profile?.full_name || 'Driver'} has started tracking and is on the way to pick you up!`,
            })
          }
          toast.success('Passengers notified — you are now live!')
        }
      },
      err => { toast.error('Could not get location: ' + err.message); setBroadcasting(false) },
      { enableHighAccuracy: true }
    )

    // Watch position every 5s
    watchRef.current = navigator.geolocation.watchPosition(
      pos => pushLocation(pos.coords.latitude, pos.coords.longitude),
      err => console.warn('[Tracking] watchPosition error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }

  function stopBroadcasting() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setBroadcasting(false)
    toast('Location sharing stopped')
  }

  function cleanup() {
    stopBroadcasting()
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const distance = driverLoc && passengerLoc
    ? haversine(driverLoc.lat, driverLoc.lng, passengerLoc.lat, passengerLoc.lng)
    : null

  const positions = [driverLoc, passengerLoc].filter(Boolean).map(l => [l.lat, l.lng])
  const defaultCenter = [33.6844, 73.0479] // Islamabad fallback

  if (loading) return <div className="flex justify-center items-center py-20"><LoadingSpinner size="lg" /></div>
  if (!authorized) return null

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">{ride?.origin} → {ride?.destination}</p>
          <p className="text-xs text-text-dim">Live Tracking · {ride?.date}</p>
        </div>
        {distance !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-black text-green-accent">{distance.toFixed(1)} km</p>
            <p className="text-[10px] text-text-dim">apart</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <FitBounds positions={positions} />

          {driverLoc && (
            <Marker position={[driverLoc.lat, driverLoc.lng]} icon={driverIcon}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm">{driverProfile?.full_name || 'Driver'}</p>
                  <p className="text-xs text-gray-500">Driver</p>
                </div>
              </Popup>
            </Marker>
          )}
          {passengerLoc && (
            <Marker position={[passengerLoc.lat, passengerLoc.lng]} icon={passengerIcon}>
              <Popup>
                <div className="text-center p-1">
                  <p className="font-bold text-sm">{!isDriver ? 'You' : 'Passenger'}</p>
                  <p className="text-xs text-gray-500">Passenger</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Overlay info panel */}
        <div className="absolute bottom-4 left-4 right-4 z-[400]">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Driver info */}
              <div className="flex items-center gap-3">
                <Avatar url={driverProfile?.avatar_url} name={driverProfile?.full_name} size="sm" />
                <div>
                  <p className="text-sm font-bold text-text-primary">{driverProfile?.full_name}</p>
                  <p className="text-xs text-text-dim flex items-center gap-1">
                    {driverLoc
                      ? <><span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" /> Live location active</>
                      : <><span className="w-2 h-2 bg-text-dim rounded-full inline-block" /> Waiting for location...</>
                    }
                  </p>
                </div>
              </div>

              {/* Broadcast button */}
              <button
                onClick={broadcasting ? stopBroadcasting : startBroadcasting}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  broadcasting
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'btn-primary'
                }`}
              >
                {broadcasting ? <><WifiOff className="w-4 h-4" /> Stop Sharing</> : <><Wifi className="w-4 h-4" /> Share Location</>}
              </button>
            </div>

            {distance !== null && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm">
                <Navigation className="w-4 h-4 text-green-accent" />
                <span className="text-text-dim">Distance between driver and passenger:</span>
                <span className="text-green-accent font-bold">{distance.toFixed(2)} km</span>
                <span className="text-text-dim text-xs">(approx. {Math.round(distance / 30 * 60)} min)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
