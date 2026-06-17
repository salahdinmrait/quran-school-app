import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { Screen, MenuTile, Muted } from "../../components/ui";
import { colors } from "../../lib/theme";

export default function DocentMeer() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen>
      <Text style={styles.greeting}>Assalamu alaykum,</Text>
      <Text style={styles.name}>{user?.name}</Text>
      {user?.schoolNaam ? <Muted style={{ marginBottom: 16 }}>{user.schoolNaam}</Muted> : <View style={{ height: 16 }} />}

      <View style={styles.tiles}>
        <MenuTile icon="people-outline" title="Mijn klassen" subtitle="Leerlingen & ouders" onPress={() => router.push("/docent/klassen")} />
        <MenuTile icon="folder-outline" title="Studiemateriaal" subtitle="Bestanden & links delen" onPress={() => router.push("/docent/studiemateriaal")} />
        <MenuTile icon="stats-chart-outline" title="Statistieken" subtitle="Eigen klassen & vakken" onPress={() => router.push("/docent/statistieken")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
