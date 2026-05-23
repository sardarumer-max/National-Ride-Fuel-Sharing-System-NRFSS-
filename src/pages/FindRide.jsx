import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Search, SlidersHorizontal, X, MapPin, Navigation, List, Map, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

// ── Custom Map Markers ─────────────────────────────────────────────────────
const myLocationIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
})
const rideIcon = L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#22c55e);border:2px solid white;box-shadow:0 4px 12px rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold">R</div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 18],
})
const rideHighlightIcon = L.divIcon({
  html: `<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ca8a04,#facc15);border:3px solid white;box-shadow:0 4px 16px rgba(250,204,21,0.6);display:flex;align-items:center;justify-content:center;color:#1a1a1a;font-size:15px;font-weight:bold">R</div>`,
  className: '', iconSize: [42, 42], iconAnchor: [21, 21],
})

// Map auto-fit
function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (!positions?.length) return
    if (positions.length === 1) { map.setView(positions[0], 13); return }
    try { map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] }) } catch {}
  }, [positions?.length])
  return null
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Geocode a city/place string to [lat, lng] using Nominatim
async function geocode(query) {
  if (!query?.trim()) return null
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Pakistan')}&format=json&limit=1`)
    const data = await res.json()
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {}
  return null
}

const FILTER_CHIPS = [
  { key: 'bike',     label: 'Bike' },
  { key: 'car',      label: 'Car' },
  { key: 'van',      label: 'Van' },
  { key: 'verified', label: 'Verified Only' },
  { key: 'morning',  label: 'Morning' },
  { key: 'evening',  label: 'Evening' },
]

function routeScore(ride, from, to) {
  if (!from && !to) return 75
  const norm = s => (s || '').toLowerCase()
  const fromMatch = from && norm(ride.origin).includes(norm(from.split(' ')[0]))
  const toMatch   = to   && norm(ride.destination).includes(norm(to.split(' ')[0]))
  if (fromMatch && toMatch) return 95
  if (fromMatch || toMatch) return 65
  return 40
}

