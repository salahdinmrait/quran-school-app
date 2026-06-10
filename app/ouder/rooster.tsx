import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { colors, STATUS_LABELS, STATUS_COLORS } from "../../lib/theme";
import { fmtDatumKort } from "../../lib/format";

interface KindLessen {
  kind: { id: string; name: string };
  lessen: {
    id: string;
    datum: string;
    begintijd: string;
    eindtijd: string;
    lokaal: string | null;
    klas: { naam: string };
    vak: { naam: string } | null;
    aanwezigheid: { status: string }[];
  }[];
}

export default function OuderRooster() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindLessen[]>("/api/ouder/lessen");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const result = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {result.length === 0 ? (
        <Empty text="Geen kinderen gekoppeld." />
      ) : (
        result.map(({ kind, lessen }) => (
          <View key={kind.id}>
            <SectionTitle>{kind.name}</SectionTitle>
            {lessen.length === 0 ? (
              <Empty text="Geen lessen." />
            ) : (
              lessen.map((l) => {
                const status = l.aanwezigheid[0]?.status;
                const c = status ? STATUS_COLORS[status] : null;
                return (
                  <Card key={l.id}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>
                          {l.klas.naam}
                          {l.vak ? ` · ${l.vak.naam}` : ""}
                        </Text>
                        <Muted>
                          {fmtDatumKort(l.datum)} · {l.begintijd}–{l.eindtijd}
                          {l.lokaal ? ` · ${l.lokaal}` : ""}
                        </Muted>
                      </View>
                      {status && c && (
                        <Badge text={STATUS_LABELS[status] ?? status} bg={c.bg} fg={c.fg} />
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
});
