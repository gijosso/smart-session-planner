import { useCallback } from "react";
import { Alert } from "react-native";

import { Button, CardFooter } from "~/components";
import { router } from "expo-router";

interface SessionActionsProps {
  sessionId: string;
  sessionTitle?: string | null;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function SessionActions({
  sessionId,
  sessionTitle,
  onDelete,
  isDeleting,
}: SessionActionsProps) {
  const handleEdit = useCallback(() => {
    router.push(`/session/${sessionId}/edit`);
  }, [sessionId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${sessionTitle ?? "this session"}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(sessionId);
          },
        },
      ],
    );
  }, [sessionId, sessionTitle, onDelete]);

  return (
    <CardFooter className="flex flex-row gap-4">
      <Button className="flex-1" variant="outline" onPress={handleEdit}>
        Edit
      </Button>
      <Button
        variant="destructive"
        onPress={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </CardFooter>
  );
}

