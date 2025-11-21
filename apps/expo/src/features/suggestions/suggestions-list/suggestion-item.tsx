import React from "react";
import { View } from "react-native";

import type { SuggestionWithId } from "~/types";
import { Card } from "~/components";
import { SUGGESTION_ITEM_HEIGHT, SUGGESTION_ITEM_WIDTH } from "~/constants/app";
import { SuggestionItemActions } from "./suggestion-item-actions";
import { SuggestionItemDisplay } from "./suggestion-item-display";
import { useSuggestionMutation } from "./use-suggestion-mutation";

interface SuggestionItemProps {
  suggestion: SuggestionWithId;
  horizontal?: boolean;
}

/**
 * Individual suggestion item component
 * Displays a single suggestion in a horizontal scrolling list
 * Composed of display and action sub-components
 */
export const SuggestionItem = React.memo<SuggestionItemProps>(
  ({ suggestion, horizontal = false }) => {
    const { createSessionMutation } = useSuggestionMutation();

    return (
      <View
        style={{
          width: horizontal ? SUGGESTION_ITEM_WIDTH : undefined,
          height: SUGGESTION_ITEM_HEIGHT,
        }}
      >
        <Card variant="muted" className="bg-suggestion-card flex-1 p-6">
          <SuggestionItemDisplay suggestion={suggestion} />
          <SuggestionItemActions
            suggestion={suggestion}
            isPending={createSessionMutation.isPending}
          />
        </Card>
      </View>
    );
  },
);

SuggestionItem.displayName = "SuggestionItem";
