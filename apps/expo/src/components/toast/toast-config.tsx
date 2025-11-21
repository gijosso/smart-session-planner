/**
 * Toast configuration component
 * Customizes the appearance of toast messages to match app design
 */

import { Dimensions, StyleSheet, Text, View } from "react-native";

import { COLORS_DESTRUCTIVE } from "~/constants/colors";

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
    <View style={styles.successContainer}>
      {text1 && <Text style={styles.successTitle}>{text1}</Text>}
      {text2 && <Text style={styles.successMessage}>{text2}</Text>}
    </View>
  ),

  /**
   * Error toast style
   */
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={styles.errorContainer}>
      {text1 && <Text style={styles.errorTitle}>{text1}</Text>}
      {text2 && <Text style={styles.errorMessage}>{text2}</Text>}
    </View>
  ),

  /**
   * Info toast style
   */
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={styles.infoContainer}>
      {text1 && <Text style={styles.infoTitle}>{text1}</Text>}
      {text2 && <Text style={styles.infoMessage}>{text2}</Text>}
    </View>
  ),
};

const styles = StyleSheet.create({
  successContainer: {
    backgroundColor: "#3B82F6", // primary color
    borderRadius: 8,
    padding: 16,
    width: TOAST_WIDTH,
    maxWidth: TOAST_WIDTH,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  successTitle: {
    color: "#FFFFFF", // primary-foreground
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  successMessage: {
    color: "#FFFFFF", // primary-foreground
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: COLORS_DESTRUCTIVE,
    borderRadius: 8,
    padding: 16,
    width: TOAST_WIDTH,
    maxWidth: TOAST_WIDTH,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  errorTitle: {
    color: "#FFFFFF", // destructive-foreground
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorMessage: {
    color: "#FFFFFF", // destructive-foreground
    fontSize: 14,
  },
  infoContainer: {
    backgroundColor: "#F3F4F6", // muted color
    borderRadius: 8,
    padding: 16,
    width: TOAST_WIDTH,
    maxWidth: TOAST_WIDTH,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoTitle: {
    color: "#111827", // foreground
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoMessage: {
    color: "#6B7280", // muted-foreground
    fontSize: 14,
  },
});

