import type { db } from "@ssp/db/client";
import { sql } from "@ssp/db";
import { SESSION_TYPES } from "@ssp/db/schema";

import { withErrorHandling } from "../utils/error";

export interface SessionStats {
  total: number;
  completed: number;
  pending: number;
  completionRate: number; // Percentage (0-100)
  byType: Record<(typeof SESSION_TYPES)[number], number>;
  averageSpacingHours: number | null; // Average hours between consecutive sessions (null if < 2 sessions)
  currentStreakDays: number; // Current consecutive days with sessions
  longestStreakDays: number; // Longest consecutive days streak
}

/**
 * Get session statistics for a user
 * Optimized: Uses SQL aggregations (COUNT, GROUP BY) instead of fetching all sessions
 *
 * This is server-side optimized and pre-computed on each request.
 * For even better performance, consider:
 * - Caching results with TTL (e.g., Redis) if needed
 * - Materialized views for very large datasets
 */
export const getSessionStats = async (
  database: typeof db,
  userId: string,
): Promise<SessionStats> =>
  withErrorHandling(
    async () => {
      // Combined query: Get summary stats and type breakdown in a single query
      // This reduces database round trips from 2 to 1
      // Excludes soft-deleted sessions (deleted_at IS NULL)
      const combinedResult = await database.execute(
        sql`
      WITH summary AS (
        SELECT 
          COUNT(*)::integer as total,
          COUNT(*) FILTER (WHERE completed = true)::integer as completed
        FROM session
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
      ),
      type_breakdown AS (
        SELECT 
          type,
          COUNT(*)::integer as count
        FROM session
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
        GROUP BY type
      )
      SELECT 
        s.total,
        s.completed,
        COALESCE(
          (SELECT json_object_agg(type::text, count) FROM type_breakdown),
          '{}'::json
        ) as by_type
      FROM summary s
    `,
      );

      // Validate result structure before type assertion
      if (!combinedResult.rows[0]) {
        return {
          total: 0,
          completed: 0,
          pending: 0,
          completionRate: 0,
          byType: {} as Record<(typeof SESSION_TYPES)[number], number>,
          averageSpacingHours: null,
          currentStreakDays: 0,
          longestStreakDays: 0,
        };
      }

      const row = combinedResult.rows[0];
      const total = Number(row.total ?? 0);
      const completed = Number(row.completed ?? 0);
      const pending = total - completed;

      // Validate by_type is an object
      const byTypeRaw = row.by_type;
      const byType =
        typeof byTypeRaw === "object" &&
        byTypeRaw !== null &&
        !Array.isArray(byTypeRaw)
          ? (byTypeRaw as Record<string, number>)
          : {};

      // Initialize all types to 0
      const byTypeResult = {} as Record<(typeof SESSION_TYPES)[number], number>;
      for (const type of SESSION_TYPES) {
        byTypeResult[type] = 0;
      }

      // Populate from database results
      for (const [type, count] of Object.entries(byType)) {
        if (SESSION_TYPES.includes(type as (typeof SESSION_TYPES)[number])) {
          byTypeResult[type as (typeof SESSION_TYPES)[number]] = Number(count);
        }
      }

      // Calculate completion rate
      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate average spacing between consecutive sessions using SQL window functions
      // This is efficient: runs entirely in database, uses LAG to get previous session
      // Includes all sessions (not just completed) to show spacing in your schedule
      // Excludes soft-deleted sessions
      const spacingResult = await database.execute(
        sql`
      WITH ordered_sessions AS (
        SELECT 
          start_time,
          LAG(start_time) OVER (ORDER BY start_time) as prev_start_time
        FROM session
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
        ORDER BY start_time
      ),
      spacing_calculations AS (
        SELECT 
          EXTRACT(EPOCH FROM (start_time - prev_start_time)) / 3600.0 as spacing_hours
        FROM ordered_sessions
        WHERE prev_start_time IS NOT NULL
      )
      SELECT 
        AVG(spacing_hours)::numeric as avg_spacing_hours
      FROM spacing_calculations
    `,
      );

      // Validate spacing result structure before type assertion
      const spacingRowRaw = spacingResult.rows[0];
      let averageSpacingHours: number | null = null;

      if (spacingRowRaw && typeof spacingRowRaw === "object") {
        const spacingRow = spacingRowRaw;
        const avgSpacingRaw = spacingRow.avg_spacing_hours;

        if (avgSpacingRaw !== null && avgSpacingRaw !== undefined) {
          if (typeof avgSpacingRaw === "number") {
            averageSpacingHours = avgSpacingRaw;
          } else if (typeof avgSpacingRaw === "string") {
            const parsed = Number.parseFloat(avgSpacingRaw);
            if (!Number.isNaN(parsed)) {
              averageSpacingHours = parsed;
            }
          }
        }
      }

      // Calculate streaks using SQL
      // Groups sessions by day, finds consecutive days, calculates current and longest streak
      // Uses the "islands" technique: consecutive dates have the same (date - row_number) value
      // Excludes soft-deleted sessions
      const streakResult = await database.execute(
        sql`
      WITH daily_sessions AS (
        SELECT DISTINCT
          DATE(start_time AT TIME ZONE 'UTC') as session_date
        FROM session
        WHERE user_id = ${userId}
          AND completed = true
          AND deleted_at IS NULL
        ORDER BY session_date DESC
      ),
      date_groups AS (
        SELECT 
          session_date,
          session_date - ROW_NUMBER() OVER (ORDER BY session_date) * INTERVAL '1 day' as grp
        FROM daily_sessions
      ),
      streaks AS (
        SELECT 
          grp,
          COUNT(*)::integer as streak_length,
          MIN(session_date) as streak_start,
          MAX(session_date) as streak_end
        FROM date_groups
        GROUP BY grp
      ),
      current_streak_calc AS (
        SELECT 
          streak_length,
          CASE 
            WHEN streak_end >= CURRENT_DATE - INTERVAL '1 day' THEN streak_length
            ELSE 0
          END as is_current
        FROM streaks
        ORDER BY streak_end DESC
        LIMIT 1
      ),
      longest_streak_calc AS (
        SELECT MAX(streak_length)::integer as longest_streak
        FROM streaks
      )
      SELECT 
        COALESCE((SELECT streak_length FROM current_streak_calc WHERE is_current > 0), 0)::integer as current_streak,
        COALESCE((SELECT longest_streak FROM longest_streak_calc), 0)::integer as longest_streak
    `,
      );

      // Validate streak result structure before type assertion
      const resultRowRaw = streakResult.rows[0];
      let currentStreakDays = 0;
      let longestStreakDays = 0;

      if (resultRowRaw && typeof resultRowRaw === "object") {
        const resultRow = resultRowRaw;

        const currentStreakRaw = resultRow.current_streak;
        if (currentStreakRaw !== null && currentStreakRaw !== undefined) {
          const parsed = Number(currentStreakRaw);
          if (!Number.isNaN(parsed)) {
            currentStreakDays = parsed;
          }
        }

        const longestStreakRaw = resultRow.longest_streak;
        if (longestStreakRaw !== null && longestStreakRaw !== undefined) {
          const parsed = Number(longestStreakRaw);
          if (!Number.isNaN(parsed)) {
            longestStreakDays = parsed;
          }
        }
      }

      return {
        total,
        completed,
        pending,
        completionRate,
        byType: byTypeResult,
        averageSpacingHours:
          averageSpacingHours !== null
            ? Math.round(averageSpacingHours * 10) / 10
            : null, // Round to 1 decimal
        currentStreakDays,
        longestStreakDays,
      };
    },
    "get session stats",
    { userId },
  );
