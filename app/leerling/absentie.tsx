import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors, STATUS_LABELS, STATUS_COLORS } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";

interface Aanwezigheid {
  id: string;
  status: string;
  les: {
    id: string;
    datum: string;
    begintijd: string;
    eindtijd: string;
    klas: { naam: string };
    vak: { naam: string } | null;
  };
}

export default function LeerlingAbsentie() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Aanwezigheid[]>("/api/leerling/absentie");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const records = data ?? [];
  const aanwezig = records.filter((r) => r.status === "AANWEZIG").length;
  const pct = records.length > 0 ? Math.round((aanwezig / records.length) * 100) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {pct !== null && (
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{pct}%</Text>
          <Muted>aanwezig over {records.length} lessen</Muted>
        </Card>
      )}

      {records.length === 0 ? (
        <Empty text="Nog geen aanwezigheid geregistreerd." />
      ) : (
        records.map((r) => {
          const c = STATUS_COLORS[r.status] ?? STATUS_COLORS.AANWEZIG;
          return (
            <Card key={r.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {r.les.klas.naam}
                    {r.les.vak ? ` · ${r.les.vak.naam}` : ""}
                  </Text>
                  <Muted>
                    {fmtDatumKort(r.les.datum)} · {r.les.begintijd}–{r.les.eindtijd}
                  </Muted>
                </View>
                <Badge text={STATUS_LABELS[r.status] ?? r.status} bg={c.bg} fg={c.fg} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statCard: { alignItems: "center", backgroundColor: colors.primaryLight, borderColor: colors.primary },
  statValue: { fontSize: 32, fontWeight: "800", color: colors.primaryDark },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
});
