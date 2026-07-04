import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/auth";
import { bevestig } from "../lib/confirm";
import { colors } from "../lib/theme";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  function confirm() {
    bevestig("Uitloggen", "Weet je zeker dat je wilt uitloggen?", async () => {
      await logout();
      router.replace("/login");
    }, "Uitloggen");
  }

  return (
    <Pressable onPress={confirm} hitSlop={8} style={{ paddingHorizontal: 4 }}>
      <Ionicons name="log-out-outline" size={22} color={colors.danger} />
    </Pressable>
  );
}
