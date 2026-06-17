import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function LeerlingLayout() {
  return (
    <RoleGuard role="LEERLING">
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
        <Tabs.Screen name="rooster" options={{ title: "Rooster", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="huiswerk" options={{ title: "Huiswerk", tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="cijfers" options={{ title: "Cijfers", tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="absentie" options={{ title: "Aanwezig", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="berichten" options={{ title: "Berichten", tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="studiemateriaal" options={{ title: "Materiaal", tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} /> }} />
      </Tabs>
    </RoleGuard>
  );
}
