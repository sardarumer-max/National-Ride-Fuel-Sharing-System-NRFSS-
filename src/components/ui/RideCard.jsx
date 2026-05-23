import { MapPin, Clock, Users, Car, Fuel, Star, CheckCircle, ArrowRight } from 'lucide-react'
import { formatPKR } from '../../lib/fuelCalc'
import Avatar from './Avatar'

export default function RideCard({ ride, onRequest, onViewDetails, showRequest = true }) {
  const {
    id, origin, destination, driver_name, driver_avatar, departure_time, date,
    available_seats, fare_per_seat, fuel_type, vehicle_type,
    match_percentage, is_verified, rating, profession
  } = ride


  const match = match_percentage || 75

  return (
    <div className="glass-hover p-5 rounded-xl flex flex-col gap-4">
      {/* Route */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MapPin className="w-3.5 h-3.5 text-green-accent flex-shrink-0" />
        <span className="text-text-primary truncate">{origin}</span>
        <ArrowRight className="w-3 h-3 text-text-dim flex-shrink-0" />
        <span className="text-text-primary truncate">{destination}</span>
      </div>

      {/* Driver Info */}
      <div className="flex items-center gap-3">
        <Avatar url={driver_avatar} name={driver_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-primary truncate">{driver_name || 'Driver'}</span>
            {is_verified && (
              <CheckCircle className="w-3.5 h-3.5 text-green-accent flex-shrink-0" />
            )}
          </div>
          <div className="text-xs text-text-dim flex items-center gap-1.5 mt-0.5">
            {profession && <span>{profession}</span>}
            {rating && (
              <>
                <span>·</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{rating}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center gap-3 text-xs text-text-dim flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {departure_time || date}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {available_seats} seat{available_seats !== 1 ? 's' : ''}
        </span>
        <span className="capitalize">{vehicle_type}</span>
        <span className="flex items-center gap-1">
          <Fuel className="w-3 h-3" /> {fuel_type}
        </span>
      </div>

      {/* Match Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-dim font-medium">Route Match</span>
          <span className="text-green-accent font-bold">{match}%</span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-green-gradient rounded-full match-fill"
            style={{ width: `${match}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-2xl font-black text-green-accent counter">{formatPKR(fare_per_seat)}</span>
          <span className="text-xs text-text-dim ml-1">/seat</span>
        </div>
        <div className="flex gap-2">
          {onViewDetails && (
            <button onClick={() => onViewDetails(ride)} className="btn-secondary py-2 px-3 text-xs">
              Details
            </button>
          )}
          {showRequest && onRequest && available_seats > 0 && (
            <button onClick={() => onRequest(id)} className="btn-primary py-2 px-3 text-xs">
              Request Ride
            </button>
          )}
          {available_seats === 0 && (
            <span className="badge-red text-xs py-2 px-3">Full</span>
          )}
        </div>
      </div>
    </div>
  )
}
