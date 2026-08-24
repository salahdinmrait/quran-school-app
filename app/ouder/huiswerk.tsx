import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum, fmtDatumTijd } from "../../lib/format";

// Huiswerk hangt aan een les; de lesdatum zegt wanneer het aan de beurt is.
// De docent bepaalt of het gedaan is - er wordt niets ingeleverd.

interface Hw {
  id: string;
  titel: string;
  beschrijving: string | null;
  vak: { naam: string; categorie: string };
  lesDatum: string | null;
  bijlageNaam?: string | null;
  hasBijlage?: boolean;
  afgevinkt: boolean;
  inlevering: {
    id?: string;
    inhoud: string;
    createdAt: string;
    opmerking: string | null;
    opmerkingOp?: string | null;
    hasBijlage?: boolean;
  } | null;
}

interface KindHuiswerk {
  kind: { id: string; name: string };
  huiswerk: Hw[];
}

export default function OuderHuiswerk() {
  const { t, isRTL } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindHuiswerk[]>("/api/ouder/huiswerk");
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const result = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {result.length === 0 ? (
        <Empty text={t("ou_geen_kinderen")} />
      ) : (
        result.map(({ kind, huiswerk }) => (
          <View key={kind.id}>
            <SectionTitle>{kind.name}</SectionTitle>
            {huiswerk.length === 0 ? (
              <Empty text={t("ou_geen_huiswerk")} />
            ) : (
              huiswerk.map((hw) => {
                const expanded = openId === `${kind.id}_${hw.id}`;
                const inl = hw.inlevering;
                // "✓" is de afvink-notitie van de docent; echte tekst is een
                // oudere inlevering van de leerling zelf.
                const eigenInlevering = inl && inl.inhoud !== "✓" && inl.inhoud.trim() !== "";
                return (
                  <Card key={hw.id} onPress={() => setOpenId(expanded ? null : `${kind.id}_${hw.id}`)}>
                    <View style={[styles.row, { flexDirection: row(isRTL) }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{hw.titel}</Text>
                        <Muted>
                          {hw.vak.naam}
                          {hw.lesDatum ? ` · ${t("lh_les_datum", { datum: fmtDatum(hw.lesDatum) })}` : ""}
                        </Muted>
                      </View>
                      {hw.afgevinkt ? (
                        <Badge text={`${t("c_afgevinkt")} ✓`} />
                      ) : (
                        <Badge text={t("c_open")} bg={colors.warningLight} fg={colors.warning} />
                      )}
                    </View>

                    {expanded && (
                      <View style={styles.detail}>
                        {hw.beschrijving ? (
                          <LinkText style={[styles.beschrijving, { textAlign: textStart(isRTL) }]}>
                            {hw.beschrijving}
                          </LinkText>
                        ) : null}
                        {hw.hasBijlage ? (
                          <Text style={[styles.bijlage, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("huiswerk", hw.id)}>
                            📎 {hw.bijlageNaam ?? t("c_bijlage_openen")}
                          </Text>
                        ) : null}
                        {eigenInlevering && inl ? (
                          <View style={styles.inleveringBox}>
                            <Text style={[styles.opmerkingLabel, { textAlign: textStart(isRTL) }]}>
                              {t("ou_eerder_ingeleverd", { moment: fmtDatumTijd(inl.createdAt) })}
                            </Text>
                            {inl.inhoud ? <Text style={styles.opmerkingText}>{inl.inhoud}</Text> : null}
                            {inl.hasBijlage && inl.id ? (
                              <Text style={[styles.bijlage, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("inlevering", inl.id!)}>
                                📎 {t("ou_ingeleverd_bestand")}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {inl?.opmerking ? (
                          <View style={styles.opmerkingBox}>
                            <Text style={[styles.opmerkingLabel, { textAlign: textStart(isRTL) }]}>
                              {t("c_opmerking_docent")}
                            </Text>
                            <LinkText style={[styles.opmerkingText, { textAlign: textStart(isRTL) }]}>
                              {inl.opmerking}
                            </LinkText>
                          </View>
                        ) : null}
                      </View>
                    )}
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
  row: { alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlage: { color: colors.info, fontSize: 14, textDecorationLine: "underline", paddingVertical: 4 },
  inleveringBox: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginTop: 6 },
  opmerkingBox: { backgroundColor: colors.infoLight, borderRadius: 8, padding: 10, marginTop: 8 },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
});
