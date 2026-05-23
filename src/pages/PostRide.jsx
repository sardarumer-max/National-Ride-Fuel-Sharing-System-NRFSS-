import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Clock, Users, Car, Fuel, Plus, X, Zap, Navigation, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import { calcFuelCost, FUEL_PRICES, formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

// Fix Leaflet default marker icons (Vite/Webpack issue)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const GREEN_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})
const RED_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Pakistan major city coordinates for instant defaults
const PK_CITIES = {
  'Karachi':    [24.8607, 67.0011],
  'Lahore':     [31.5497, 74.3436],
  'Islamabad':  [33.6844, 73.0479],
  'Rawalpindi': [33.5651, 73.0169],
  'Faisalabad': [31.4504, 73.1350],
  'Multan':     [30.1575, 71.5249],
  'Peshawar':   [34.0151, 71.5249],
  'Quetta':     [30.1798, 66.9750],
}

// Component to auto-fit map bounds
function MapFitter({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords)
      map.fitBounds(bounds, { padding: [40, 40] })
    } else if (coords.length === 1) {
      map.setView(coords[0], 12)
    }
  }, [coords, map])
  return null
}

// Nominatim geocoder (free OpenStreetMap — no API key needed)
async function geocode(query) {
  if (!query || query.length < 3) return null
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Pakistan')}&format=json&limit=1&countrycodes=pk`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await resp.json()
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        label: data[0].display_name.split(',').slice(0, 3).join(','),
      }
    }
  } catch (e) { /* silent */ }
  return null
}

// Calculate straight-line distance (Haversine) when routing API not available
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.3) // ×1.3 road factor
}

// ─────────────────────────────────────────────────────────────────────────────
// LocationInput
// Uses Photon (komoot) as PRIMARY geocoder — far better Pakistan coverage
// than Nominatim alone. Falls back to Nominatim if Photon returns 0 results.
// Dropdown has solid dark background so text is always readable.
// ─────────────────────────────────────────────────────────────────────────────
async function searchPhoton(query) {
  // Photon: OSM-based, no API key, better local place coverage
  // Pakistan bbox: min_lon=60.87, min_lat=23.69, max_lon=77.84, max_lat=37.08
  const params = new URLSearchParams({
    q: query,
    limit: '8',
    lang: 'en',
    bbox: '60.872,23.694,77.839,37.084', // lon_min,lat_min,lon_max,lat_max
  })
  const resp = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!resp.ok) return []
  const data = await resp.json()
  return (data.features || []).map(f => {
    const p = f.properties
    const nameParts = [
      p.name,
      p.street,
      p.district || p.locality,
      p.city || p.town || p.village,
      p.state,
    ].filter(Boolean)
    return {
      label: nameParts.slice(0, 3).join(', ') || p.name || 'Unknown',
      fullLabel: nameParts.join(', '),
      type: p.type || p.osm_value || 'place',
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      country: p.country,
    }
  }).filter(r => r.country === 'Pakistan' || !r.country)
}

async function searchNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'pk',
    'accept-language': 'en',
    dedupe: '1',
  })
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en' }
  })
  if (!resp.ok) return []
  const data = await resp.json()
  return data.map(d => {
    const a = d.address || {}
    const parts = [
      a.road || a.neighbourhood || a.suburb,
      a.city_district || a.locality,
      a.city || a.town || a.village,
    ].filter(Boolean)
    return {
      label: parts.length >= 2 ? parts.slice(0, 3).join(', ') : d.display_name.split(',').slice(0, 3).join(', '),
      fullLabel: d.display_name,
      type: d.type || 'place',
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }
  })
}

