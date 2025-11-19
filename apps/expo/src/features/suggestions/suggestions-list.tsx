import type React from "react";
import { ScrollView } from "react-native";

import type { SessionType } from "@ssp/api/client";

import { SuggestionItem } from "./suggestion-item";

interface SuggestionsListProps {
  suggestions: {
    id: string;
    startTime: Date;
    endTime: Date;
    score: number;
    reasons: string[];
  }[];
  sessionType: SessionType;
  durationMinutes: number;
  priority: number;
  onSuggestionAccepted?: (suggestionId: string) => void;
  cardWidth?: number;
}

/**
 * Horizontal scrolling list of suggestions
 */
export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  sessionType,
  durationMinutes,
  priority,
  onSuggestionAccepted,
  cardWidth = 320,
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      className="flex-row"
    >
      {suggestions.map((suggestion) => (
        <SuggestionItem
          key={suggestion.id}
          suggestion={suggestion}
          sessionType={sessionType}
          durationMinutes={durationMinutes}
          priority={priority}
          onAccepted={() => onSuggestionAccepted?.(suggestion.id)}
          cardWidth={cardWidth}
        />
      ))}
    </ScrollView>
  );
};
