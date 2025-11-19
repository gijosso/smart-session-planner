import type { SuggestedSession } from "@ssp/api/client";

export interface SuggestionWithId extends SuggestedSession {
  id: string;
}
