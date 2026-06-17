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

  // Uitsplitsing per klas
  const perKlas = new Map<string, { naam: string; aanwezig: number; totaal: number }>();
  for (const r of records) {
    const naam = r.les.klas.naam;
    const e = perKlas.get(naam) ?? { naam, aanwezig: 0, totaal: 0 };
    e.totaal += 1;
    if (r.status === "AANWEZIG") e.aanwezig += 1;
    perKlas.set(naam, e);
  }
  const klasPcts = Array.from(perKlas.values()).map((k) => ({
    naam: k.naam,
    pct: Math.round((k.aanwezig / k.totaal) * 100),
    totaal: k.totaal,
  }));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {pct !== null && (
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{pct}%</Text>
          <Muted>aanwezig over {records.length} lessen</Muted>
        </Card>
      )}

      {klasPcts.length > 1 && (
        <Card>
          <Text style={styles.cardSub}>Per klas</Text>
          {klasPcts.map((k) => (
            <View key={k.naam} style={styles.klasRow}>
              <Text style={styles.klasNaam}>{k.naam}</Text>
              <Badge
                text={`${k.pct}%`}
                bg={k.pct >= 80 ? colors.successLight : colors.warningLight}
                fg={k.pct >= 80 ? colors.primaryDark : colors.warning}
              />
            </View>
          ))}
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
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  klasRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  klasNaam: { fontSize: 14, color: colors.text, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
});
