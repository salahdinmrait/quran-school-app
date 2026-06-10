import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle, KV } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface Kind {
  id: string;
  name: string;
  hifdhProfiel: {
    huidigeSurahNr: number;
    huidigeAyahNr: number;
    ayaatPerWeek: number;
    opmerkingen: string | null;
    taken: {
      id: string;
      type: string;
      surahNr: number;
      vanAyah: number;
      totAyah: number;
      weekStart: string;
      voltooid: boolean;
    }[];
  } | null;
}

export default function OuderHifdh() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Kind[]>("/api/ouder/kind");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const kinderen = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {kinderen.length === 0 ? (
        <Empty text="Geen kinderen gekoppeld." />
      ) : (
        kinderen.map((kind) => (
          <View key={kind.id}>
            <SectionTitle>{kind.name}</SectionTitle>
            {!kind.hifdhProfiel ? (
              <Empty icon="moon-outline" text="Nog geen hifdh-traject ingesteld." />
            ) : (
              <>
                <Card>
                  <KV
                    k="Huidige positie"
                    v={`Surah ${kind.hifdhProfiel.huidigeSurahNr}, ayah ${kind.hifdhProfiel.huidigeAyahNr}`}
                  />
                  <KV k="Tempo" v={`${kind.hifdhProfiel.ayaatPerWeek} ayaat per week`} />
                  <KV
                    k="Voortgang"
                    v={`${kind.hifdhProfiel.taken.filter((t) => t.voltooid).length} van ${kind.hifdhProfiel.taken.length} taken`}
                  />
                </Card>
                {kind.hifdhProfiel.taken.map((t) => (
                  <Card key={t.id}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>
                          Surah {t.surahNr} · ayah {t.vanAyah}–{t.totAyah}
                        </Text>
                        <Muted>
                          Week {fmtDatum(t.weekStart)} · {t.type === "NIEUW" ? "Nieuw" : "Herhaling"}
                        </Muted>
                      </View>
                      {t.voltooid ? (
                        <Badge text="✓" />
                      ) : (
                        <Badge text="open" bg={colors.warningLight} fg={colors.warning} />
                      )}
                    </View>
                  </Card>
                ))}
              </>
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
