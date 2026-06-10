import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, KV } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface HifdhTaak {
  id: string;
  type: string;
  surahNr: number;
  vanAyah: number;
  totAyah: number;
  weekStart: string;
  voltooid: boolean;
  voltooidOp: string | null;
}

interface HifdhProfiel {
  id: string;
  startSurahNr: number;
  startAyahNr: number;
  huidigeSurahNr: number;
  huidigeAyahNr: number;
  ayaatPerWeek: number;
  opmerkingen: string | null;
  taken: HifdhTaak[];
}

export default function LeerlingHifdh() {
  const { data, error, loading, refreshing, refresh, reload } =
    useFetch<HifdhProfiel | null>("/api/leerling/hifdh");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  if (!data) {
    return (
      <Screen refreshing={refreshing} onRefresh={refresh}>
        <Empty icon="moon-outline" text="Je docent heeft nog geen hifdh-traject voor je ingesteld." />
      </Screen>
    );
  }

  const open = data.taken.filter((t) => !t.voltooid);
  const klaar = data.taken.filter((t) => t.voltooid);

  function renderTaak(t: HifdhTaak) {
    return (
      <Card key={t.id}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Surah {t.surahNr} · ayah {t.vanAyah}–{t.totAyah}
            </Text>
            <Muted>
              Week van {fmtDatum(t.weekStart)} · {t.type === "NIEUW" ? "Nieuw" : "Herhaling"}
            </Muted>
          </View>
          {t.voltooid ? (
            <Badge text="✓ Voltooid" />
          ) : (
            <Badge text="Open" bg={colors.warningLight} fg={colors.warning} />
          )}
        </View>
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card>
        <KV k="Huidige positie" v={`Surah ${data.huidigeSurahNr}, ayah ${data.huidigeAyahNr}`} />
        <KV k="Tempo" v={`${data.ayaatPerWeek} ayaat per week`} />
        <KV k="Voltooide taken" v={`${klaar.length} van ${data.taken.length}`} />
      </Card>
      {data.opmerkingen ? (
        <Card>
          <Muted>Opmerkingen van je docent:</Muted>
          <Text style={styles.opmerking}>{data.opmerkingen}</Text>
        </Card>
      ) : null}

      {open.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Open taken</Text>
          {open.map(renderTaak)}
        </>
      )}
      {klaar.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Voltooid</Text>
          {klaar.map(renderTaak)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  opmerking: { fontSize: 14, color: colors.text, marginTop: 4 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
});
