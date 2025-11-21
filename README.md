# Smart Session Planner

A productivity-focused mobile application built with React Native (Expo) that helps users plan and track their work sessions. The app features AI-powered time slot suggestions based on user patterns, availability management, and comprehensive session tracking with statistics.

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Mobile App**: Expo (React Native) with Expo Router
- **Backend**: tRPC API with Next.js
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Supabase
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod schemas

## Setup Instructions

### Prerequisites

- Node.js `^22.21.0`
- pnpm `^10.19.0`
- PostgreSQL database (Neon recommended)
- Supabase account for authentication

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
   POSTGRES_URL=postgresql://user:password@host:port/database

   # Supabase Configuration
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Push database schema**

   ```bash
   pnpm db:push
   ```

5. **Start development servers**

   ```bash
   # Start all apps (Expo + Next.js)
   pnpm dev

   # Or start individually
   pnpm dev:next  # Start Next.js backend only
   cd apps/expo && pnpm dev  # Start Expo app only
   ```

### Expo App Configuration

The Expo app can be run on iOS or Android:

- **iOS**: Requires Xcode and iOS Simulator

  ```bash
   cd apps/expo
   pnpm dev:ios
  ```

- **Android**: Requires Android Studio and Android Emulator
  ```bash
  cd apps/expo
  pnpm dev:android
  ```

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

#### Database Client

- Uses Neon HTTP driver for edge-compatible database access
- Lazy initialization pattern for better testability
- Proxy-based export to maintain interface while enabling lazy loading
- Snake case column naming convention

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
   - `deleteAll`: Delete all user sessions
   - `toggleComplete`: Mark session as completed/incomplete
   - `checkConflicts`: Check if time range conflicts with existing sessions
   - `suggest`: Get AI-powered time slot suggestions
   - `acceptSuggestion`: Create session from suggestion

3. **Availability Router** (`router/availability.ts`)
   - `get`: Get user's weekly availability
   - `setWeekly`: Set/update weekly availability

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

The mobile application is built with Expo Router and React Native:

#### Navigation Structure

- **Root Layout**: Handles authentication state and splash screen
- **Auth Flow**: Welcome screen with sign-in button
- **App Flow**: Protected routes with tab navigation
  - Home tab: Dashboard with sessions and suggestions
  - Settings tab: User preferences and account management

#### Key Features

1. **Home Screen** (`app/(app)/(tabs)/home.tsx`)
   - Session recap card with statistics
   - Smart suggestions section with retry logic
   - Today's sessions list
   - Progress card
   - Add session button

2. **Session Management**
   - Create/edit session form with validation
   - Time picker with timezone awareness
   - Conflict detection before creation
   - Session completion toggle
   - Session deletion (soft delete)

3. **Suggestions Screen** (`app/(app)/suggestions/index.tsx`)
   - Displays AI-generated time slot suggestions
   - Shows suggestion score and reasoning
   - One-tap session creation from suggestions
   - Suggestion ID generation for tracking

4. **Settings Screen** (`app/(app)/(tabs)/settings.tsx`)
   - User profile management
   - Timezone selection
   - Availability configuration
   - Sign out functionality

5. **Session Detail Screen** (`app/(app)/session/[id]/index.tsx`)
   - View session details
   - Edit session
   - Delete session
   - Completion toggle

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

### Monorepo Structure

**Choice**: Turborepo with pnpm workspaces

**Rationale**:

- Shared code between packages (validators, types, UI components)
- Type-safe API client in Expo app (dev dependency only)
- Consistent tooling across packages
- Efficient build caching with Turborepo

### Database: Drizzle ORM

**Choice**: Drizzle ORM over Prisma or TypeORM

**Rationale**:

- Lightweight and performant
- Excellent TypeScript support
- Edge-compatible (Neon HTTP driver)
- Flexible query API
- Schema migrations with Drizzle Kit

### API: tRPC

**Choice**: tRPC over REST or GraphQL

**Rationale**:

- End-to-end type safety
- No code generation needed
- Excellent developer experience
- Built-in validation with Zod
- Works seamlessly with React Query

### Authentication: Supabase

**Choice**: Supabase for authentication

**Rationale**:

- Anonymous authentication support (no email required)
- Flexible auth provider system
- Supabase handles user management
- Direct integration with Supabase Auth API

### Mobile: Expo

**Choice**: Expo over bare React Native

**Rationale**:

- Faster development iteration
- Over-the-air updates with EAS Update
- Built-in navigation (Expo Router)
- Easy deployment to app stores
- No native code required for most features

### Styling: NativeWind

**Choice**: NativeWind (Tailwind CSS for React Native)

**Rationale**:

- Familiar Tailwind CSS syntax
- Shared theme configuration with web app
- Consistent design system
- Good performance with NativeWind v5

### Timezone Strategy

**Choice**: Store UTC, convert at boundaries

**Rationale**:

- Industry standard approach
- PostgreSQL handles UTC conversion automatically
- User timezone stored in profile for display
- Date boundary queries calculated in user timezone, then converted to UTC
- Uses `date-fns-tz` for reliable DST handling

