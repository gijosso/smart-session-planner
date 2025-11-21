import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "~/components";

export const SessionAddButton: React.FC = () => {
  return (
    <Link href="/session/create" asChild>
      <Button variant="ghost" size="icon">
        <Ionicons name="add-outline" size={20} color="#FFFFFF" />
      </Button>
    </Link>
  );
};
