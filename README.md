# 🚗 NRFSS — National Ride & Fuel Sharing System

> Pakistan's first coordinated ride and fuel sharing platform for daily commuters.

---

## 👥 Group Information

| Field         | Details                        |
|---------------|-------------------------------|
| **Group Number** | (As assigned in project proposal spreadsheet) |
| **Member 1**  | Umer Abdullah — Roll No. 24P-0557 |
| **Member 2**  | Sudais Khan — Roll No. 24P-0572   |

---

## 📌 Project Title & Description

**National Ride & Fuel Sharing System (NRFSS)**

NRFSS is a full-stack web application designed to help daily commuters in Pakistan share rides and split fuel costs efficiently. The platform connects drivers and passengers traveling on similar routes, enabling them to coordinate carpooling, reduce travel expenses, and contribute to lower traffic congestion and carbon emissions.

Key Features:
- **Post & Find Rides** — Drivers post available rides; passengers search and request matching ones
- **Fuel Cost Calculator** — Automatically calculates and splits fuel costs among passengers
- **Interactive Maps** — Leaflet.js-powered route visualization with OpenStreetMap
- **User Authentication** — Secure JWT-based login with refresh tokens
- **Admin Panel** — Manage users, verify identities, and monitor platform statistics
- **CRUD Operations** — Full Create, Read, Update, Delete support for rides, users, and requests

---

## 🔗 GitHub Repository URL

**[https://github.com/sardarumer-max/National-Ride-Fuel-Sharing-System-NRFSS-](https://github.com/sardarumer-max/National-Ride-Fuel-Sharing-System-NRFSS-)**

---

## 🛠️ Technologies Used

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI component framework |
| Vite | Build tool & dev server |
| React Router DOM v7 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Leaflet.js + React Leaflet | Interactive maps |
| Zustand | State management |
| Lucide React | Icon library |
| React Hot Toast | Notifications |
| TypeScript | Type safety |

### Backend
| Technology | Purpose |
|---|---|
| Node.js (v18+) | Runtime environment |
| Express.js | Web server framework |
| Supabase (PostgreSQL) | Database & Row Level Security |
| Redis (Upstash / ioredis) | Token blacklisting & rate limiting |
| JSON Web Tokens (JWT) | Authentication |
| bcrypt | Password hashing |
| Helmet.js | HTTP security headers |
| express-rate-limit | API rate limiting |
| CORS | Cross-origin resource sharing |
| dotenv | Environment variable management |

### Deployment & Tools
| Technology | Purpose |
|---|---|
| Netlify | Frontend hosting |
| Supabase | Managed PostgreSQL database |
| Upstash Redis | Managed Redis (serverless) |
| Nodemon | Backend auto-reload (dev) |
| OpenStreetMap + Nominatim | Free geocoding & map tiles |

---

## ⚙️ Installation & Setup Guide

### Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org)
- **Supabase account** (free) — [supabase.com](https://supabase.com)
- **Upstash Redis** (optional, free) — [upstash.com](https://upstash.com)
- **Git** — [git-scm.com](https://git-scm.com)

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/sardarumer-max/National-Ride-Fuel-Sharing-System-NRFSS-.git
cd National-Ride-Fuel-Sharing-System-NRFSS-
```

---

### Step 2 — Set Up the Backend

```bash
cd backend
npm install
```

#### Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REDIS_URL=rediss://your_upstash_redis_url
PORT=3000
```

---

### Step 3 — Set Up the Database

1. Open your **Supabase project** → go to **SQL Editor**
2. Copy and paste the contents of `backend/database/schema.sql`
3. Click **Run** to create all tables, policies, and RLS rules
4. (Optional) Create an admin user as instructed in the schema comments

---

### Step 4 — Start the Backend Server

```bash
cd backend

# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

The backend API will be available at: `http://localhost:3000`

---

### Step 5 — Set Up the Frontend

```bash
cd nrfss-app
npm install
```

#### Configure Frontend Environment

Create a `.env` file inside the `nrfss-app/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Run the Frontend

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

### Step 6 — Open the Application

- **Frontend (React App):** `http://localhost:5173`
- **Backend API:** `http://localhost:3000`

> Make sure both the backend and frontend servers are running simultaneously.

---

## 📁 Project Structure

```
NRFSS/
├── nrfss-app/                   ← React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              ← Reusable UI components (RideCard, etc.)
│   │   │   └── layout/          ← Layout components (Navbar, etc.)
│   │   ├── pages/               ← Route pages
│   │   ├── store/               ← Zustand state management
│   │   └── lib/                 ← Supabase client, utilities
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
└── backend/                     ← Node.js + Express API
    ├── server.js                ← App entry point
    ├── .env.example             ← Environment template
    ├── database/
    │   └── schema.sql           ← Full DB schema + RLS policies
    ├── routes/                  ← Express route definitions
    ├── controllers/             ← Business logic handlers
    ├── middleware/              ← Auth, admin guard, rate limiter
    ├── models/                  ← Supabase + Redis client setup
    └── utils/                   ← JWT helpers, fuel calculator, matching
```

---

## 🔑 Environment Variables Reference

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin operations) |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens |
| `REDIS_URL` | Upstash Redis connection string |
| `PORT` | Server port (default: 3000) |

---

## 🔒 Security Features

- **JWT Authentication** — 15-minute access tokens + 7-day refresh tokens
- **httpOnly Cookies** — Refresh tokens stored securely
- **bcrypt Hashing** — Passwords hashed with 12 salt rounds
- **Row Level Security (RLS)** — Every Supabase table is protected at DB level
- **Helmet.js** — HTTP security headers (XSS, CSRF, clickjacking protection)
- **Rate Limiting** — 100 requests per 15 minutes per IP (Redis-backed)
- **CNIC Validation** — Regex enforced: `/^\d{5}-\d{7}-\d{1}$/`

---

## ✅ CRUD Operations

This project fully implements all four CRUD operations:

| Operation | Example |
|---|---|
| **Create** | Post a new ride, register a user, submit a ride request |
| **Read** | Search/find rides, view profile, admin dashboard stats |
| **Update** | Edit profile, accept/reject ride requests, update ride status |
| **Delete** | Cancel a ride, remove a ride request, admin suspend user |

---

## 🗄️ API Endpoints

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Cookie |
| POST | `/api/auth/logout` | Bearer |

### Rides
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/rides/post` | Bearer |
| GET | `/api/rides/match?from=&to=&date=` | Bearer |
| GET | `/api/rides/my` | Bearer |
| POST | `/api/rides/:id/request` | Bearer |
| PATCH | `/api/rides/request/:id` | Bearer |

### Users
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/users/:id` | Bearer |
| PATCH | `/api/users/:id` | Bearer |

### Fuel Calculator
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/fuel/calculate?distance=&efficiency=&price=&passengers=` | Public |

### Admin (Admin Role Only)
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/users` | Admin |
| POST | `/api/admin/verify/:userId` | Admin |
| POST | `/api/admin/suspend/:userId` | Admin |

---

*Built with ❤️ for Pakistan — NRFSS 2025*
*Group Members: Umer Abdullah (24P-0557) | Sudais Khan (24P-0572)*
