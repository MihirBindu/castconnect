# CastConnect

A professional networking and casting marketplace for the film and series industry — "LinkedIn for film professionals." Connects talent (actors, directors, cinematographers, editors, crew) with producers, casting directors, and recruiters.

Built with **Expo / React Native** + **Express.js** backend + **Supabase** (auth & database).

---

## Features

- **Profiles** — Talent and producer profiles with skills, rates, availability, and portfolio links
- **Casting Calls** — Browse and apply to open roles across film, OTT, theatre, and more
- **Discover & Build Crew** — Filter professionals by role, location, and experience; shortlist into a Crew Basket
- **Messaging** — Direct messages between professionals
- **Authentication** — Email/password sign-up and sign-in via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile/Web | Expo SDK 54, React Native 0.81 |
| Routing | expo-router v6 (file-based) |
| State | React Context API + AsyncStorage |
| Backend | Express.js v5, Node.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| ORM | Drizzle ORM (server-side) |
| Fonts | DM Sans via `@expo-google-fonts` |

---

## Prerequisites

- Node.js 18+
- npm 9+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- A [Supabase](https://supabase.com) account (free tier is fine)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/MihirBindu/castconnect.git
cd castconnect
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

#### a. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**, give it a name (e.g. `castconnect`), and choose a region
3. Wait for provisioning (~1 minute)

#### b. Run the database schema

1. In your Supabase project, open **SQL Editor** → **New query**
2. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it in
3. Click **Run** — this creates all tables, RLS policies, and triggers

#### c. Get your API keys

1. Go to **Settings → API** in your Supabase project
2. Copy **Project URL** and **anon public** key

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# From Supabase → Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# From Supabase → Settings → Database → Connection string (URI)
DATABASE_URL=postgresql://postgres:[password]@db.your-project-id.supabase.co:5432/postgres
```

> **Note:** Variables prefixed with `EXPO_PUBLIC_` are safe to expose to the client. Never put your `service_role` key in the app.

### 5. Run the app

Open two terminals:

**Terminal 1 — Expo dev server:**
```bash
npm run expo:dev
```

**Terminal 2 — Express backend:**
```bash
npm run server:dev
```

Then open the Expo Go app on your phone and scan the QR code, or press `w` to open in the browser.

---

## Project Structure

```
castconnect/
├── app/
│   ├── (tabs)/          # Main tab screens: Home, Discover, Jobs, Messages, Me
│   ├── auth/            # Login and Register screens
│   ├── casting/[id].tsx # Casting call detail
│   ├── profile/[id].tsx # User profile view
│   ├── chat/[id].tsx    # Chat conversation
│   ├── crew-basket.tsx  # Shortlisted crew
│   └── crew-review.tsx  # Review crew before inviting
├── components/          # Reusable UI components
├── constants/
│   └── colors.ts        # Design system colors
├── lib/
│   ├── supabase.ts      # Supabase client (auth + db)
│   ├── AppProvider.tsx  # Global state + Supabase data loading
│   ├── store.ts         # Context + useAppState hook
│   ├── types.ts         # TypeScript types
│   ├── mock-data.ts     # Fallback mock data (used when unauthenticated)
│   └── api/
│       ├── profiles.ts      # Profile CRUD
│       ├── castingCalls.ts  # Casting call queries
│       ├── messages.ts      # Messaging
│       ├── applications.ts  # Job applications
│       └── crewBasket.ts    # Crew basket management
├── server/
│   ├── index.ts         # Express server entry
│   ├── routes.ts        # API routes
│   └── storage.ts       # In-memory storage (stepping stone to DB)
├── shared/
│   └── schema.ts        # Drizzle ORM schema
├── supabase/
│   └── schema.sql       # Full Supabase SQL schema + RLS policies
├── .env.example         # Environment variable template
└── package.json
```

---

## Authentication Flow

1. App starts → checks Supabase session
2. **No session** → redirected to `/auth/login`
3. **Sign in / Register** → Supabase issues a JWT, session stored in AsyncStorage
4. **Authenticated** → data loads from Supabase; falls back to mock data if tables are empty
5. **Sign out** → session cleared, redirected back to login

---

## Supabase Schema Overview

| Table | Description |
|---|---|
| `profiles` | One row per user; auto-created on sign-up via trigger |
| `connections` | Follow/connection relationships (many-to-many) |
| `casting_calls` | Job postings by producers/casting directors |
| `applications` | Talent applications to casting calls |
| `messages` | Direct messages between users |
| `crew_baskets` | Named shortlists of crew for a production |
| `crew_basket_items` | Individual crew members inside a basket |

All tables have **Row Level Security (RLS)** enabled. Users can only read/write their own data.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run expo:dev` | Start Expo development server |
| `npm run server:dev` | Start Express backend (development) |
| `npm run db:push` | Push Drizzle schema to the database |
| `npm run lint` | Run ESLint |
| `npm run expo:static:build` | Build static web export |
| `npm run server:build` | Bundle Express server with esbuild |

---

## Contributing

1. Fork the repo and create a branch from `dev`
2. Make your changes
3. Open a PR targeting `dev`
