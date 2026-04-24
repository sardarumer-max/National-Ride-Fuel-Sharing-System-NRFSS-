create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cnic text not null unique,
  mobile text not null unique,
  email text not null unique,
  age int not null,
  city text not null,
  profession text not null,
  password_hash text not null,
  is_verified boolean not null default false,
  role text not null default 'user' check (role in ('user','driver','admin')),
  created_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('bike','car','van')),
  fuel_type text not null check (fuel_type in ('petrol','cng','diesel')),
  fuel_efficiency numeric not null,
  seats int not null
);

create table if not exists rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references users(id) on delete cascade,
  origin text not null,
  destination text not null,
  stops jsonb not null default '[]'::jsonb,
  date date not null,
  departure_time time not null,
  available_seats int not null,
  fare_per_seat numeric not null,
  fuel_type text not null check (fuel_type in ('petrol','cng','diesel')),
  total_distance numeric not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references rides(id) on delete cascade,
  passenger_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists fuel_splits (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references rides(id) on delete cascade,
  total_fuel_cost numeric not null,
  passengers_count int not null,
  cost_per_passenger numeric not null,
  fuel_consumed_liters numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references users(id) on delete cascade,
  reviewee_id uuid not null references users(id) on delete cascade,
  ride_id uuid not null references rides(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
