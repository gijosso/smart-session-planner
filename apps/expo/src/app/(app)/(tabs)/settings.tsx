import { useCallback } from "react";
import { Text } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, Card, Content, Screen } from "~/components";
import { COLORS_MUTED } from "~/constants/colors";
import { createMutationErrorHandler } from "~/hooks/use-mutation-with-error-handling";
import { useToast } from "~/hooks/use-toast";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function Settings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await authClient.removeAccessToken();
      await queryClient.invalidateQueries(trpc.auth.getSession.queryFilter());
    },
    onSuccess: () => {
      toast.success("Signed out successfully");
    },
    onError: createMutationErrorHandler({
      errorMessage: "Failed to sign out. Please try again.",
    }),
  });

  const handleSignOut = useCallback(() => {
    signOutMutation.mutate();
  }, [signOutMutation]);

  // Test toast button (development only)
  const handleTestToast = useCallback(() => {
    toast.success("Success toast test!", "Test");
    setTimeout(() => {
      toast.error("Error toast test!", "Test");
    }, 1000);
    setTimeout(() => {
      toast.info("Info toast test!", "Test");
    }, 2000);
  }, [toast]);

  return (
    <Screen>
      <Content>
        <Text className="text-foreground text-3xl font-semibold">Settings</Text>
      </Content>

      <Content>
        <Link href="/settings/availability" asChild>
          <Button
            variant="ghost"
            accessibilityLabel="Navigate to availability settings"
            accessibilityRole="button"
          >
            <Card className="flex flex-1 flex-row items-center justify-between">
              <Text
                className="text-foreground font-semibold"
                accessibilityRole="text"
              >
                Availability
              </Text>
              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS_MUTED}
                accessibilityLabel="Navigate to availability settings"
              />
            </Card>
          </Button>
        </Link>
      </Content>

      <Content>
        <Button
          variant="destructive"
          onPress={handleSignOut}
          disabled={signOutMutation.isPending}
          accessibilityLabel="Sign out of your account"
          accessibilityRole="button"
        >
          {signOutMutation.isPending ? "Signing Out..." : "Sign Out"}
        </Button>
        {process.env.NODE_ENV === "development" && (
          <Button
            variant="outline"
            onPress={handleTestToast}
            accessibilityLabel="Test toast notifications"
            accessibilityRole="button"
          >
            Test Toast
          </Button>
        )}
      </Content>
    </Screen>
  );
}
