-- ============================================================
-- NRFSS — Complete Supabase Schema
-- Run this in: Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: users (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  cnic          TEXT UNIQUE NOT NULL,
  mobile        TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  age           INTEGER CHECK (age >= 18 AND age <= 70),
  city          TEXT NOT NULL,
  profession    TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'driver', 'admin')),
  is_verified   BOOLEAN DEFAULT FALSE,
  avg_rating    FLOAT,
  total_rides   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('bike', 'car', 'van')),
  fuel_type       TEXT DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'cng', 'diesel')),
  fuel_efficiency FLOAT DEFAULT 15,
  seats           INTEGER DEFAULT 4
);

-- ============================================================
-- TABLE: rides
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rides (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  origin           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  stops            JSONB DEFAULT '[]',
  date             DATE NOT NULL,
  departure_time   TIME NOT NULL,
  available_seats  INTEGER NOT NULL CHECK (available_seats >= 0),
  fare_per_seat    FLOAT DEFAULT 0,
  vehicle_type     TEXT DEFAULT 'car' CHECK (vehicle_type IN ('bike', 'car', 'van')),
  fuel_type        TEXT DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'cng', 'diesel')),
  total_distance   FLOAT DEFAULT 0,
  status           TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: ride_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ride_requests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id      UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, passenger_id)
);

-- ============================================================
-- TABLE: fuel_splits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_splits (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id              UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  total_fuel_cost      FLOAT NOT NULL,
  passengers_count     INTEGER NOT NULL,
  cost_per_passenger   FLOAT NOT NULL,
  fuel_consumed_liters FLOAT NOT NULL
);

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id     UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, ride_id)
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rides_driver     ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status     ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_date       ON public.rides(date);
CREATE INDEX IF NOT EXISTS idx_requests_ride    ON public.ride_requests(ride_id);
CREATE INDEX IF NOT EXISTS idx_requests_pax     ON public.ride_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_notif_user       ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_splits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users: read any profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users: insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users: update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- VEHICLES
CREATE POLICY "Vehicles: manage own" ON public.vehicles FOR ALL USING (auth.uid() = user_id);

-- RIDES
CREATE POLICY "Rides: read all active" ON public.rides FOR SELECT USING (true);
CREATE POLICY "Rides: driver insert" ON public.rides FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Rides: driver update" ON public.rides FOR UPDATE USING (auth.uid() = driver_id);

-- RIDE REQUESTS
CREATE POLICY "Requests: read own" ON public.ride_requests
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id));
CREATE POLICY "Requests: passenger insert" ON public.ride_requests
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "Requests: driver update" ON public.ride_requests
  FOR UPDATE USING (auth.uid() = (SELECT driver_id FROM public.rides WHERE id = ride_id));

-- FUEL SPLITS
CREATE POLICY "Fuel: read involved" ON public.fuel_splits FOR SELECT USING (
  ride_id IN (
    SELECT id FROM public.rides WHERE driver_id = auth.uid()
    UNION
    SELECT ride_id FROM public.ride_requests WHERE passenger_id = auth.uid()
  )
);
CREATE POLICY "Fuel: driver insert" ON public.fuel_splits FOR INSERT WITH CHECK (
  ride_id IN (SELECT id FROM public.rides WHERE driver_id = auth.uid())
);

-- REVIEWS
CREATE POLICY "Reviews: read all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews: reviewer insert" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- NOTIFICATIONS
CREATE POLICY "Notifications: manage own" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REALTIME: Enable for real-time subscriptions
-- ============================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.notifications,
    public.ride_requests,
    public.rides;
COMMIT;

-- ============================================================
-- CREATE ADMIN USER (run AFTER registering via the app)
-- Replace 'your-user-id-here' with the UUID from auth.users
-- ============================================================
-- UPDATE public.users SET role = 'admin', is_verified = true
-- WHERE id = 'your-user-id-here';
