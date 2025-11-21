/**
 * Application-wide constants
 */

// Suggestion look-ahead days
export const SUGGESTION_LOOK_AHEAD_DAYS = 14;

// Component dimensions
export const SUGGESTION_ITEM_WIDTH = 300;
export const SUGGESTION_ITEM_HEIGHT = 250;

// Priority levels
export const PRIORITY_LEVELS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_PRIORITY = 3;
export const MIN_PRIORITY = 1;
export const MAX_PRIORITY = 5;

// Inline styles (to avoid creating new objects on each render)
export const FLEX_1_STYLE = { flex: 1 } as const;
