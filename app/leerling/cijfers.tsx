import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  opmerking?: string | null;
  hasBijlage?: boolean;
  datum: string;
  vak: { id: string; naam: string; categorie: string };
}

function kleur(w: number) {
  return w >= 5.5
    ? { bg: colors.successLight, fg: colors.primaryDark }
    : { bg: colors.dangerLight, fg: colors.danger };
}

export default function LeerlingCijfers() {
  const { t, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Cijfer[]>("/api/leerling/cijfers");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const cijfers = data ?? [];

  // Gemiddelde per vak (i.p.v. één gecombineerd gemiddelde)
  const perVak = new Map<string, { naam: string; categorie: string; som: number; n: number }>();
  for (const c of cijfers) {
    const e = perVak.get(c.vak.id) ?? { naam: c.vak.naam, categorie: c.vak.categorie, som: 0, n: 0 };
    e.som += c.waarde;
    e.n += 1;
    perVak.set(c.vak.id, e);
  }
  const vakGemiddelden = Array.from(perVak.values()).map((v) => ({ ...v, gem: Math.round((v.som / v.n) * 10) / 10 }));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {vakGemiddelden.length > 0 && (
        <Card>
          <Text style={[styles.cardSub, { textAlign: textStart(isRTL) }]}>{t("c_gemiddelde_per_vak")}</Text>
          {vakGemiddelden.map((v) => (
            <View key={v.naam} style={[styles.gemRow, { flexDirection: row(isRTL) }]}>
              <Text style={styles.vakNaam}>{v.naam}</Text>
              <Badge text={v.gem.toFixed(1)} {...kleur(v.gem)} />
            </View>
          ))}
        </Card>
      )}

      {cijfers.length === 0 ? (
        <Empty text={t("lc_geen")} />
      ) : (
        cijfers.map((c) => (
          <Card key={c.id}>
            <View style={[styles.row, { flexDirection: row(isRTL) }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{c.vak.naam}</Text>
                <Muted>
                  {label("categorie", c.vak.categorie)} · {fmtDatum(c.datum)}
                </Muted>
                {c.omschrijving ? <Muted style={{ marginTop: 2 }}>{c.omschrijving}</Muted> : null}
                {c.opmerking ? (
                  <LinkText style={[styles.opmerking, { textAlign: textStart(isRTL) }]}>{c.opmerking}</LinkText>
                ) : null}
                {c.hasBijlage ? (
                  <Text
                    style={[styles.bijlage, { textAlign: textStart(isRTL) }]}
                    onPress={() => openAttachment("cijfer", c.id)}
                  >
                    📎 {t("c_bijlage")}
                  </Text>
                ) : null}
              </View>
              <Badge text={c.waarde.toFixed(1)} {...kleur(c.waarde)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  gemRow: { alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  vakNaam: { fontSize: 14, color: colors.text, fontWeight: "500" },
  row: { alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  opmerking: { fontSize: 13, color: colors.info, marginTop: 2 },
  bijlage: { fontSize: 13, color: colors.info, textDecorationLine: "underline", marginTop: 2 },
});
