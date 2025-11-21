import React, { memo, useCallback } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { SuggestionWithId } from "~/types";
import type { AppError } from "~/utils/error/types";
import { Button } from "~/components/button";
import { Content } from "~/components/layout/content";
import { SkeletonList } from "~/components/layout/skeleton-loader";
import { FLEX_1_STYLE, SUGGESTION_ITEM_HEIGHT } from "~/constants/app";
import { COLORS_MUTED } from "~/constants/colors";
import { SuggestionsList } from "./suggestions-list";

type SmartSuggestionsSectionProps = {
  suggestions: SuggestionWithId[];
  isLoading?: boolean;
  error?: AppError;
  onRetry?: () => void;
};

/**
 * Smart Suggestions Section
 * Displays the header and list of suggestions for the home screen
 * Automatically hides when there are no suggestions and not loading
 * Memoized to prevent unnecessary re-renders when parent re-renders
 */
export const SmartSuggestionsSection = memo<SmartSuggestionsSectionProps>(
  ({ suggestions, isLoading = false, error, onRetry }) => {
  const handleNavigateToSuggestions = useCallback(() => {
    router.push("/suggestions");
  }, []);

  // Hide section if not loading, no suggestions, and no error
  if (!isLoading && suggestions.length === 0 && !error) {
    return null;
  }

  return (
    <>
      <Content>
        <View className="flex flex-row items-center justify-between">
          <Text
            className="text-foreground text-2xl"
            accessibilityRole="header"
          >
            Smart Suggestions
          </Text>
          <Button
            variant="ghost"
            size="icon"
            onPress={handleNavigateToSuggestions}
            accessibilityLabel="View all suggestions"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color={COLORS_MUTED}
              accessibilityLabel="Navigate to suggestions"
            />
          </Button>
        </View>
      </Content>
      <View style={FLEX_1_STYLE}>
        {isLoading ? (
          <View className="p-4">
            <SkeletonList count={3} />
          </View>
        ) : error ? (
          <View className="flex items-center justify-center p-4">
            <Text className="text-muted-foreground mb-2 text-center text-sm">
              {error.userMessage ?? error.message ?? "Failed to load suggestions"}
            </Text>
            {onRetry && (
              <Button variant="outline" size="sm" onPress={onRetry}>
                <Text className="text-sm">Retry</Text>
              </Button>
            )}
          </View>
        ) : (
          <SuggestionsList
            suggestions={suggestions}
            horizontal={true}
            style={{ height: SUGGESTION_ITEM_HEIGHT }}
          />
        )}
      </View>
    </>
  );
});

SmartSuggestionsSection.displayName = "SmartSuggestionsSection";

