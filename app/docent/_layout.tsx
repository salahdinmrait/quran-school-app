import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { colors } from "../../lib/theme";

export default function DocentLayout() {
  return (
    <RoleGuard role="DOCENT">
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
        <Tabs.Screen name="meer" options={{ title: "Meer", tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} /> }} />
        {/* Secundaire schermen — bereikbaar via "Meer", niet als eigen tab */}
        <Tabs.Screen name="klassen" options={{ href: null, title: "Mijn klassen" }} />
        <Tabs.Screen name="studiemateriaal" options={{ href: null, title: "Studiemateriaal" }} />
        <Tabs.Screen name="statistieken" options={{ href: null, title: "Statistieken" }} />
        <Tabs.Screen name="huiswerk-nieuw" options={{ href: null, title: "Nieuw huiswerk" }} />
        <Tabs.Screen name="leerling-dossier" options={{ href: null, title: "Leerlingendossier" }} />
      </Tabs>
    </RoleGuard>
  );
}
