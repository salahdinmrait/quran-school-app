import { Stack } from "expo-router";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function OuderLayout() {
  return (
    <RoleGuard role="OUDER">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Mijn kinderen", headerRight: () => <LogoutButton /> }} />
        <Stack.Screen name="huiswerk" options={{ title: "Huiswerk" }} />
        <Stack.Screen name="rooster" options={{ title: "Rooster" }} />
        <Stack.Screen name="berichten" options={{ title: "Berichten" }} />
        <Stack.Screen name="hifdh" options={{ title: "Hifdh" }} />
      </Stack>
    </RoleGuard>
  );
}