function LocationInput({ label, placeholder, icon: Icon, color, value, onChange, onCoordChange }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  async function doSearch(q) {
    setSearching(true)
    try {
      // Try Photon first (better coverage)
      let results = await searchPhoton(q)
      // If Photon finds nothing, fall back to Nominatim
      if (results.length === 0) {
        results = await searchNominatim(q)
      }
      setSuggestions(results.slice(0, 8))
      setShowSugg(true)
    } catch (err) {
      console.warn('Search error:', err)
      setSuggestions([])
    }
    setSearching(false)
  }

  function handleChange(e) {
    const v = e.target.value
    onChange(v)
    clearTimeout(debounceRef.current)
    if (v.length < 2) { setSuggestions([]); setShowSugg(false); return }
    debounceRef.current = setTimeout(() => doSearch(v), 350)
  }

  function pick(s) {
    onChange(s.label)
    onCoordChange({ lat: s.lat, lng: s.lng })
    setSuggestions([])
    setShowSugg(false)
  }

  const TYPE_ICON = (type) => {
    return '•'
  }

  return (
    <div className="relative">
      <label className="label">
        <Icon className={`w-3 h-3 inline mr-1 ${color}`} />{label}
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          className="input pr-9"
          value={value}
          onChange={handleChange}
          onFocus={() => { if (value.length >= 2 && suggestions.length === 0) doSearch(value); else if (suggestions.length > 0) setShowSugg(true) }}
          onBlur={() => setTimeout(() => setShowSugg(false), 200)}
          autoComplete="off"
          spellCheck="false"
        />
        {searching
          ? <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-border border-t-green-accent rounded-full animate-spin" />
          : <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim pointer-events-none" />
        }
      </div>

      {/* ── Suggestions dropdown — SOLID dark background, always readable ── */}
      {showSugg && suggestions.length > 0 && (
        <div
          className="absolute z-[9999] top-full mt-1 w-full rounded-xl border border-green-accent/25 shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
          style={{ background: '#0a1a0a' }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 border-b transition-all group"
              style={{ borderColor: 'rgba(34,197,94,0.1)' }}
              onMouseDown={() => pick(s)}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 text-base leading-none mt-0.5">{TYPE_ICON(s.type)}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm leading-tight" style={{ color: '#f0fdf0' }}>
                    {s.label}
                  </div>
                  {s.fullLabel && s.fullLabel !== s.label && (
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: '#86efac', opacity: 0.7 }}>
                      {s.fullLabel.split(',').slice(0, 4).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 flex items-center gap-1.5 text-[10px]"
               style={{ background: '#061006', color: '#4ade80', opacity: 0.7 }}>
            <MapPin className="w-3 h-3" />
            Powered by OpenStreetMap · Photon
          </div>
        </div>
      )}

      {/* ── Not found ── */}
      {showSugg && !searching && suggestions.length === 0 && value.length >= 2 && (
        <div
          className="absolute z-[9999] top-full mt-1 w-full rounded-xl border p-4 text-center shadow-xl"
          style={{ background: '#0a1a0a', borderColor: 'rgba(34,197,94,0.2)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#f0fdf0' }}>No locations found</p>
          <p className="text-xs mt-1" style={{ color: '#86efac' }}>
            Try being more specific, e.g.<br />
            <strong>"Gulberg Islamabad"</strong> or <strong>"DHA Phase 5 Lahore"</strong>
          </p>
        </div>
      )}
    </div>
  )
}

export default function PostRide() {
  const { profile, user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stops, setStops] = useState([])
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [originCoord, setOriginCoord] = useState(null)
  const [destCoord, setDestCoord] = useState(null)
  const [mapCenter] = useState([30.3753, 69.3451]) // Center of Pakistan

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    seats: 2,
    vehicle_type: 'car',
    fuel_type: 'petrol',
    distance: '',
    fuel_price: String(FUEL_PRICES.petrol || 295),
    efficiency: '15',
  })

  // Auto-calc distance when both coords set
  useEffect(() => {
    if (originCoord && destCoord) {
      const km = haversineKm(originCoord.lat, originCoord.lng, destCoord.lat, destCoord.lng)
      setForm(f => ({ ...f, distance: String(km) }))
    }
  }, [originCoord, destCoord])

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const fuelResult = calcFuelCost(
    parseFloat(form.distance),
    parseFloat(form.efficiency),
    parseFloat(form.fuel_price),
    parseInt(form.seats)
  )

  // Map markers and route line
  const mapCoords = [originCoord, destCoord].filter(Boolean).map(c => [c.lat, c.lng])

  async function handleSubmit(e) {
    e.preventDefault()

    // Basic validation
    if (!origin?.trim() || !dest?.trim()) {
      toast.error('Please enter start and end locations')
      return
    }
    if (!form.date) { toast.error('Please select a date'); return }
    if (!form.time) { toast.error('Please select a departure time'); return }

    // Auth check — read live state, not stale closure
    const currentUser = useAuthStore.getState().user
    if (!currentUser?.id) {
      toast.error('You must be logged in to post a ride')
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      // Build insert payload
      const insertPayload = {
        driver_id: currentUser.id,
        origin: origin.trim(),
        destination: dest.trim(),
        stops: stops.filter(s => s?.trim()),
        date: form.date,
        departure_time: form.time,
        available_seats: Math.max(1, parseInt(form.seats) || 2),
        vehicle_type: form.vehicle_type || 'car',
        fuel_type: form.fuel_type || 'petrol',
        total_distance: parseFloat(form.distance) || 0,
        fare_per_seat: fuelResult?.costPerPassenger || 0,
        status: 'upcoming',
      }

      console.log('[PostRide] Submitting ride:', insertPayload)

      const { data: ride, error } = await supabase
        .from('rides')
        .insert(insertPayload)
        .select('id, origin, destination')
        .single()

      if (error) {
        console.error('[PostRide] Supabase insert error:', error)
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('Permission denied. Please make sure you are logged in and try again.')
        } else if (error.code === '23503') {
          throw new Error('Your user profile is not set up correctly. Please contact support.')
        } else {
          throw new Error(error.message || 'Could not post ride. Please try again.')
        }
      }

      console.log('[PostRide] Ride created successfully:', ride?.id)

      // Fire-and-forget fuel splits — never block navigation
      if (fuelResult && ride?.id) {
        supabase.from('fuel_splits').insert({
          ride_id: ride.id,
          total_fuel_cost: fuelResult.totalCost,
          passengers_count: parseInt(form.seats) || 1,
          cost_per_passenger: fuelResult.costPerPassenger,
          fuel_consumed_liters: fuelResult.liters,
        }).then(({ error: fsErr }) => {
          if (fsErr) console.warn('[PostRide] fuel_splits insert skipped:', fsErr.message)
        }).catch(fsEx => {
          console.warn('[PostRide] fuel_splits exception (non-fatal):', fsEx)
        })
      }

      toast.success('Ride posted successfully!')
      navigate('/dashboard')
    } catch (err) {
      console.error('[PostRide] handleSubmit error:', err)
      toast.error(err.message || 'Failed to post ride. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="page-title">Post a Ride</h1>
        <p className="page-subtitle">Share your route and split fuel costs with passengers</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Route */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-green-accent uppercase tracking-wider flex items-center gap-2">
              <Navigation className="w-4 h-4" /> Route Details
            </h3>

            <LocationInput
              label="Start Location *"
              placeholder="e.g. DHA Lahore Phase 5"
              icon={MapPin}
              color="text-green-accent"
              value={origin}
              onChange={setOrigin}
              onCoordChange={setOriginCoord}
            />

            <LocationInput
              label="End Location *"
              placeholder="e.g. Gulberg III, Lahore"
              icon={MapPin}
              color="text-red-400"
              value={dest}
              onChange={setDest}
              onCoordChange={setDestCoord}
            />

            {/* Stops */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Intermediate Stops</label>
                <button type="button" onClick={() => setStops(s => [...s, ''])} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add Stop
                </button>
              </div>
              {stops.map((stop, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={`Stop ${i + 1} (e.g. Johar Town)`}
                    className="input flex-1"
                    value={stop}
                    onChange={e => setStops(s => s.map((v, idx) => idx === i ? e.target.value : v))}
                  />
                  <button type="button" onClick={() => setStops(s => s.filter((_, idx) => idx !== i))} className="btn-ghost p-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-green-accent uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> Schedule & Vehicle
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label"><Clock className="w-3 h-3 inline mr-1" />Date *</label>
                <input type="date" className="input" value={form.date} onChange={setField('date')} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">Departure Time *</label>
                <input type="time" className="input" value={form.time} onChange={setField('time')} />
              </div>
              <div>
                <label className="label"><Users className="w-3 h-3 inline mr-1" />Available Seats *</label>
                <input type="number" className="input" min={1} max={8} value={form.seats} onChange={setField('seats')} />
              </div>
              <div>
                <label className="label"><Car className="w-3 h-3 inline mr-1" />Vehicle Type</label>
                <select className="select" value={form.vehicle_type} onChange={setField('vehicle_type')}>
                  <option value="bike">Bike</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fuel */}
          <div className="glass rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-green-accent uppercase tracking-wider flex items-center gap-2">
              <Fuel className="w-4 h-4" /> Fuel & Cost
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fuel Type</label>
                <select className="select" value={form.fuel_type} onChange={e => {
                  setForm(f => ({ ...f, fuel_type: e.target.value, fuel_price: String(FUEL_PRICES[e.target.value] || 295) }))
                }}>
                  <option value="petrol">Petrol</option>
                  <option value="cng">CNG</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <div>
                <label className="label">Distance (km)
                  {originCoord && destCoord && (
                    <span className="ml-2 text-green-accent text-xs font-normal">auto-calculated</span>
                  )}
                </label>
                <input type="number" className="input" placeholder="Auto-calculated" value={form.distance} onChange={setField('distance')} />
              </div>
              <div>
                <label className="label">Fuel Price (PKR/L)</label>
                <input type="number" className="input" value={form.fuel_price} onChange={setField('fuel_price')} />
              </div>
              <div>
                <label className="label">Efficiency (km/L)</label>
                <input type="number" className="input" value={form.efficiency} onChange={setField('efficiency')} />
              </div>
            </div>

            {fuelResult && (
              <div className="mt-2 p-4 rounded-xl bg-green-accent/5 border border-green-accent/20 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-black text-green-accent">{formatPKR(fuelResult.totalCost)}</div>
                  <div className="text-xs text-text-dim mt-1">Total Fuel Cost</div>
                </div>
                <div className="text-center border-x border-border/50">
                  <div className="text-lg font-black text-green-accent">{formatPKR(fuelResult.costPerPassenger)}</div>
                  <div className="text-xs text-text-dim mt-1">Per Passenger</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-text-primary">{fuelResult.liters}L</div>
                  <div className="text-xs text-text-dim mt-1">Fuel Used</div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Car className="w-5 h-5" /> Post This Ride</>
            }
          </button>
        </form>

        {/* ── Map ── */}
        <div className="glass rounded-xl overflow-hidden" style={{ height: '640px', position: 'sticky', top: '80px' }}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-green-accent uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" /> Route Preview
            </h3>
            <span className="text-xs text-text-dim">Powered by OpenStreetMap</span>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={5}
            style={{ height: 'calc(100% - 57px)', width: '100%' }}
            className="leaflet-dark"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {originCoord && (
              <Marker position={[originCoord.lat, originCoord.lng]} icon={GREEN_ICON} />
            )}
            {destCoord && (
              <Marker position={[destCoord.lat, destCoord.lng]} icon={RED_ICON} />
            )}
            {mapCoords.length >= 2 && (
              <Polyline
                positions={mapCoords}
                pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.85, dashArray: '8 4' }}
              />
            )}
            <MapFitter coords={mapCoords} />
          </MapContainer>

          {/* Overlay when no locations set */}
          {!originCoord && !destCoord && (
            <div className="absolute inset-0 top-[57px] flex items-center justify-center pointer-events-none">
              <div className="glass rounded-xl p-4 text-center mx-8">
                <MapPin className="w-8 h-8 text-green-accent mx-auto mb-2 opacity-60" />
                <p className="text-sm text-text-dim">Search and select locations above to see your route on the map</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
