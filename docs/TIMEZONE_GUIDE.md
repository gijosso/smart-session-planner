# Timezone Handling Guide

## Core Principles

### 1. **Store Everything in UTC**

- All timestamps in the database (`startTime`, `endTime`) are stored in UTC
- PostgreSQL `timestamp with time zone` automatically converts to UTC on insert
- This ensures consistency regardless of server location or user timezone

### 2. **User Timezone Preference**

- Store user's timezone in `Profile.timezone` as IANA timezone string (e.g., `"America/New_York"`)
- Default to `"UTC"` if not set
- Allow users to change their timezone preference

### 3. **API Layer: Accept UTC, Return UTC**

- API accepts dates/times in ISO 8601 format (which includes timezone info)
- Frontend should send times in user's local timezone as ISO strings
- API converts to UTC before storing
- API returns UTC times, frontend converts for display

### 4. **Frontend: Convert for Display**

- Always display times in user's timezone
- Use browser's `Intl.DateTimeFormat` or libraries like `date-fns-tz`
- When creating/editing sessions, work in user's timezone, convert to UTC before sending

## Implementation Strategy

### Database Schema

```typescript
// Session timestamps store UTC
startTime: t.timestamp({ mode: "date", withTimezone: true }).notNull();
endTime: t.timestamp({ mode: "date", withTimezone: true }).notNull();

// Profile stores user's timezone preference
timezone: t.varchar({ length: 50 }); // IANA timezone string
```

### API Input/Output

**Input (from frontend):**

- Frontend sends: `"2024-11-17T19:00:00-05:00"` (user's local time with timezone)
- API receives: JavaScript `Date` object (automatically parsed)
- API stores: UTC equivalent in database

**Output (to frontend):**

- Database returns: UTC timestamp
- API sends: ISO 8601 string in UTC: `"2024-11-18T00:00:00Z"`
- Frontend converts: Uses user's timezone to display: `"Nov 17, 7:00 PM EST"`

### Date Boundary Queries

**Problem:** "Today" means different things in different timezones.

**Solution:**

1. Get user's timezone from profile
2. Calculate start/end of "today" in user's timezone
3. Convert those boundaries to UTC
4. Query database using UTC boundaries

Example:

```typescript
// User in New York (EST, UTC-5)
// "Today" = Nov 17, 2024 00:00:00 EST to Nov 18, 2024 00:00:00 EST
// In UTC = Nov 17, 2024 05:00:00 UTC to Nov 18, 2024 05:00:00 UTC
```

## Recommended Libraries

### For Backend (Node.js)

- **date-fns-tz**: Excellent for timezone conversions
  ```bash
  pnpm add date-fns-tz
  ```

### For Frontend (React/Expo)

- **date-fns-tz**: Same library works in both environments
- **Intl.DateTimeFormat**: Built-in browser API (no dependencies)

## Common Pitfalls to Avoid

1. ❌ **Don't use `new Date()` without timezone awareness**
   - `new Date()` uses system timezone, not user timezone
2. ❌ **Don't store local times without timezone info**
   - Always include timezone offset or use UTC
3. ❌ **Don't assume server timezone = user timezone**
   - Server might be in UTC, user could be anywhere
4. ❌ **Don't do date math without timezone conversion**
   - Adding 24 hours doesn't always mean "next day" (DST changes)
5. ❌ **Don't use string manipulation for dates**
   - Use proper date libraries for conversions

## Example: "Today's Sessions" Query

```typescript
// 1. Get user's timezone
const userTimezone = profile.timezone || "UTC";

// 2. Get current date in user's timezone
const nowInUserTz = new Date().toLocaleString("en-US", {
  timeZone: userTimezone,
});
const today = new Date(nowInUserTz);

// 3. Get start of today in user's timezone, convert to UTC
const startOfDay = getStartOfDayInTimezone(today, userTimezone);

// 4. Get end of today (start of tomorrow) in user's timezone, convert to UTC
const endOfDay = getEndOfDayInTimezone(today, userTimezone);

// 5. Query database with UTC boundaries
const sessions = await db.query.Session.findMany({
  where: and(
    eq(Session.userId, userId),
    gte(Session.startTime, startOfDay), // UTC
    lt(Session.startTime, endOfDay), // UTC
  ),
});
```

## Testing Timezone Handling

Test with users in different timezones:

- New York (EST/EDT): UTC-5/UTC-4
- London (GMT/BST): UTC+0/UTC+1
- Tokyo (JST): UTC+9
- Sydney (AEDT): UTC+11

Test edge cases:

- DST transitions (spring forward, fall back)
- Date boundaries (midnight in different timezones)
- Sessions spanning multiple days
- Sessions spanning DST changes

## Migration Strategy

1. **Existing Data**: If you have existing sessions without timezone info:
   - Assume they were created in UTC (or user's current timezone)
   - May need to migrate if you know the original timezone

2. **New Data**: All new sessions use UTC timestamps with timezone

3. **User Timezone**:
   - Detect on first login: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Allow manual override in settings
   - Update profile when changed
