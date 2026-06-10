import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum, isVerlopen } from "../../lib/format";

interface KindHuiswerk {
  kind: { id: string; name: string };
  huiswerk: {
    id: string;
    titel: string;
    beschrijving: string | null;
    deadline: string | null;
    vak: { naam: string; categorie: string };
    ingeLeverd: boolean;
    inlevering: { inhoud: string; createdAt: string; opmerking: string | null } | null;
  }[];
}

export default function OuderHuiswerk() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindHuiswerk[]>("/api/ouder/huiswerk");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const result = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {result.length === 0 ? (
        <Empty text="Geen kinderen gekoppeld." />
      ) : (
        result.map(({ kind, huiswerk }) => (
          <View key={kind.id}>
            <SectionTitle>{kind.name}</SectionTitle>
            {huiswerk.length === 0 ? (
              <Empty text="Geen huiswerk." />
            ) : (
              huiswerk.map((hw) => (
                <Card key={hw.id}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{hw.titel}</Text>
                      <Muted>
                        {hw.vak.naam} · deadline {fmtDatum(hw.deadline)}
                      </Muted>
                    </View>
                    {hw.ingeLeverd ? (
                      <Badge text="Afgerond ✓" />
                    ) : isVerlopen(hw.deadline) ? (
                      <Badge text="Verlopen" bg={colors.dangerLight} fg={colors.danger} />
                    ) : (
                      <Badge text="Open" bg={colors.warningLight} fg={colors.warning} />
                    )}
                  </View>
                  {hw.inlevering?.opmerking ? (
                    <View style={styles.opmerkingBox}>
                      <Text style={styles.opmerkingLabel}>Opmerking van docent:</Text>
                      <Text style={styles.opmerkingText}>{hw.inlevering.opmerking}</Text>
                    </View>
                  ) : null}
                </Card>
              ))
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
  opmerkingBox: {
    backgroundColor: colors.infoLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
});
