import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, MenuTile, Muted, SectionTitle, Badge } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface Dashboard {
  name: string;
  recenteCijfers: { id: string; waarde: number; datum: string; vak: { naam: string } }[];
  openHuiswerk: { id: string; titel: string; deadline: string | null; vak: { naam: string } }[];
  klassen: { klas: { id: string; naam: string } }[];
  aanwezigPct: number | null;
  totaalLessen: number;
  ongelezen: number;
}

export default function LeerlingHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Dashboard>("/api/leerling/dashboard");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text style={styles.greeting}>Assalamu alaykum,</Text>
      <Text style={styles.name}>{user?.name}</Text>
      {user?.schoolNaam ? <Muted style={{ marginBottom: 16 }}>{user.schoolNaam}</Muted> : <View style={{ height: 16 }} />}

      <View style={styles.tiles}>
        <MenuTile icon="book-outline" title="Huiswerk" subtitle={`${data?.openHuiswerk.length ?? 0} open`} onPress={() => router.push("/leerling/huiswerk")} />
        <MenuTile icon="school-outline" title="Cijfers" subtitle="Bekijk je resultaten" onPress={() => router.push("/leerling/cijfers")} />
        <MenuTile icon="calendar-outline" title="Rooster" subtitle="Lessen" onPress={() => router.push("/leerling/rooster")} />
        <MenuTile icon="checkmark-done-outline" title="Aanwezigheid" subtitle={data?.aanwezigPct != null ? `${data.aanwezigPct}% aanwezig` : "—"} onPress={() => router.push("/leerling/absentie")} />
        <MenuTile icon="mail-outline" title="Berichten" subtitle={data?.ongelezen ? `${data.ongelezen} ongelezen` : "Inbox"} badge={data?.ongelezen} onPress={() => router.push("/leerling/berichten")} />
        <MenuTile icon="moon-outline" title="Hifdh" subtitle="Memorisatie" onPress={() => router.push("/leerling/hifdh")} />
      </View>

      {data && data.openHuiswerk.length > 0 && (
        <>
          <SectionTitle>Open huiswerk</SectionTitle>
          {data.openHuiswerk.map((hw) => (
            <Card key={hw.id} onPress={() => router.push("/leerling/huiswerk")}>
              <Text style={styles.cardTitle}>{hw.titel}</Text>
              <Muted>{hw.vak.naam} · deadline {fmtDatum(hw.deadline)}</Muted>
            </Card>
          ))}
        </>
      )}

      {data && data.recenteCijfers.length > 0 && (
        <>
          <SectionTitle>Recente cijfers</SectionTitle>
          {data.recenteCijfers.map((c) => (
            <Card key={c.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{c.vak.naam}</Text>
                  <Muted>{fmtDatum(c.datum)}</Muted>
                </View>
                <Badge
                  text={c.waarde.toFixed(1)}
                  bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                  fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
                />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 15, color: colors.textMuted },
  name: { fontSize: 24, fontWeight: "700", color: colors.text },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
