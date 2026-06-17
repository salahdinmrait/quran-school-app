import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, SectionTitle } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum, fmtDatumTijd, isVerlopen } from "../../lib/format";

interface Hw {
  id: string;
  titel: string;
  beschrijving: string | null;
  deadline: string | null;
  vak: { naam: string; categorie: string };
  bijlageNaam?: string | null;
  hasBijlage?: boolean;
  ingeLeverd: boolean;
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
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindHuiswerk[]>("/api/ouder/huiswerk");
  const [openId, setOpenId] = useState<string | null>(null);

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
              huiswerk.map((hw) => {
                const expanded = openId === `${kind.id}_${hw.id}`;
                const inl = hw.inlevering;
                const eigenInlevering = inl && inl.inhoud !== "✓";
                return (
                  <Card key={hw.id} onPress={() => setOpenId(expanded ? null : `${kind.id}_${hw.id}`)}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{hw.titel}</Text>
                        <Muted>{hw.vak.naam} · deadline {fmtDatum(hw.deadline)}</Muted>
                      </View>
                      {hw.ingeLeverd ? (
                        <Badge text="Ingeleverd ✓" />
                      ) : isVerlopen(hw.deadline) ? (
                        <Badge text="Verlopen" bg={colors.dangerLight} fg={colors.danger} />
                      ) : (
                        <Badge text="Open" bg={colors.warningLight} fg={colors.warning} />
                      )}
                    </View>

                    {expanded && (
                      <View style={styles.detail}>
                        {hw.beschrijving ? <LinkText style={styles.beschrijving}>{hw.beschrijving}</LinkText> : null}
                        {hw.hasBijlage ? (
                          <Text style={styles.bijlage} onPress={() => openAttachment("huiswerk", hw.id)}>📎 {hw.bijlageNaam ?? "Bijlage openen"}</Text>
                        ) : null}
                        {eigenInlevering && inl ? (
                          <View style={styles.inleveringBox}>
                            <Text style={styles.opmerkingLabel}>Ingeleverd ({fmtDatumTijd(inl.createdAt)}):</Text>
                            {inl.inhoud ? <Text style={styles.opmerkingText}>{inl.inhoud}</Text> : null}
                            {inl.hasBijlage && inl.id ? (
                              <Text style={styles.bijlage} onPress={() => openAttachment("inlevering", inl.id!)}>📎 Ingeleverd bestand</Text>
                            ) : null}
                          </View>
                        ) : null}
                        {inl?.opmerking ? (
                          <View style={styles.opmerkingBox}>
                            <Text style={styles.opmerkingLabel}>Opmerking van docent:</Text>
                            <LinkText style={styles.opmerkingText}>{inl.opmerking}</LinkText>
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlage: { color: colors.info, fontSize: 14, textDecorationLine: "underline", paddingVertical: 4 },
  inleveringBox: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginTop: 6 },
  opmerkingBox: { backgroundColor: colors.infoLight, borderRadius: 8, padding: 10, marginTop: 8 },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
});
