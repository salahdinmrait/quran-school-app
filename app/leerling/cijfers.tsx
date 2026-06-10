import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors, CATEGORIE_LABELS } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  datum: string;
  vak: { id: string; naam: string; categorie: string };
}

export default function LeerlingCijfers() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Cijfer[]>("/api/leerling/cijfers");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const cijfers = data ?? [];
  const gemiddelde =
    cijfers.length > 0
      ? cijfers.reduce((s, c) => s + c.waarde, 0) / cijfers.length
      : null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {gemiddelde !== null && (
        <Card style={styles.avgCard}>
          <Text style={styles.avgLabel}>Gemiddelde</Text>
          <Text style={styles.avgValue}>{gemiddelde.toFixed(1)}</Text>
        </Card>
      )}

      {cijfers.length === 0 ? (
        <Empty text="Nog geen cijfers." />
      ) : (
        cijfers.map((c) => (
          <Card key={c.id}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{c.vak.naam}</Text>
                <Muted>
                  {CATEGORIE_LABELS[c.vak.categorie] ?? c.vak.categorie} · {fmtDatum(c.datum)}
                </Muted>
                {c.omschrijving ? <Muted style={{ marginTop: 2 }}>{c.omschrijving}</Muted> : null}
              </View>
              <Badge
                text={c.waarde.toFixed(1)}
                bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avgCard: { alignItems: "center", backgroundColor: colors.primaryLight, borderColor: colors.primary },
  avgLabel: { fontSize: 13, color: colors.primaryDark, fontWeight: "600" },
  avgValue: { fontSize: 32, fontWeight: "800", color: colors.primaryDark },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
});
