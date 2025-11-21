# Smart Session Planner

## Tech Stack

Based on t3, tried to mimic MeAgain setup to learn the ins and out of the stack, also to have an easier testing/review process.

- **Monorepo**: Turborepo with pnpm workspaces
- **Mobile App**: Expo (React Native) with Expo Router
- **Backend**: tRPC API with Next.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Supabase
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod schemas

## Setup Instructions

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd smart-session-planner
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database
   POSTGRES_URL=your-neon-postrges-url

   # Supabase Configuration
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Push database schema**

   ```bash
   pnpm db:push
   ```

5. **Start development servers**

   Build a development build then:

   ```bash
   pnpm dev
   ```

## Tips

- Anonymous sign up, log out and log in again to generate a new fresh account
- In Settings you can generate 6 sessions to test the suggestion engine (ignore some db constraints for testing purposes)
- In Settings you can delete all sessions

## What Has Been Built

### Database (`packages/db`)

The database layer uses Drizzle ORM with PostgreSQL and includes:

#### Schema Design

1. **User Table** (`user.ts`)
   - Stores application-specific user data
   - References Supabase `auth.users.id` (UUID)
   - Fields: `id`, `name`, `image`, `createdAt`, `updatedAt`

2. **Profile Table** (`profile.ts`)
   - One-to-one relationship with User
   - Stores user preferences including timezone (IANA format)
   - Includes CHECK constraint for timezone format validation

3. **Session Table** (`session.ts`)
   - Core entity for scheduled work sessions
   - Fields: `id`, `userId`, `title`, `type`, `startTime`, `endTime`, `completed`, `completedAt`, `priority` (1-5), `description`, `fromSuggestionId`, `deletedAt`
   - Session types: `DEEP_WORK`, `WORKOUT`, `LANGUAGE`, `CLIENT_MEETING`, `OTHER`
   - Comprehensive indexing strategy:
     - Partial covering index for non-deleted sessions (userId, startTime)
     - Stats index for completed sessions (userId, completed, startTime)
     - Type breakdown index (userId, type)
     - Partial index for conflict detection (active sessions only)
     - Composite partial index for suggestion tracking
   - CHECK constraints: endTime > startTime, priority range, completedAt consistency

4. **Availability Table** (`availability.ts`)
   - Stores weekly availability as JSONB
   - Structure: `{ "MONDAY": [{ startTime, endTime }], ... }`
   - One record per user (userId as primary key)
   - JSONB structure validation via CHECK constraint

#### Timezone Handling

- All timestamps stored in UTC (`timestamp with time zone`)
- User timezone preference stored in Profile table
- Utilities for timezone-aware date boundary calculations
- Uses `date-fns-tz` for reliable DST-aware conversions

### API (`packages/api`)

The API layer is built with tRPC v11 and provides type-safe endpoints:

#### Routers

1. **Auth Router** (`router/auth.ts`)
   - `getSession`: Get current user session
   - `signUpAnonymously`: Create anonymous user account (no email required)
   - `refreshToken`: Refresh authentication token

2. **Session Router** (`router/session.ts`)
   - `today`: Get sessions for today (timezone-aware, paginated)
   - `week`: Get sessions for current week (timezone-aware, paginated)
   - `byId`: Get session by ID
   - `create`: Create new session with conflict checking
   - `update`: Update existing session
   - `delete`: Soft delete session
   - `deleteAll`: Delete all user sessions (for DEV testing purposes)
   - `toggleComplete`: Mark session as completed/incomplete
   - `checkConflicts`: Check if time range conflicts with existing sessions
   - `suggest`: Get AI-powered time slot suggestions
   - `acceptSuggestion`: Create session from suggestion

3. **Availability Router** (`router/availability.ts`)
   - `get`: Get user's weekly availability
   - `setWeekly`: Set/update weekly availability (ultimately unused)

4. **Stats Router** (`router/stats.ts`)
   - `sessions`: Get comprehensive session statistics
     - Total, completed, pending counts
     - Breakdown by session type
     - Today and week stats (timezone-aware)

#### Smart Suggestions System

The suggestion engine (`helpers/suggestions.ts`) implements a sophisticated algorithm:

- **Pattern Detection**: Analyzes past completed sessions to detect repeating patterns
  - Identifies sessions that occur on specific days/times
  - Calculates frequency and success rate
  - Considers recency weighting

