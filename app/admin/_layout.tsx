import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function AdminLayout() {
  return (
    <RoleGuard role="ADMIN">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerRight: () => <LogoutButton />,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="gebruikers" options={{ title: "Accounts", tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="klassen" options={{ title: "Klassen", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="vakken" options={{ title: "Vakken", tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="rooster" options={{ title: "Rooster", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="berichten" options={{ title: "Berichten", tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="statistieken" options={{ title: "Stats", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="leerling-dossier" options={{ href: null, title: "Leerlingendossier" }} />
      </Tabs>
    </RoleGuard>
  );
}
