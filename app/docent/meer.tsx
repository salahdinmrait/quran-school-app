import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/LanguageContext";
import { textStart } from "../../lib/rtl";
import { Screen, MenuTile, Muted } from "../../components/ui";
import { colors } from "../../lib/theme";

export default function DocentMeer() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, isRTL } = useT();

  return (
    <Screen>
      <Text style={[styles.greeting, { textAlign: textStart(isRTL) }]}>{t("c_groet")}</Text>
      <Text style={[styles.name, { textAlign: textStart(isRTL) }]}>{user?.name}</Text>
      {user?.schoolNaam ? <Muted style={{ marginBottom: 16 }}>{user.schoolNaam}</Muted> : <View style={{ height: 16 }} />}

      <View style={styles.tiles}>
        <MenuTile icon="people-outline" title={t("nav_mijn_klassen")} subtitle={t("dm_klassen_sub")} onPress={() => router.push("/docent/klassen")} />
        <MenuTile icon="folder-outline" title={t("nav_studiemateriaal")} subtitle={t("dm_materiaal_sub")} onPress={() => router.push("/docent/studiemateriaal")} />
        <MenuTile icon="stats-chart-outline" title={t("nav_statistieken")} subtitle={t("dm_stats_sub")} onPress={() => router.push("/docent/statistieken")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
