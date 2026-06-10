import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { Screen, MenuTile, Muted } from "../../components/ui";
import { colors } from "../../lib/theme";

export default function DocentHome() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen>
      <Text style={styles.greeting}>Assalamu alaykum,</Text>
      <Text style={styles.name}>{user?.name}</Text>
      {user?.schoolNaam ? <Muted style={{ marginBottom: 16 }}>{user.schoolNaam}</Muted> : <View style={{ height: 16 }} />}

      <View style={styles.tiles}>
        <MenuTile icon="people-outline" title="Mijn klassen" subtitle="Leerlingen & ouders" onPress={() => router.push("/docent/klassen")} />
        <MenuTile icon="book-outline" title="Huiswerk" subtitle="Opgeven & aftekenen" onPress={() => router.push("/docent/huiswerk")} />
        <MenuTile icon="school-outline" title="Cijfers" subtitle="Invoeren & bekijken" onPress={() => router.push("/docent/cijfers")} />
        <MenuTile icon="checkmark-done-outline" title="Absentie" subtitle="Aanwezigheid registreren" onPress={() => router.push("/docent/absentie")} />
        <MenuTile icon="calendar-outline" title="Rooster" subtitle="Lessen plannen" onPress={() => router.push("/docent/rooster")} />
        <MenuTile icon="mail-outline" title="Berichten" subtitle="Naar leerlingen & ouders" onPress={() => router.push("/docent/berichten")} />
        <MenuTile icon="moon-outline" title="Hifdh" subtitle="Memorisatie-trajecten" onPress={() => router.push("/docent/hifdh")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
