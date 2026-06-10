import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { Screen, MenuTile, Muted } from "../../components/ui";
import { colors } from "../../lib/theme";

export default function AdminHome() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Screen>
      <Text style={styles.greeting}>Assalamu alaykum,</Text>
      <Text style={styles.name}>{user?.name}</Text>
      {user?.schoolNaam ? <Muted style={{ marginBottom: 16 }}>{user.schoolNaam}</Muted> : <View style={{ height: 16 }} />}

      <View style={styles.tiles}>
        <MenuTile icon="people-outline" title="Gebruikers" subtitle="Accounts aanmaken & beheren" onPress={() => router.push("/admin/gebruikers")} />
        <MenuTile icon="grid-outline" title="Klassen" subtitle="Klassen & koppelingen" onPress={() => router.push("/admin/klassen")} />
        <MenuTile icon="library-outline" title="Vakken" subtitle="Vakkenbeheer" onPress={() => router.push("/admin/vakken")} />
        <MenuTile icon="calendar-outline" title="Rooster" subtitle="Lessen plannen" onPress={() => router.push("/admin/rooster")} />
        <MenuTile icon="mail-outline" title="Berichten" subtitle="Naar klassen & ouders" onPress={() => router.push("/admin/berichten")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
