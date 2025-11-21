import React, { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/utils/cn";
import { BackButtonTitle } from "./back-button-title";

/**
 * Screen component
 * Wraps the content of the screen and provides a consistent layout
 * Until LegendList implements sticky headers, we need to use this component to provide a consistent layout.
 * Deprecate variant "list" once LegendList implements sticky headers.
 */

export const Screen = React.memo<{
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  title?: string;
  backButton?: boolean;
  variant?: "default" | "list";
}>(
  ({
    children,
    className,
    contentClassName,
    title,
    backButton = false,
    variant = "default",
  }) => {
    const { top, bottom } = useSafeAreaInsets();

    const contentContainerStyle = useMemo(
      () => ({
        paddingTop: top,
        paddingBottom: variant === "list" ? 0 : bottom,
        flexGrow: 1,
      }),
      [top, bottom, variant],
    );

    if (variant === "list") {
      return (
        <View className={cn("bg-background flex-1", className)}>
          <View style={contentContainerStyle}>
            {(backButton || title) && (
              <View className="p-4">
                {title ? (
                  <BackButtonTitle title={title} />
                ) : backButton ? (
                  <BackButtonTitle title="" />
                ) : null}
              </View>
            )}
            <View className="flex-1">{children}</View>
          </View>
        </View>
      );
    }

    return (
      <View className={cn("bg-background flex-1", className)}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentContainerStyle}
        >
          <View className={cn("mt-8 flex-1 gap-8", contentClassName)}>
            {children}
          </View>
        </ScrollView>
      </View>
    );
  },
);
