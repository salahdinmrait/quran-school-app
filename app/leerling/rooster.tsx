import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  klas: { naam: string };
  huiswerk: {
    id: string;
    titel: string;
    inleveringen: { id: string }[];
  }[];
}

export default function LeerlingRooster() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Les[]>("/api/leerling/lessen");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lessen = data ?? [];
  const komend = lessen.filter((l) => new Date(l.datum) >= now);
  const geweest = lessen.filter((l) => new Date(l.datum) < now).reverse().slice(0, 10);

  function renderLes(les: Les) {
    return (
      <Card key={les.id}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{les.klas.naam}</Text>
            <Muted>
              {fmtDatumKort(les.datum)} · {les.begintijd}–{les.eindtijd}
              {les.lokaal ? ` · ${les.lokaal}` : ""}
            </Muted>
          </View>
        </View>
        {les.huiswerk.length > 0 && (
          <View style={styles.hwBox}>
            {les.huiswerk.map((hw) => (
              <View key={hw.id} style={styles.hwRow}>
                <Text style={styles.hwTitel} numberOfLines={1}>
                  {hw.titel}
                </Text>
                {hw.inleveringen.length > 0 ? (
                  <Badge text="✓" />
                ) : (
                  <Badge text="open" bg={colors.warningLight} fg={colors.warning} />
                )}
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {lessen.length === 0 ? (
        <Empty text="Nog geen lessen ingepland." />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Komende lessen ({komend.length})</Text>
          {komend.length === 0 ? <Empty text="Geen komende lessen." /> : komend.map(renderLes)}
          {geweest.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Afgelopen lessen</Text>
              {geweest.map(renderLes)}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 8,
  },
  hwBox: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 },
  hwRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hwTitel: { fontSize: 13, color: colors.textMuted, flex: 1 },
});