### Indexing Strategy

**Choice**: Comprehensive partial and covering indexes

**Rationale**:

- Optimized for common query patterns (today, week, stats)
- Partial indexes reduce index size (only non-deleted sessions)
- Covering indexes avoid table lookups
- Leftmost column rule for efficient query planning

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

1. **Query Optimization**
   - Add database query performance monitoring
   - Consider materialized views for complex stats queries
   - Implement query result caching for frequently accessed data

2. **Data Archival**
   - Implement archival strategy for old completed sessions
   - Add partitioning for large session tables
   - Consider separate tables for historical data

3. **Full-Text Search**
   - Add PostgreSQL full-text search for session titles/descriptions
   - Enable searching sessions by content

### API Improvements

1. **Rate Limiting**
   - Implement rate limiting per user/IP
   - Protect suggestion endpoint from abuse
   - Add request throttling

2. **Caching Layer**
   - Add Redis caching for frequently accessed data
   - Cache user timezone and availability
   - Cache suggestion results with TTL

3. **Batch Operations**
   - Add batch session creation endpoint
   - Bulk update operations
   - Batch conflict checking

4. **Webhooks/Events**
   - Add webhook support for session events
   - Event-driven architecture for notifications
   - Real-time updates via WebSockets

5. **Advanced Suggestions**
   - Machine learning model for better predictions
   - Consider calendar integration for external events
   - Weather/context-aware suggestions
   - Multi-user scheduling (team sessions)

### Expo App Improvements

1. **Offline Support**
   - Implement offline-first architecture
   - Local database with sync (SQLite + WatermelonDB)
   - Queue mutations when offline
   - Optimistic UI updates

2. **Push Notifications**
   - Session reminders
   - Suggestion notifications
   - Achievement notifications

3. **Analytics**
   - User behavior tracking
   - Session completion analytics
   - Suggestion acceptance rates
   - Performance monitoring

4. **Accessibility**
   - Screen reader support
   - Voice commands
   - High contrast mode
   - Font size scaling

5. **Performance**
   - Image optimization
   - Code splitting
   - Lazy loading for screens
   - Memory optimization

6. **Testing**
   - Unit tests for utilities
   - Integration tests for API
   - E2E tests with Detox
   - Visual regression testing

### Feature Enhancements

1. **Session Templates**
   - Save common session configurations
   - Quick creation from templates
   - Template sharing between users

2. **Recurring Sessions**
   - Daily/weekly/monthly recurring sessions
   - Exception handling (skip specific dates)
   - Series management

3. **Session Notes**
   - Rich text notes
   - Attachments (images, files)
   - Session reflection prompts

4. **Goals & Targets**
   - Set weekly/monthly goals
   - Track progress toward goals
   - Goal-based suggestions

5. **Social Features**
   - Share sessions with friends
   - Accountability partners
   - Leaderboards

6. **Export & Reporting**
   - Export sessions to calendar (iCal)
   - PDF reports
   - CSV export for analysis

### Infrastructure Improvements

1. **Monitoring & Observability**
   - Application performance monitoring (APM)
   - Error tracking (Sentry)
   - Log aggregation
   - Database query monitoring

2. **CI/CD**
   - Automated testing in CI
   - Automated deployments
   - Preview deployments for PRs
   - E2E testing in CI

3. **Documentation**
   - API documentation (OpenAPI/Swagger)
   - Component storybook
   - Architecture decision records (ADRs)
   - User documentation

4. **Security**
   - Security audit
   - Penetration testing
   - Rate limiting improvements
   - Input sanitization review

5. **Scalability**
   - Database connection pooling optimization
   - Horizontal scaling preparation
   - CDN for static assets
   - Edge function optimization

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start all apps
pnpm dev:next              # Start Next.js backend only

# Database
pnpm db:push               # Push schema to database
pnpm db:studio             # Open Drizzle Studio

# Code Quality
pnpm lint                  # Lint all packages
pnpm lint:fix              # Fix linting issues
pnpm typecheck             # Type check all packages
pnpm format                # Check formatting
pnpm format:fix            # Fix formatting

# Building
pnpm build                 # Build all packages

# Expo
cd apps/expo
pnpm dev                   # Start Expo dev server
pnpm dev:ios               # Start iOS simulator
pnpm dev:android           # Start Android emulator
```

## Project Structure

```
smart-session-planner/
├── apps/
│   ├── expo/              # React Native mobile app
│   └── nextjs/            # Next.js backend (tRPC server)
├── packages/
│   ├── api/               # tRPC API routes and helpers
│   ├── auth/              # Supabase authentication configuration
│   ├── db/                # Database schema and client
│   ├── ui/                # Shared UI components
│   └── validators/        # Zod validation schemas
├── tooling/               # Shared tooling configs
│   ├── eslint/
│   ├── prettier/
│   ├── tailwind/
│   └── typescript/
└── docs/                  # Documentation
```

## License

MIT
