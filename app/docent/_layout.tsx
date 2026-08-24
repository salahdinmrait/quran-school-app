import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { RoleGuard } from "../../components/RoleGuard";
import { View } from "react-native";
import { LogoutButton } from "../../components/LogoutButton";
import { LanguageButton } from "../../components/LanguageButton";
import { useT } from "../../lib/LanguageContext";
import { colors } from "../../lib/theme";

export default function DocentLayout() {
  const { t } = useT();
  return (
    <RoleGuard role="DOCENT">
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
        <Tabs.Screen name="berichten" options={{ title: t("nav_berichten"), tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} /> }} />
        <Tabs.Screen name="meer" options={{ title: t("nav_meer"), tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} /> }} />
        {/* Secundaire schermen — bereikbaar via "Meer", niet als eigen tab */}
        <Tabs.Screen name="klassen" options={{ href: null, title: t("nav_mijn_klassen") }} />
        <Tabs.Screen name="studiemateriaal" options={{ href: null, title: t("nav_studiemateriaal") }} />
        <Tabs.Screen name="statistieken" options={{ href: null, title: t("nav_statistieken") }} />
        <Tabs.Screen name="huiswerk-nieuw" options={{ href: null, title: t("nav_nieuw_huiswerk") }} />
        <Tabs.Screen name="leerling-dossier" options={{ href: null, title: t("nav_leerlingendossier") }} />
      </Tabs>
    </RoleGuard>
  );
}
