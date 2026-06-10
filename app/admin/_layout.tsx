import { Stack } from "expo-router";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function AdminLayout() {
  return (
    <RoleGuard role="ADMIN">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Beheer", headerRight: () => <LogoutButton /> }} />
        <Stack.Screen name="gebruikers" options={{ title: "Gebruikers" }} />
        <Stack.Screen name="klassen" options={{ title: "Klassen" }} />
        <Stack.Screen name="vakken" options={{ title: "Vakken" }} />
        <Stack.Screen name="rooster" options={{ title: "Rooster" }} />
        <Stack.Screen name="berichten" options={{ title: "Berichten" }} />
      </Stack>
    </RoleGuard>
  );
}
