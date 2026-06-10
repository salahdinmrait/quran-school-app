import { Stack } from "expo-router";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function DocentLayout() {
  return (
    <RoleGuard role="DOCENT">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home", headerRight: () => <LogoutButton /> }} />
        <Stack.Screen name="klassen" options={{ title: "Mijn klassen" }} />
        <Stack.Screen name="huiswerk" options={{ title: "Huiswerk" }} />
        <Stack.Screen name="huiswerk-nieuw" options={{ title: "Nieuw huiswerk" }} />
        <Stack.Screen name="cijfers" options={{ title: "Cijfers" }} />
        <Stack.Screen name="absentie" options={{ title: "Absentie" }} />
        <Stack.Screen name="rooster" options={{ title: "Rooster" }} />
        <Stack.Screen name="berichten" options={{ title: "Berichten" }} />
        <Stack.Screen name="hifdh" options={{ title: "Hifdh-trajecten" }} />
      </Stack>
    </RoleGuard>
  );
}
