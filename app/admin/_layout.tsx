import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { LanguageButton } from "../../components/LanguageButton";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/LanguageContext";

export default function AdminLayout() {
  const { t } = useT();
  return (
    <RoleGuard role="ADMIN">
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <LanguageButton />
              <LogoutButton />
            </View>
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="gebruikers" options={{ title: t("nav_accounts"), tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="klassen" options={{ title: t("nav_klassen"), tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="vakken" options={{ title: t("nav_vakken"), tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="rooster" options={{ title: t("nav_rooster"), tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="berichten" options={{ title: t("nav_berichten"), tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="statistieken" options={{ title: t("nav_stats"), tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="leerling-dossier" options={{ href: null, title: t("nav_leerlingendossier") }} />
        <Tabs.Screen name="archief" options={{ href: null, title: t("nav_archief") }} />
      </Tabs>
    </RoleGuard>
  );
}