export default function FindRide() {
  const { user } = useAuthStore()
  const [rides, setRides]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState({ from: '', to: '', date: '', passengers: 1 })
  const [filters, setFilters]           = useState(new Set())
  const [sort, setSort]                 = useState('match')
  const [view, setView]                 = useState('split') // 'list' | 'map' | 'split'
  const [selectedRide, setSelectedRide] = useState(null)
  const [requestLoading, setReqLoading] = useState(false)
  const [myLocation, setMyLocation]     = useState(null)   // [lat, lng]
  const [myLocLoading, setMyLocLoading] = useState(false)
  const [rideCoords, setRideCoords]     = useState({})     // rideId -> [lat, lng]
  const [highlightId, setHighlightId]   = useState(null)
  const mapRef = useRef(null)

  useEffect(() => { fetchRides() }, [])

  // ── Fetch all rides ────────────────────────────────────────────────────
  async function fetchRides() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('id, origin, destination, date, departure_time, available_seats, fare_per_seat, vehicle_type, fuel_type, status, driver_id')
        .in('status', ['upcoming', 'active'])
        .gt('available_seats', 0)
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error

      const rideData = (data || []).filter(r => r.driver_id !== user?.id)

      // Fetch driver profiles
      const driverIds = [...new Set(rideData.map(r => r.driver_id).filter(Boolean))]
      let driversMap = {}
      if (driverIds.length) {
        const { data: drivers } = await supabase
          .from('users')
          .select('id, full_name, profession, is_verified, avg_rating, avatar_url')
          .in('id', driverIds)
        ;(drivers || []).forEach(d => { driversMap[d.id] = d })
      }

      const enriched = rideData.map(r => {
        const driver = driversMap[r.driver_id] || {}
        return {
          ...r,
          driver_name:   driver.full_name   || 'Driver',
          driver_avatar: driver.avatar_url  || null,
          profession:    driver.profession,
          is_verified:   driver.is_verified,
          rating:        driver.avg_rating,
        }
      })
      setRides(enriched)

      // Geocode ride origins/destinations in background
      geocodeRides(enriched)
    } catch (err) {
      toast.error('Failed to load rides')
      console.error('[FindRide]', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Geocode ride locations for map markers ──────────────────────────────
  async function geocodeRides(rideList) {
    const coordsMap = {}
    const promises = rideList.slice(0, 20).map(async r => {
      const origin = await geocode(r.origin)
      if (origin) coordsMap[r.id] = origin
    })
    await Promise.allSettled(promises)
    setRideCoords(prev => ({ ...prev, ...coordsMap }))
  }

  // ── Get my current GPS location ─────────────────────────────────────────
  async function getMyLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setMyLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = [pos.coords.latitude, pos.coords.longitude]
        setMyLocation(loc)
        setMyLocLoading(false)
        // Reverse geocode to fill "from" field
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc[0]}&lon=${loc[1]}&format=json`)
          const data = await res.json()
          const city = data?.address?.city || data?.address?.town || data?.address?.suburb || data?.address?.county || ''
          if (city) setSearch(s => ({ ...s, from: city }))
        } catch {}
      },
      err => {
        toast.error('Could not get location: ' + err.message)
        setMyLocLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Filter & sort logic ─────────────────────────────────────────────────
  const filtered = useCallback(() => {
    return rides
      .map(r => ({ ...r, match_percentage: routeScore(r, search.from, search.to) }))
      .filter(r => {
        if (filters.has('verified') && !r.is_verified) return false
        if (filters.has('bike')    && r.vehicle_type !== 'bike') return false
        if (filters.has('car')     && r.vehicle_type !== 'car')  return false
        if (filters.has('van')     && r.vehicle_type !== 'van')  return false
        if (filters.has('morning') && parseInt(r.departure_time) >= 12) return false
        if (filters.has('evening') && parseInt(r.departure_time) < 17)  return false
        if (search.from && !r.origin?.toLowerCase().includes(search.from.toLowerCase()) && r.match_percentage < 50) return false
        if (search.to   && !r.destination?.toLowerCase().includes(search.to.toLowerCase())  && r.match_percentage < 50) return false
        if (search.date && r.date && r.date !== search.date) return false
        return true
      })
      .sort((a, b) => {
        // If user location available, sort by distance to origin
        if (sort === 'match') {
          if (myLocation && rideCoords[a.id] && rideCoords[b.id]) {
            const distA = haversine(myLocation[0], myLocation[1], rideCoords[a.id][0], rideCoords[a.id][1])
            const distB = haversine(myLocation[0], myLocation[1], rideCoords[b.id][0], rideCoords[b.id][1])
            return distA - distB
          }
          return b.match_percentage - a.match_percentage
        }
        if (sort === 'price_asc')  return (a.fare_per_seat || 0) - (b.fare_per_seat || 0)
        if (sort === 'price_desc') return (b.fare_per_seat || 0) - (a.fare_per_seat || 0)
        if (sort === 'time')       return (a.departure_time || '').localeCompare(b.departure_time || '')
        return 0
      })
  }, [rides, filters, search, sort, myLocation, rideCoords])

  const displayRides = filtered()

  // ── Toggle filter chip ──────────────────────────────────────────────────
  function toggleFilter(key) {
    setFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Request a ride ──────────────────────────────────────────────────────
  async function requestRide(ride) {
    if (!user) { toast.error('Please log in first'); return }
    setReqLoading(true)
    try {
      // Check for existing request
      const { data: existing } = await supabase
        .from('ride_requests')
        .select('id, status')
        .eq('ride_id', ride.id)
        .eq('passenger_id', user.id)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'pending')  { toast('You already have a pending request for this ride'); setReqLoading(false); return }
        if (existing.status === 'accepted') { toast.success('Your request is already accepted!'); setReqLoading(false); return }
      }

      const { error } = await supabase.from('ride_requests').insert({
        ride_id:      ride.id,
        passenger_id: user.id,
        status:       'pending',
        seats_requested: 1,
      })
      if (error) throw error

      // Notify driver
      await supabase.from('notifications').insert({
        user_id: ride.driver_id,
        type:    'ride_request',
        message: `New ride request for your trip from ${ride.origin} to ${ride.destination}. Check My Rides to accept or reject.`,
      })
      toast.success('Request sent! The driver will be notified.')
      setSelectedRide(null)
    } catch (err) {
      toast.error('Failed to send request: ' + err.message)
    } finally {
      setReqLoading(false)
    }
  }

  // ── Map positions for FitBounds ─────────────────────────────────────────
  const mapPositions = [
    ...(myLocation ? [myLocation] : []),
    ...displayRides.filter(r => rideCoords[r.id]).map(r => rideCoords[r.id]).slice(0, 10),
  ]

  const defaultCenter = myLocation || [33.6844, 73.0479]

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-border bg-bg-secondary px-4 py-3 space-y-3">
        {/* Search Row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
            <input
              placeholder="From (city / area)"
              value={search.from}
              onChange={e => setSearch(s => ({ ...s, from: e.target.value }))}
              className="input pl-9 py-2.5 text-sm h-10"
            />
          </div>
          <div className="relative flex-1 min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-accent" />
            <input
              placeholder="To (city / destination)"
              value={search.to}
              onChange={e => setSearch(s => ({ ...s, to: e.target.value }))}
              className="input pl-9 py-2.5 text-sm h-10"
            />
          </div>
          <input
            type="date"
            value={search.date}
            onChange={e => setSearch(s => ({ ...s, date: e.target.value }))}
            className="input py-2.5 text-sm h-10 w-36"
          />
          <button
            onClick={getMyLocation}
            disabled={myLocLoading}
            title="Use my current location"
            className={`h-10 px-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all
              ${myLocation ? 'border-green-accent text-green-accent bg-green-accent/10' : 'border-border text-text-dim hover:border-green-accent hover:text-green-accent'}`}
          >
            {myLocLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            {myLocation ? 'Located' : 'My Location'}
          </button>
          <button
            onClick={fetchRides}
            className="h-10 px-4 btn-primary py-0"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>

        {/* Filters + Sort + View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {FILTER_CHIPS.map(f => (
              <button
                key={f.key}
                onClick={() => toggleFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${filters.has(f.key)
                    ? 'bg-green-accent/15 border-green-accent text-green-accent'
                    : 'border-border text-text-dim hover:border-border-light hover:text-text-primary'}`}
              >
                {f.label}
              </button>
            ))}
            {filters.size > 0 && (
              <button onClick={() => setFilters(new Set())} className="px-2 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-xs border border-border bg-bg-card text-text-dim px-2 py-1.5 rounded-lg"
          >
            <option value="match">{myLocation ? 'Nearest First' : 'Best Match'}</option>
            <option value="price_asc">Cheapest First</option>
            <option value="price_desc">Most Expensive</option>
            <option value="time">Earliest Time</option>
          </select>

          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            {[
              { key: 'list', icon: List },
              { key: 'split', icon: SlidersHorizontal },
              { key: 'map', icon: Map },
            ].map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`p-2 transition-all ${view === key ? 'bg-green-accent/15 text-green-accent' : 'text-text-dim hover:text-text-primary hover:bg-white/5'}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            {loading ? 'Loading...' : `${displayRides.length} ride${displayRides.length !== 1 ? 's' : ''} found`}
            {myLocation && <span className="text-green-accent ml-2">• Sorted by distance from your location</span>}
          </span>
          {search.from && search.to && (
            <span className="text-green-accent font-medium">Showing rides: {search.from} → {search.to}</span>
          )}
        </div>
      </div>

      {/* ── Main Content: Split / List / Map ──────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* ── Ride List Panel ── */}
        {(view === 'list' || view === 'split') && (
          <div className={`overflow-y-auto ${view === 'split' ? 'w-1/2 border-r border-border' : 'w-full'}`}>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : displayRides.length === 0 ? (
              <div className="text-center py-20 text-text-dim">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No rides found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {displayRides.map(ride => {
                  const dist = myLocation && rideCoords[ride.id]
                    ? haversine(myLocation[0], myLocation[1], rideCoords[ride.id][0], rideCoords[ride.id][1])
                    : null

                  return (
                    <div
                      key={ride.id}
                      onClick={() => { setHighlightId(ride.id); setSelectedRide(ride) }}
                      className={`p-4 cursor-pointer transition-all hover:bg-bg-card
                        ${highlightId === ride.id ? 'bg-green-accent/5 border-l-2 border-green-accent' : ''}`}
                    >
                      {/* Route */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-green-accent flex-shrink-0" />
                          <span className="text-sm font-bold text-text-primary truncate">{ride.origin}</span>
                          <span className="text-text-dim text-xs">→</span>
                          <span className="text-sm font-bold text-text-primary truncate">{ride.destination}</span>
                        </div>
                        <span className="text-green-accent font-black text-sm flex-shrink-0">{formatPKR(ride.fare_per_seat)}</span>
                      </div>

                      {/* Driver + Meta */}
                      <div className="flex items-center gap-3">
                        <Avatar url={ride.driver_avatar} name={ride.driver_name} size="xs" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-text-primary">{ride.driver_name}</span>
                            {ride.is_verified && <span className="badge-green text-[9px] py-0">Verified</span>}
                          </div>
                          <div className="text-[10px] text-text-dim mt-0.5 flex gap-2">
                            <span>{ride.date} · {ride.departure_time}</span>
                            <span>{ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''}</span>
                            <span className="capitalize">{ride.vehicle_type}</span>
                          </div>
                        </div>
                        {dist !== null && (
                          <span className="text-[10px] text-text-dim flex-shrink-0 bg-bg-secondary px-2 py-1 rounded-lg border border-border">
                            {dist.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      {/* Match bar */}
                      {ride.match_percentage >= 60 && (
                        <div className="mt-2">
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-accent rounded-full transition-all duration-700"
                              style={{ width: `${ride.match_percentage}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-green-accent">{ride.match_percentage}% route match</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Map Panel ── */}
        {(view === 'map' || view === 'split') && (
          <div className={`relative ${view === 'split' ? 'w-1/2' : 'w-full'} overflow-hidden`}>
            <MapContainer
              center={defaultCenter}
              zoom={myLocation ? 12 : 6}
              className="w-full h-full"
              ref={mapRef}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
              />
              <FitBounds positions={mapPositions.length ? mapPositions : null} />

              {/* My location marker */}
              {myLocation && (
                <Marker position={myLocation} icon={myLocationIcon}>
                  <Popup>
                    <div className="text-center p-1">
                      <p className="font-bold text-sm text-green-700">Your Location</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Ride markers */}
              {displayRides.filter(r => rideCoords[r.id]).map(ride => (
                <Marker
                  key={ride.id}
                  position={rideCoords[ride.id]}
                  icon={highlightId === ride.id ? rideHighlightIcon : rideIcon}
                  eventHandlers={{
                    click: () => { setHighlightId(ride.id); setSelectedRide(ride) }
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[160px]">
                      <p className="font-bold text-sm mb-1">{ride.origin} → {ride.destination}</p>
                      <p className="text-xs text-gray-600">{ride.date} · {ride.departure_time}</p>
                      <p className="text-xs text-gray-600">{ride.driver_name}</p>
                      <p className="font-bold text-green-700 text-sm mt-1">{formatPKR(ride.fare_per_seat)}/seat</p>
                      <button
                        onClick={() => requestRide(ride)}
                        className="mt-2 w-full bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-green-700 transition-all"
                      >
                        Request Ride
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Route line: my location → highlighted ride origin */}
              {myLocation && highlightId && rideCoords[highlightId] && (
                <Polyline
                  positions={[myLocation, rideCoords[highlightId]]}
                  color="#22c55e"
                  weight={2}
                  dashArray="6, 8"
                  opacity={0.8}
                />
              )}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute top-3 left-3 z-[400] bg-bg-primary border border-border rounded-xl px-3 py-2 text-xs space-y-1.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-accent border-2 border-white" />
                <span className="text-text-dim">Your location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-700 border-2 border-white" />
                <span className="text-text-dim">Available ride</span>
              </div>
              {myLocation && (
                <p className="text-green-accent text-[10px]">{displayRides.filter(r => rideCoords[r.id]).length} rides on map</p>
              )}
            </div>

            {/* No geocoded rides warning */}
            {!loading && displayRides.length > 0 && Object.keys(rideCoords).length === 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-bg-primary border border-border rounded-xl px-4 py-2 text-xs text-text-dim shadow-lg">
                Geocoding ride locations...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Ride Detail Sheet ─────────────────────────────────── */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {selectedRide.origin} → {selectedRide.destination}
                </h3>
                <p className="text-xs text-text-dim mt-0.5">{selectedRide.date} · {selectedRide.departure_time}</p>
              </div>
              <button onClick={() => setSelectedRide(null)} className="btn-ghost p-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Driver */}
            <div className="p-5 flex items-center gap-4 border-b border-border">
              <Avatar url={selectedRide.driver_avatar} name={selectedRide.driver_name} size="lg" />
              <div>
                <p className="font-bold text-text-primary">{selectedRide.driver_name}</p>
                <p className="text-xs text-text-dim">{selectedRide.profession}</p>
                {selectedRide.is_verified && <span className="badge-green text-xs mt-1">Verified Driver</span>}
                {selectedRide.rating && <p className="text-xs text-yellow-400 mt-1">★ {selectedRide.rating} rating</p>}
              </div>
            </div>

            {/* Details */}
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                ['Fare', formatPKR(selectedRide.fare_per_seat) + '/seat'],
                ['Seats', `${selectedRide.available_seats} available`],
                ['Vehicle', selectedRide.vehicle_type],
                ['Fuel', selectedRide.fuel_type],
              ].map(([label, value]) => (
                <div key={label} className="bg-bg-card rounded-xl p-3 border border-border">
                  <p className="text-xs text-text-dim">{label}</p>
                  <p className="text-sm font-bold text-text-primary capitalize mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Distance from my location */}
            {myLocation && rideCoords[selectedRide.id] && (
              <div className="px-5 pb-3">
                <div className="bg-green-accent/5 border border-green-accent/20 rounded-xl p-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-green-accent flex-shrink-0" />
                  <p className="text-sm text-text-primary">
                    <span className="font-bold text-green-accent">
                      {haversine(myLocation[0], myLocation[1], rideCoords[selectedRide.id][0], rideCoords[selectedRide.id][1]).toFixed(1)} km
                    </span>
                    {' '}from your current location to pickup point
                  </p>
                </div>
              </div>
            )}

            {/* Action */}
            <div className="p-5 pt-2">
              <button
                onClick={() => requestRide(selectedRide)}
                disabled={requestLoading}
                className="btn-primary w-full py-3"
              >
                {requestLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending Request...</>
                  : 'Request This Ride'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