- **Scoring Algorithm**:
  - Pattern-based scoring (frequency, success rate, priority)
  - Spacing score (ensures sessions aren't too close together)
  - Day fatigue calculation (considers existing sessions on the day)
  - Recency weighting (recent patterns score higher)

- **Availability Checking**: Validates suggestions against user's weekly availability

- **Conflict Detection**: Ensures suggestions don't overlap with existing sessions

- **Diversity Enforcement**: Limits suggestions per day/type to ensure variety

- **Default Suggestions**: Falls back to default suggestions when no patterns detected

#### Error Handling

- Centralized error handling with `handleAsyncOperation`
- Production-safe error messages (stack traces removed in production)
- Zod validation error flattening
- Database and auth error categorization

#### Context & Middleware

- `protectedProcedure`: Ensures user authentication and loads timezone
- Timezone caching for performance
- User context utilities for safe user ID/timezone access

### Expo App (`apps/expo`)

#### State Management

- TanStack Query for server state
- Optimistic updates for better UX
- Query prefetching for performance
- Cache invalidation strategies

#### UI Components

- Custom component library with consistent styling
- Loading states and skeletons
- Error boundaries and error displays
- Toast notifications for user feedback
- Form components with React Hook Form + Zod validation

#### Timezone Handling

- Client-side timezone detection
- UTC to local time conversion for display
- Timezone-aware date formatting
- Session cache with timezone-aware filtering

## Architectural Choices

### Timezone Strategy

**Choice**: Store UTC, convert at boundaries

**Rationale**:

- Industry standard approach
- PostgreSQL handles UTC conversion automatically
- User timezone stored in profile for display
- Date boundary queries calculated in user timezone, then converted to UTC
- Uses `date-fns-tz` for reliable DST handling

### Suggestion Algorithm

**Choice**: Pattern-based with scoring system

**Rationale**:

- Learns from user behavior automatically
- No manual configuration needed
- Considers multiple factors (frequency, success rate, spacing, fatigue)
- Falls back to defaults when no patterns exist
- Provides reasoning for transparency

## What Could Be Improved with More Time

### Database Improvements

1. **DB operations**
   I did optimize db queries but nothing extra fancy.
   - No materialized views implemented
   - Expensive queries could be cached (see [Infrastructure Improvements](#infrastructure-improvements))
   - Couldn't get transactions to properly work, had to move away due to time, definitely some partial updates and inconsistent data could be created/orphaned, dit not want to waste time on complex clean up where a transation would solve the issue.

### Infrastructure Improvements

1. **Redis**
   I did not use Redis as cache, although I wanted to get more familiar with, wanted to avoid a rabbit hole.
   - Rate limiting is implemented in memory and won't scale
   - User sessions, timezones, availibities (and probably suggestions) should be properly cached

### Feature Enhancements

1. **Suggestion engine**
   Crafted a sound algorithm (after a couple of iteraions) matching the criterias.
   - I use default suggestions when user has not enough sessions yet
   - Default suggestions are based on availibilty but pretty default
   - Client side suggestions are not refetched on accepting/adjusting one, to prevent a refetch with an invalid avalibility window. It is an acceptable trade but could definitely be improved.

2. **Onboarding**
   Would have loved to implement an onboarding after user creates an account.
   - Defining availibility
   - Defining preferences to craft relevant default suggestions

3. **Availibility**
   - Availibilities are defined arbitrarely for users (7-9am Mon-Fri and 10-2pm Sat-Sun)
   - Rough calendar component generated to visualize it in Settings
   - ~Unused Availibity edition

### Expo App Improvements

1. **Smoothness**
   UX could be improved, no smooth animations nor transitions, Reanimated isn't used at all really.
   - Main pages are ScrollViews, should move away from it when layout or features change
   - Transparent StatusBar and minimnal SafeArea padding because I love this esthetic

2. **Forms**
   I implemented simple forms, far from pretty but does the job.
   - Used Formik then transitioned to React Hook Form, but user feedback could be improved
   - Form components are pretty bare and are not using native functionalities

3. **Offline Support**
   Always wanted to get my hands on a proper offline-first client, went online for time concerns.
   - Implement offline-first architecture
   - Local database with sync (SQLite + WatermelonDB)
   - Queue mutations when offline
   - Optimistic UI updates
