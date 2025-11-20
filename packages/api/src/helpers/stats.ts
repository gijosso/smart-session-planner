import type { db } from "@ssp/db/client";
import { sql } from "@ssp/db";
import { SESSION_TYPES } from "@ssp/db/schema";

import { DatabaseError } from "../utils/error/codes";

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
 * Performance benefits:
 * - Runs entirely in database (no data transfer)
 * - Uses database indexes efficiently (indexes on user_id, user_id+completed, user_id+type, etc.)
 * - Scales well as session count grows (O(1) data transfer vs O(n))
 * - Combined query for summary and type breakdown (reduces round trips)
 *
 * This is server-side optimized and pre-computed on each request.
 * For even better performance, consider:
 * - Caching results with TTL (e.g., Redis) if needed
 * - Materialized views for very large datasets
 */
export async function getSessionStats(
  database: typeof db,
  userId: string,
): Promise<SessionStats> {
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

  // Type guard for query result
  const combinedRow = combinedResult.rows[0];
  if (!combinedRow || typeof combinedRow !== "object") {
    throw new DatabaseError(
      "Unexpected database result format when fetching session statistics",
      undefined,
      { userId, operation: "getSessionStats" },
    );
  }

  const total =
    typeof combinedRow.total === "number"
      ? combinedRow.total
      : Number(combinedRow.total ?? 0);
  const completed =
    typeof combinedRow.completed === "number"
      ? combinedRow.completed
      : Number(combinedRow.completed ?? 0);
  const pending = total - completed;

  // Initialize all types to 0
  const byType = {} as Record<(typeof SESSION_TYPES)[number], number>;
  for (const type of SESSION_TYPES) {
    byType[type] = 0;
  }

  // Populate from database results
  const byTypeData = combinedRow.by_type;
  if (byTypeData && typeof byTypeData === "object" && !Array.isArray(byTypeData)) {
    for (const [type, count] of Object.entries(byTypeData)) {
      if (
        SESSION_TYPES.includes(type as (typeof SESSION_TYPES)[number]) &&
        typeof count === "number"
      ) {
        byType[type as (typeof SESSION_TYPES)[number]] = count;
      }
    }
  }

  // Calculate completion rate
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

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

  const spacingRow = spacingResult.rows[0];
  const averageSpacingHours =
    spacingRow &&
    typeof spacingRow === "object" &&
    "avg_spacing_hours" in spacingRow
      ? typeof spacingRow.avg_spacing_hours === "number"
        ? spacingRow.avg_spacing_hours
        : spacingRow.avg_spacing_hours === null
          ? null
          : Number(spacingRow.avg_spacing_hours) || null
      : null;

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

  const resultRow = streakResult.rows[0];
  if (!resultRow || typeof resultRow !== "object") {
    return {
      total,
      completed,
      pending,
      completionRate,
      byType,
      averageSpacingHours:
        averageSpacingHours !== null
          ? Math.round(averageSpacingHours * 10) / 10
          : null,
      currentStreakDays: 0,
      longestStreakDays: 0,
    };
  }

  const currentStreakDays =
    typeof resultRow.current_streak === "number"
      ? resultRow.current_streak
      : Number(resultRow.current_streak ?? 0);
  const longestStreakDays =
    typeof resultRow.longest_streak === "number"
      ? resultRow.longest_streak
      : Number(resultRow.longest_streak ?? 0);

  return {
    total,
    completed,
    pending,
    completionRate,
    byType,
    averageSpacingHours:
      averageSpacingHours !== null
        ? Math.round(averageSpacingHours * 10) / 10
        : null, // Round to 1 decimal
    currentStreakDays,
    longestStreakDays,
  };
}
