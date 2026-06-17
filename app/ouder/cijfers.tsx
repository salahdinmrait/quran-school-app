import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors, STATUS_LABELS, STATUS_COLORS } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  opmerking?: string | null;
  hasBijlage?: boolean;
  datum: string;
  vak: { id: string; naam: string };
}

interface Aanwezigheid {
  id: string;
  status: string;
  les: { datum: string; klas: { naam: string } };
}

interface Kind {
  id: string;
  name: string;
  cijfers: Cijfer[];
  aanwezigheid: Aanwezigheid[];
}

function gemiddeldeKleur(g: number) {
  return g >= 5.5
    ? { bg: colors.successLight, fg: colors.primaryDark }
    : { bg: colors.dangerLight, fg: colors.danger };
}

export default function OuderCijfers() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Kind[]>("/api/ouder/kind");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const kinderen = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {kinderen.length === 0 ? (
        <Empty text="Geen kinderen gekoppeld." />
      ) : (
        kinderen.map((kind) => {
          // Gemiddelde per vak
          const perVak = new Map<string, { naam: string; som: number; n: number }>();
          for (const c of kind.cijfers) {
            const e = perVak.get(c.vak.id) ?? { naam: c.vak.naam, som: 0, n: 0 };
            e.som += c.waarde;
            e.n += 1;
            perVak.set(c.vak.id, e);
          }
          const vakGemiddelden = Array.from(perVak.values()).map((v) => ({
            naam: v.naam,
            gem: Math.round((v.som / v.n) * 10) / 10,
          }));

          const aanwezig = kind.aanwezigheid.filter((a) => a.status === "AANWEZIG").length;
          const pct = kind.aanwezigheid.length > 0 ? Math.round((aanwezig / kind.aanwezigheid.length) * 100) : null;

          return (
            <View key={kind.id}>
              <SectionTitle>{kind.name}</SectionTitle>

              {/* Gemiddelde per vak */}
              <Card>
                <Text style={styles.cardSub}>Gemiddelde per vak</Text>
                {vakGemiddelden.length === 0 ? (
                  <Muted>Nog geen cijfers.</Muted>
                ) : (
                  vakGemiddelden.map((v) => (
                    <View key={v.naam} style={styles.row}>
                      <Text style={styles.vakNaam}>{v.naam}</Text>
                      <Badge text={v.gem.toFixed(1)} {...gemiddeldeKleur(v.gem)} />
                    </View>
                  ))
                )}
                {pct !== null && (
                  <View style={[styles.row, { marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 6 }]}>
                    <Text style={styles.vakNaam}>Aanwezigheid</Text>
                    <Badge
                      text={`${pct}%`}
                      bg={pct >= 80 ? colors.successLight : colors.warningLight}
                      fg={pct >= 80 ? colors.primaryDark : colors.warning}
                    />
                  </View>
                )}
              </Card>

              {/* Recente cijfers */}
              {kind.cijfers.length > 0 && (
                <Card>
                  <Text style={styles.cardSub}>Recente cijfers</Text>
                  {kind.cijfers.slice(0, 8).map((c) => (
                    <View key={c.id} style={styles.cijferRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vakNaam}>{c.vak.naam}</Text>
                        <Muted>
                          {fmtDatum(c.datum)}
                          {c.omschrijving ? ` · ${c.omschrijving}` : ""}
                        </Muted>
                        {c.opmerking ? <LinkText style={styles.opmerking}>{c.opmerking}</LinkText> : null}
                        {c.hasBijlage ? (
                          <Text style={styles.bijlage} onPress={() => openAttachment("cijfer", c.id)}>📎 Bijlage</Text>
                        ) : null}
                      </View>
                      <Badge
                        text={c.waarde.toFixed(1)}
                        bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                        fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
                      />
                    </View>
                  ))}
                </Card>
              )}

              {/* Recente afwezigheid */}
              {kind.aanwezigheid.filter((a) => a.status !== "AANWEZIG").length > 0 && (
                <Card>
                  <Text style={styles.cardSub}>Recente afwezigheid</Text>
                  {kind.aanwezigheid
                    .filter((a) => a.status !== "AANWEZIG")
                    .slice(0, 5)
                    .map((a) => {
                      const c = STATUS_COLORS[a.status] ?? STATUS_COLORS.AFWEZIG;
                      return (
                        <View key={a.id} style={styles.cijferRow}>
                          <Muted>
                            {a.les.klas.naam} · {fmtDatum(a.les.datum)}
                          </Muted>
                          <Badge text={STATUS_LABELS[a.status] ?? a.status} bg={c.bg} fg={c.fg} />
                        </View>
                      );
                    })}
                </Card>
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  cijferRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 4 },
  vakNaam: { fontSize: 14, color: colors.text, fontWeight: "500" },
  opmerking: { fontSize: 13, color: colors.info, marginTop: 2 },
  bijlage: { fontSize: 13, color: colors.info, textDecorationLine: "underline", marginTop: 2 },
});
