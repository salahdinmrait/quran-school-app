import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { LogoutButton } from "../../components/LogoutButton";
import { LanguageButton } from "../../components/LanguageButton";
import { useT } from "../../lib/LanguageContext";
import { colors } from "../../lib/theme";

export default function LeerlingLayout() {
  const { t } = useT();
  return (
    <RoleGuard role="LEERLING">
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
        <Tabs.Screen name="rooster" options={{ title: t("nav_rooster"), tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="huiswerk" options={{ title: t("nav_huiswerk"), tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="cijfers" options={{ title: t("nav_cijfers"), tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="absentie" options={{ title: t("c_aanwezig"), tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="berichten" options={{ title: t("nav_berichten"), tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="studiemateriaal" options={{ title: t("nav_materiaal"), tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} /> }} />
      </Tabs>
    </RoleGuard>
  );
}
