import React, { useCallback } from "react";
import { router } from "expo-router";

import type { SuggestionWithId } from "~/types";
import { Button, CardFooter } from "~/components";
import { useSuggestionMutation } from "./use-suggestion-mutation";

interface SuggestionItemActionsProps {
  suggestion: SuggestionWithId;
  isPending: boolean;
}

/**
 * Actions component for suggestion item
 * Renders Accept and Adjust buttons with their handlers
 */
export const SuggestionItemActions = React.memo<SuggestionItemActionsProps>(
  ({ suggestion, isPending }) => {
    const { handleAccept } = useSuggestionMutation();

    const onAccept = useCallback(() => {
      handleAccept(suggestion);
    }, [suggestion, handleAccept]);

    // Handle adjust - navigates to create page with suggestion data as initial values
    const handleAdjust = useCallback(() => {
      router.push({
        pathname: "/session/create",
        params: {
          title: suggestion.title,
          type: suggestion.type,
          startTime: suggestion.startTime.toISOString(),
          endTime: suggestion.endTime.toISOString(),
          priority: String(suggestion.priority),
          description: suggestion.description ?? "",
        },
      });
    }, [suggestion]);

    return (
      <CardFooter className="flex flex-row gap-4">
        <Button
          size="lg"
          onPress={onAccept}
          disabled={isPending}
          className="flex-1"
          accessibilityLabel={`Accept suggestion: ${suggestion.title}`}
          accessibilityRole="button"
        >
          {isPending ? "Accepting..." : "Accept"}
        </Button>
        <Button
          size="md"
          variant="secondary"
          onPress={handleAdjust}
          disabled={isPending}
          accessibilityLabel={`Adjust suggestion: ${suggestion.title}`}
          accessibilityRole="button"
        >
          Adjust
        </Button>
      </CardFooter>
    );
  },
);

SuggestionItemActions.displayName = "SuggestionItemActions";

