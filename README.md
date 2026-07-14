# CastConnect

A professional networking and casting marketplace for the film and series industry — "LinkedIn for film professionals." Connects talent (actors, directors, cinematographers, editors, crew) with producers, casting directors, and recruiters.

Built with **Expo / React Native** + **Express.js** backend + **Supabase** (auth & database).

---

## Features

- **Guided onboarding** — A required 3-step flow after first sign-in (Personal → Professional → Portfolio) before the dashboard unlocks. Progress is tracked server-side, so users resume exactly where they left off.
- **Profiles** — Talent and producer profiles with personal details, professional roles/experience/bio, skills, languages, availability, and a media portfolio
- **Portfolio & media** — Profile photo, portfolio photo grid, audition reels & showreels (external links), notable work, and awards, backed by Supabase Storage
- **Casting Calls** — Browse and apply to open roles across film, OTT, theatre, and more
- **Discover & Build Crew** — Filter professionals by role, location, and experience; shortlist into a Crew Basket
- **Messaging** — Direct messages between professionals
- **Authentication** — Email/password and Google sign-in via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile/Web | Expo SDK 54, React Native 0.81 |
| Routing | expo-router v6 (file-based) |
| State | React Context API + AsyncStorage |
| Backend | Express.js v5, Node.js |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (portfolio media) |
| Auth | Supabase Auth (email/password + Google) |
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
3. Click **Run** — this creates all tables, RLS policies, triggers, the onboarding/portfolio columns, and the two Storage buckets (`portfolio-media`, `portfolio-docs`)

> **Existing database?** Instead of re-running the full schema, apply the incremental files in [`supabase/migrations/`](supabase/migrations) in order (`0001` → `0005`). Each is idempotent and safe to re-run.

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
│   ├── onboarding/      # 3-step onboarding flow:
│   │   ├── complete-profile.tsx      # Step 1 — personal profile
│   │   ├── professional-profile.tsx  # Step 2 — roles, experience, bio
│   │   └── portfolio.tsx             # Step 3 — photos, reels, work, awards
│   ├── casting/[id].tsx # Casting call detail
│   ├── profile/[id].tsx # User profile view
│   ├── chat/[id].tsx    # Chat conversation
│   ├── crew-basket.tsx  # Shortlisted crew
│   ├── crew-review.tsx  # Review crew before inviting
│   └── _layout.tsx      # Root layout + auth/onboarding routing gate
├── components/          # Reusable UI components
├── constants/
│   └── colors.ts        # Design system colors
├── lib/
│   ├── supabase.ts      # Supabase client (auth + db)
│   ├── AppProvider.tsx  # Global state + Supabase data loading
│   ├── store.ts         # Context + useAppState hook
│   ├── types.ts         # TypeScript types
│   ├── ProfileGate.tsx  # Onboarding-status gate context
│   ├── profileValidation.ts       # Personal-step validation (shared w/ backend)
│   ├── professionalValidation.ts  # Professional-step validation
│   ├── portfolioValidation.ts     # Portfolio-step + media validation
│   ├── mock-data.ts     # Fallback mock data (used when unauthenticated)
│   └── api/
│       ├── profiles.ts      # Profile CRUD + onboarding saves (personal/professional/portfolio)
│       ├── portfolio.ts     # Storage uploads, signed URLs, media deletes
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
│   ├── schema.sql       # Full Supabase SQL schema + RLS + storage buckets
│   └── migrations/      # Incremental, idempotent SQL migrations (0001–0005)
├── .env.example         # Environment variable template
└── package.json
```

---

## Authentication & Onboarding Flow

1. App starts → checks Supabase session
2. **No session** → redirected to `/auth/login`
3. **Sign in / Register** (email/password or Google) → Supabase issues a JWT, session stored in AsyncStorage
4. **Authenticated** → the root gate reads the user's `onboarding_status` and routes accordingly (a loading overlay prevents the dashboard from flashing)
5. **Onboarding not finished** → user is sent to the current step and can't skip ahead:

   | `onboarding_status` | Destination |
   |---|---|
   | `PERSONAL_PROFILE_PENDING` | Step 1 — Complete Your Profile |
   | `PROFESSIONAL_PROFILE_PENDING` | Step 2 — Professional Profile |
   | `PORTFOLIO_PENDING` | Step 3 — Build Your Portfolio |
   | `COMPLETED` | Dashboard |

6. **Onboarding complete** → dashboard loads from Supabase (falls back to mock data if tables are empty)
7. **Sign out** → session cleared, redirected back to login; on next sign-in the user resumes at their pending step

### The 3-step onboarding

Each step is **validated on the backend** — a `BEFORE INSERT/UPDATE` trigger recomputes the completion flags and `onboarding_status` on every write, so a client can never mark itself complete with missing or invalid data.

1. **Personal Profile** — full name, age, height (ft/in ↔ cm), body type, complexion.
2. **Professional Profile** — professional roles (+ primary), experience level, bio, and optional skills, languages, work preferences, and availability.
3. **Portfolio** — a required profile photo plus optional portfolio photos, audition reels & showreels (external links), notable work, and awards. Media uploads to Supabase Storage; "Complete Profile" is an explicit action (a draft never finishes onboarding). Users can go **Back** to earlier steps, and drafts are restored on return.

---

## Supabase Schema Overview

| Table | Description |
|---|---|
| `profiles` | One row per user; auto-created on sign-up via trigger. Holds core profile data **plus all onboarding fields** (personal, professional, and portfolio) and the derived `profile_completed` / `professional_profile_completed` / `portfolio_completed` flags and `onboarding_status` |
| `connections` | Follow/connection relationships (many-to-many) |
| `casting_calls` | Job postings by producers/casting directors |
| `applications` | Talent applications to casting calls |
| `messages` | Direct messages between users |
| `crew_baskets` | Named shortlists of crew for a production |
| `crew_basket_items` | Individual crew members inside a basket |

All tables have **Row Level Security (RLS)** enabled. Users can only read/write their own data.

### Storage buckets

| Bucket | Access | Contents |
|---|---|---|
| `portfolio-media` | Public | Profile photo & portfolio photos (served via public URL) |
| `portfolio-docs` | Private | Award supporting documents (served via short-lived signed URLs) |

Both use owner-scoped RLS on `storage.objects` — a user can only write/delete under their own `{userId}/…` path.

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
