import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum, fmtDatumTijd } from "../../lib/format";

// De leerling levert niets in: de docent vinkt af of het huiswerk gedaan is.
// Dit scherm is daarom alleen-lezen. Een ouder, echt door de leerling
// ingeleverd antwoord blijft wel zichtbaar - dat is data van de leerling zelf.

interface Inlevering {
  id: string;
  inhoud: string;
  createdAt: string;
  opmerking: string | null;
  opmerkingOp: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
}

interface Huiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  vak: { naam: string; categorie: string };
  lesDatum: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  afgevinkt: boolean;
  inlevering?: Inlevering;
}

interface KlasRanking {
  klasId: string;
  klasNaam: string;
  top3: { positie: number; leerling: { id: string; name: string }; percentage: number }[];
  totaalHw: number;
  eigenPositie: number | null;
  eigenPercentage: number;
}

export default function LeerlingHuiswerk() {
  const { t, isRTL } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Huiswerk[]>("/api/leerling/huiswerk");
  const rk = useFetch<KlasRanking[]>("/api/leerling/ranking");
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const rankings = (rk.data ?? []).filter((r) => r.totaalHw > 0);
  const open = (data ?? []).filter((h) => !h.afgevinkt);
  const klaar = (data ?? []).filter((h) => h.afgevinkt);

  function toggle(id: string) {
    setOpenId(openId === id ? null : id);
  }

  function renderItem(hw: Huiswerk) {
    const expanded = openId === hw.id;
    const inl = hw.inlevering;
    // "✓" is de afvink-notitie van de docent; echte tekst is een oudere
    // inlevering van de leerling zelf en blijft leesbaar.
    const eigenInlevering = inl && inl.inhoud !== "✓" && inl.inhoud.trim() !== "";
    return (
      <Card key={hw.id}>
        {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het inleverformulier */}
        <Pressable onPress={() => toggle(hw.id)} style={[styles.row, { flexDirection: row(isRTL) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{hw.titel}</Text>
            <Muted>
              {hw.vak.naam}
              {hw.lesDatum ? ` · ${t("lh_les_datum", { datum: fmtDatum(hw.lesDatum) })}` : ""}
            </Muted>
          </View>
          {hw.afgevinkt ? (
            <Badge text={t("c_afgevinkt")} />
          ) : (
            <Badge text={t("c_open")} bg={colors.warningLight} fg={colors.warning} />
          )}
        </Pressable>

        {expanded && (
          <View style={styles.detail}>
            {hw.beschrijving ? (
              <LinkText style={[styles.beschrijving, { textAlign: textStart(isRTL) }]}>{hw.beschrijving}</LinkText>
            ) : null}
            {hw.hasBijlage && (
              <Text
                style={[styles.bijlageText, { textAlign: textStart(isRTL) }]}
                onPress={() => openAttachment("huiswerk", hw.id)}
              >
                📎 {hw.bijlageNaam ?? t("c_bijlage_openen")}
              </Text>
            )}

            {/* Een eerder ingeleverd antwoord blijft leesbaar, maar is niet
                meer te wijzigen. */}
            {eigenInlevering && inl && (
              <View style={styles.inleveringBox}>
                <Text style={[styles.opmerkingLabel, { textAlign: textStart(isRTL) }]}>
                  {t("lh_eerdere_inlevering", { moment: fmtDatumTijd(inl.createdAt) })}
                </Text>
                {inl.inhoud ? (
                  <Text style={[styles.opmerkingText, { textAlign: textStart(isRTL) }]}>{inl.inhoud}</Text>
                ) : null}
                {inl.hasBijlage ? (
                  <Text
                    style={[styles.bijlageText, { textAlign: textStart(isRTL) }]}
                    onPress={() => openAttachment("inlevering", inl.id)}
                  >
                    📎 {inl.bijlageNaam ?? t("lh_jouw_bestand")}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Docent-opmerking */}
            {inl?.opmerking ? (
              <View style={styles.opmerkingBox}>
                <Text style={[styles.opmerkingLabel, { textAlign: textStart(isRTL) }]}>{t("c_opmerking_docent")}</Text>
                <LinkText style={[styles.opmerkingText, { textAlign: textStart(isRTL) }]}>{inl.opmerking}</LinkText>
              </View>
            ) : null}

            <Muted style={{ marginTop: 8 }}>
              {hw.afgevinkt ? t("lh_afgevinkt_uitleg") : t("lh_open_uitleg")}
            </Muted>
          </View>
        )}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {rankings.map((r) => (
        <View key={r.klasId} style={styles.rankCard}>
          <Text style={[styles.rankTitle, { textAlign: textStart(isRTL) }]}>
            {t("lh_klassement", { klas: r.klasNaam })}
          </Text>
          {r.top3.map((item) => (
            <View key={item.leerling.id} style={[styles.rankRow, { flexDirection: row(isRTL) }]}>
              <View style={[styles.rankNum, item.positie === 1 && styles.rankNumLead]}>
                <Text style={[styles.rankNumText, item.positie === 1 && styles.rankNumTextLead]}>{item.positie}</Text>
              </View>
              <Text style={styles.rankNaam}>{item.leerling.name}</Text>
              <Text style={styles.rankPct}>{item.percentage}%</Text>
            </View>
          ))}
          {r.eigenPositie !== null && (
            <Text style={[styles.eigenPositie, { textAlign: textStart(isRTL) }]}>
              {t("lh_jouw_positie", { positie: r.eigenPositie, pct: r.eigenPercentage })}
            </Text>
          )}
        </View>
      ))}

      {(data ?? []).length === 0 ? (
        <Empty text={t("lh_geen")} />
      ) : (
        <>
          {open.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>
                {t("lh_open_n", { count: open.length })}
              </Text>
              {open.map(renderItem)}
            </>
          )}
          {klaar.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { textAlign: textStart(isRTL) }]}>
                {t("lh_afgevinkt_n", { count: klaar.length })}
              </Text>
              {klaar.map(renderItem)}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageText: { color: colors.info, fontSize: 14, textDecorationLine: "underline", paddingVertical: 4 },
  inleveringBox: { marginTop: 6, backgroundColor: colors.bg, borderRadius: 8, padding: 10 },
  opmerkingBox: { backgroundColor: colors.infoLight, borderRadius: 8, padding: 10, marginTop: 6 },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
  rankCard: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning, borderRadius: 12, padding: 14, marginBottom: 12 },
  rankTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  rankRow: { alignItems: "center", gap: 8, paddingVertical: 3 },
  rankNum: { width: 24, height: 24, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  rankNumLead: { backgroundColor: colors.primary },
  rankNumText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  rankNumTextLead: { color: "#fff" },
  rankNaam: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.text },
  rankPct: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  eigenPositie: { marginTop: 8, fontSize: 13, color: colors.textMuted, fontWeight: "600" },
});
