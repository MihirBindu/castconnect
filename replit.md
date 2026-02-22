# CastConnect - Mobile Casting Platform

## Overview

CastConnect is a professional networking and casting marketplace mobile app for the film and series industry. Think "LinkedIn for film professionals" — it connects talent (actors, directors, cinematographers, editors, crew) with producers, casting directors, and recruiters. The app enables profile creation, casting call discovery, crew building, direct messaging, and application tracking.

The app runs as an Expo React Native application with a companion Express.js backend server. Currently, most data is driven by mock data and local state (AsyncStorage), with a PostgreSQL database schema scaffolded but not yet fully integrated into the app's features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture
- **Routing**: expo-router v6 with file-based routing and typed routes
- **State Management**: React Context API (`AppProvider` + `useAppState` hook) — no Redux or Zustand. State is persisted to `AsyncStorage` for offline resilience
- **Data**: Currently uses mock data defined in `lib/mock-data.ts`. TanStack React Query is installed and configured (`lib/query-client.ts`) but the app primarily reads from local context state rather than making API calls
- **Styling**: Dark theme with a gold accent (`#D4A853`). All colors centralized in `constants/colors.ts`. Uses `StyleSheet.create` throughout — no CSS-in-JS libraries
- **Fonts**: DM Sans (Regular, Medium, SemiBold, Bold) via `@expo-google-fonts/dm-sans`
- **Key Libraries**: expo-haptics for tactile feedback, expo-linear-gradient, react-native-gesture-handler, react-native-reanimated, react-native-keyboard-controller, expo-image-picker

### App Structure (File-based Routing)

- `app/(tabs)/` — Main tab navigation with 5 tabs: Home, Discover, Casting (Jobs), Messages, Profile (Me)
- `app/casting/[id].tsx` — Casting call detail screen
- `app/profile/[id].tsx` — Other user's profile detail
- `app/profile/edit.tsx` — Edit own profile (modal)
- `app/chat/[id].tsx` — Individual chat conversation
- `app/crew-basket.tsx` — Shortlisted crew members for a production
- `app/crew-review.tsx` — Review and finalize crew before sending invites

### Key Feature: Discover & Build Crew

The Discover tab (`app/(tabs)/discover.tsx`) implements a crew-building marketplace where employers can:
- Select multiple crew roles simultaneously (Director, Actor, DOP, etc.)
- Filter by location, availability, experience level, and sort by rating/rate
- Add professionals to a "Crew Basket" (shortlist)
- Review the full crew in `crew-basket.tsx` and `crew-review.tsx` before sending invites

### Backend (Express.js)

- **Runtime**: Node.js with Express v5, TypeScript compiled via tsx (dev) or esbuild (prod)
- **Server file**: `server/index.ts` — sets up CORS for Replit domains, serves static files in production
- **Routes**: `server/routes.ts` — currently minimal, placeholder for API routes prefixed with `/api`
- **Storage**: `server/storage.ts` — uses in-memory storage (`MemStorage`) with a basic User CRUD interface. This is a stepping stone; the database schema is ready for PostgreSQL

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: `shared/schema.ts` — currently defines a `users` table with `id`, `username`, `password`. The schema is minimal and will need expansion to support profiles, casting calls, messages, applications, crew baskets, etc.
- **Migrations**: Drizzle Kit configured in `drizzle.config.ts`, outputs to `./migrations`
- **Connection**: Reads `DATABASE_URL` environment variable
- **Validation**: Uses `drizzle-zod` to generate Zod schemas from Drizzle table definitions

### Build & Deployment

- Development: Two processes — `expo:dev` for the mobile/web client, `server:dev` for the Express backend
- Production: Static web build via custom `scripts/build.js`, server bundled with esbuild to `server_dist/`
- The Express server proxies to Metro bundler in development and serves static files in production

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required via `DATABASE_URL` environment variable. Drizzle ORM is configured but the app currently uses in-memory/mock data. Database needs to be provisioned and schema pushed with `npm run db:push`

### Key npm Packages
- **expo** (~54.0.27) — Core framework
- **express** (^5.0.1) — Backend server
- **drizzle-orm** (^0.39.3) + **drizzle-kit** — Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0) — Server state management (configured, not heavily used yet)
- **pg** (^8.16.3) — PostgreSQL client
- **zod** + **drizzle-zod** — Schema validation
- **@react-native-async-storage/async-storage** — Local persistence

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `REPLIT_DEV_DOMAIN` — Used for Expo development server proxy and CORS
- `EXPO_PUBLIC_DOMAIN` — Public API domain for client-server communication
- `REPLIT_DOMAINS` — Additional allowed CORS origins
- `REPLIT_INTERNAL_APP_DOMAIN` — Used in production static builds