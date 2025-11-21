/**
 * Toast configuration component
 * Customizes the appearance of toast messages to match app design
 */

import { Dimensions, Text, View } from "react-native";

import { Card, CardContent } from "..";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = SCREEN_WIDTH * 0.916; // ~91.67% of screen width (w-11/12)

/**
 * Custom toast configuration
 * Matches app's design system with proper colors and styling
 * Uses StyleSheet for reliable styling (NativeWind classes may not work in custom components)
 */
export const toastConfig = {
  /**
   * Success toast style
   */
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={{ width: TOAST_WIDTH }}>
      <Card className="bg-primary m-4 w-full shadow-lg">
        <CardContent>
          <Text className="text-primary-foreground text-xl font-semibold">
            {text1}
          </Text>

          <Text className="text-primary-foreground text-md">{text2}</Text>
        </CardContent>
      </Card>
    </View>
  ),

  /**
   * Error toast style
   */
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={{ width: TOAST_WIDTH }}>
      <Card className="bg-destructive m-4 w-full shadow-lg">
        <CardContent>
          <Text className="text-destructive-foreground text-xl font-semibold">
            {text1}
          </Text>

          <Text className="text-destructive-foreground text-md">{text2}</Text>
        </CardContent>
      </Card>
    </View>
  ),

  /**
   * Info toast style
   */
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={{ width: TOAST_WIDTH }}>
      <Card className="bg-secondary m-4 w-full shadow-lg">
        <CardContent>
          <Text className="text-foreground text-xl font-semibold">{text1}</Text>

          <Text className="text-secondary-foreground text-md">{text2}</Text>
        </CardContent>
      </Card>
    </View>
  ),
};
