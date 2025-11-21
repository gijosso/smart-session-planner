import { useCallback } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { SuggestionWithId } from "~/types";
import { Button, Content } from "~/components";
import { SkeletonList } from "~/components/layout/skeleton-loader";
import { FLEX_1_STYLE, SUGGESTION_ITEM_HEIGHT } from "~/constants/app";
import { COLORS_MUTED } from "~/constants/colors";
import { SuggestionsList } from "./suggestions-list";

type SmartSuggestionsSectionProps = {
  suggestions: SuggestionWithId[];
  isLoading?: boolean;
};

/**
 * Smart Suggestions Section
 * Displays the header and list of suggestions for the home screen
 * Automatically hides when there are no suggestions and not loading
 */
export function SmartSuggestionsSection({
  suggestions,
  isLoading = false,
}: SmartSuggestionsSectionProps) {
  const handleNavigateToSuggestions = useCallback(() => {
    router.push("/suggestions");
  }, []);

  // Hide section if not loading and no suggestions
  if (!isLoading && suggestions.length === 0) {
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
}

