# Timezone Implementation Summary

## What We've Done

### 1. **Database Schema Updates**

- ✅ Added `timezone` field to `Profile` table (IANA timezone string)
- ✅ Updated `Session.startTime` and `endTime` to use `timestamp with time zone` (stores UTC)
- ✅ This ensures PostgreSQL automatically handles UTC conversion

### 2. **Timezone Utilities**

- ✅ Created `packages/db/src/utils/timezone.ts` with helper functions
- ⚠️ **Note**: The current implementation uses `Intl.DateTimeFormat` which works but can be complex
- 💡 **Recommendation**: Consider using `date-fns-tz` library for more reliable conversions

### 3. **Documentation**

- ✅ Created `TIMEZONE_GUIDE.md` with comprehensive best practices
- ✅ Created example code showing timezone-aware queries

## Key Decisions Made

### ✅ Store UTC in Database

- All timestamps stored as UTC
- PostgreSQL `timestamp with time zone` handles conversion automatically
- This is the industry standard approach

### ✅ User Timezone Preference

- Store in `Profile.timezone` as IANA timezone string (e.g., `"America/New_York"`)
- Default to `"UTC"` if not set
- Can be updated by user in settings

### ✅ API Layer Strategy

- **Input**: Accept ISO 8601 date strings (includes timezone info)
- **Storage**: Convert to UTC before storing
- **Output**: Return UTC timestamps, frontend converts for display

## What Still Needs to Be Done

### 1. **Update Session Router** (High Priority)

- [ ] Update `today` query to use user's timezone
- [ ] Update `byDateRange` query to handle timezone boundaries
- [ ] Ensure `create` and `update` properly handle timezone conversions
- See `session-timezone-example.ts` for reference

### 2. **Add date-fns-tz Library** (Recommended)

```bash
cd packages/db
pnpm add date-fns-tz
```

Then update `timezone.ts` to use:

```typescript
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
```

### 3. **Frontend Implementation**

- [ ] Detect user's timezone on first login: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] Save to user profile
- [ ] Convert UTC timestamps to user's timezone for display
- [ ] Send dates with timezone info when creating/updating sessions

### 4. **User Settings**

- [ ] Add timezone selector in user settings
- [ ] Allow users to manually override detected timezone
- [ ] Update profile when timezone changes

### 5. **Testing**

- [ ] Test with users in different timezones
- [ ] Test DST transitions (spring forward, fall back)
- [ ] Test date boundary queries ("today" in different timezones)
- [ ] Test sessions spanning multiple days/timezones

## Critical Considerations

### Date Boundaries

**Problem**: "Today" means different things in different timezones.

**Example**:

- User in New York: Nov 17, 2024 00:00 EST = Nov 17, 2024 05:00 UTC
- User in Tokyo: Nov 17, 2024 00:00 JST = Nov 16, 2024 15:00 UTC

**Solution**: Always calculate date boundaries in user's timezone, then convert to UTC for database queries.

### DST (Daylight Saving Time)

**Problem**: Timezone offsets change twice a year.

**Solution**: Use IANA timezone strings (e.g., `"America/New_York"`) which automatically account for DST. Don't use fixed offsets like `"UTC-5"`.

### ISO 8601 Format

Always use ISO 8601 format for date/time strings:

- ✅ `"2024-11-17T19:00:00-05:00"` (with timezone)
- ✅ `"2024-11-17T19:00:00Z"` (UTC)
- ❌ `"2024-11-17 19:00:00"` (no timezone - ambiguous)

## Next Steps

1. **Immediate**: Review and integrate timezone handling into session router
2. **Short-term**: Add `date-fns-tz` library for more reliable conversions
3. **Short-term**: Implement frontend timezone detection and display
4. **Medium-term**: Add user timezone settings UI
5. **Ongoing**: Test with users in different timezones

## Resources

- [IANA Timezone Database](https://www.iana.org/time-zones)
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [PostgreSQL: Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
