import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useRouter } from "expo-router";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum, isVerlopen } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface RankingItem {
  positie: number;
  leerling: { id: string; name: string };
  aantalIngeleverd: number;
  totaal: number;
  percentage: number;
}

interface KlasRanking {
  klasId: string;
  klasNaam: string;
  top3: RankingItem[];
  totaalHw: number;
}

interface Inlevering {
  id: string;
  inhoud: string;
  createdAt: string;
  opmerking: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  leerling: { id: string; name: string };
}

interface Huiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  deadline: string | null;
  vakId: string;
  vak: { id: string; naam: string };
  les: { id: string; klas: { id: string; naam: string } } | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  inleveringen: Inlevering[];
  doelLeerlingen?: { leerling: { id: string; name: string } }[];
}

export default function DocentHuiswerk() {
  const router = useRouter();
  const hw = useFetch<Huiswerk[]>("/api/docent/huiswerk");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [opmerkingFor, setOpmerkingFor] = useState<string | null>(null);
  const [opmerkingText, setOpmerkingText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Klassement per klas
  const [rankings, setRankings] = useState<KlasRanking[]>([]);
  const [rankingKlasId, setRankingKlasId] = useState<string | null>(null);

  const klasIds = (kl.data ?? []).map((k) => k.id).join(",");
  useEffect(() => {
    if (!kl.data || kl.data.length === 0) return;
    Promise.all(
      kl.data.map((k) =>
        api<KlasRanking>(`/api/klassen/${k.id}/ranking`).catch(() => null)
      )
    ).then((results) => {
      const ok = results.filter((r): r is KlasRanking => !!r);
      setRankings(ok);
      if (ok.length > 0) setRankingKlasId((prev) => prev ?? ok[0].klasId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klasIds]);

  if (hw.loading || kl.loading) return <Loading />;
  if (hw.error) return <ErrorView message={hw.error} onRetry={hw.reload} />;

  const huiswerk = hw.data ?? [];
  const klassen = kl.data ?? [];
  const activeRanking = rankings.find((r) => r.klasId === rankingKlasId) ?? rankings[0] ?? null;

  // Leerlingen that this huiswerk applies to: klas of linked les,
  // otherwise every klas (of this docent) that has the vak.
  function leerlingenVoor(h: Huiswerk): { id: string; name: string }[] {
    // Gericht op specifieke leerlingen → alleen die
    if (h.doelLeerlingen && h.doelLeerlingen.length > 0) {
      return h.doelLeerlingen.map((d) => d.leerling);
    }
    if (h.les) {
      const klas = klassen.find((k) => k.id === h.les!.klas.id);
      if (klas) return klas.leerlingen;
    }
    const set = new Map<string, { id: string; name: string }>();
    for (const k of klassen) {
      if (k.vakken.some((v) => v.id === h.vakId || v.id === h.vak.id)) {
        for (const l of k.leerlingen) set.set(l.id, l);
      }
    }
    return Array.from(set.values());
  }

  async function toggleAfvinken(h: Huiswerk, leerlingId: string, done: boolean) {
    setBusy(`${h.id}_${leerlingId}`);
    setActionError(null);
    try {
      await api("/api/docent/huiswerk/afvinken", {
        method: done ? "DELETE" : "POST",
        body: JSON.stringify({ huiswerkId: h.id, leerlingId }),
      });
      await hw.reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Actie mislukt");
    } finally {
      setBusy(null);
    }
  }

  async function saveOpmerking(inleveringId: string) {
    if (!opmerkingText.trim()) return;
    setBusy(inleveringId);
    setActionError(null);
    try {
      await api(`/api/docent/huiswerk/inleveringen/${inleveringId}`, {
        method: "PUT",
        body: JSON.stringify({ opmerking: opmerkingText.trim() }),
      });
      setOpmerkingFor(null);
      setOpmerkingText("");
      await hw.reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    } finally {
      setBusy(null);
    }
  }

  function confirmDeleteHuiswerk(h: Huiswerk) {
    bevestig("Huiswerk verwijderen", `"${h.titel}" verwijderen?`, async () => {
      setActionError(null);
      try {
        await api(`/api/docent/huiswerk/${h.id}`, { method: "DELETE" });
        await hw.reload();
      } catch (e) {
        setActionError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
      }
    });
  }

  return (
    <Screen refreshing={hw.refreshing} onRefresh={hw.refresh}>
      <Button title="+ Nieuw huiswerk" onPress={() => router.push("/docent/huiswerk-nieuw")} />

      {/* Klassement */}
      {activeRanking && activeRanking.totaalHw > 0 && activeRanking.top3.length > 0 && (
        <Card style={{ borderColor: colors.warning, backgroundColor: colors.warningLight }}>
          <Text style={styles.rankTitle}>Klassement</Text>
          {rankings.length > 1 && (
            <ChipSelect
              options={rankings.map((r) => ({ value: r.klasId, label: r.klasNaam }))}
              value={rankingKlasId}
              onChange={setRankingKlasId}
            />
          )}
          {activeRanking.top3.map((item) => (
            <View key={item.leerling.id} style={styles.rankRow}>
              <View style={[styles.rankNum, item.positie === 1 && styles.rankNumLead]}>
                <Text style={[styles.rankNumText, item.positie === 1 && styles.rankNumTextLead]}>{item.positie}</Text>
              </View>
              <Text style={styles.rankNaam}>{item.leerling.name}</Text>
              <Text style={styles.rankPct}>{item.percentage}%</Text>
              <Muted>
                {item.aantalIngeleverd}/{item.totaal}
              </Muted>
            </View>
          ))}
        </Card>
      )}

      {huiswerk.length === 0 ? (
        <Empty text="Nog geen huiswerk opgegeven." />
      ) : (
        huiswerk.map((h) => {
          const expanded = openId === h.id;
          const leerlingen = leerlingenVoor(h);
          const doneIds = new Set(h.inleveringen.map((i) => i.leerling.id));
          return (
            <Card key={h.id}>
              {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het opmerking-veld */}
              <Pressable onPress={() => setOpenId(expanded ? null : h.id)} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{h.titel}</Text>
                  <Muted>
                    {h.vak.naam}
                    {h.les ? ` · ${h.les.klas.naam}` : ""} · deadline {fmtDatum(h.deadline)}
                  </Muted>
                </View>
                <Badge
                  text={`${doneIds.size}/${leerlingen.length}`}
                  bg={doneIds.size === leerlingen.length && leerlingen.length > 0 ? colors.successLight : colors.warningLight}
                  fg={doneIds.size === leerlingen.length && leerlingen.length > 0 ? colors.primaryDark : colors.warning}
                />
                {isVerlopen(h.deadline) && <Badge text="verlopen" bg={colors.dangerLight} fg={colors.danger} />}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  {h.beschrijving ? <LinkText style={styles.beschrijving}>{h.beschrijving}</LinkText> : null}
                  {h.hasBijlage && (
                    <Text style={styles.bijlage} onPress={() => openAttachment("huiswerk", h.id)}>
                      📎 {h.bijlageNaam ?? "Bijlage openen"}
                    </Text>
                  )}
                  {h.doelLeerlingen && h.doelLeerlingen.length > 0 && (
                    <Muted>Alleen voor: {h.doelLeerlingen.map((d) => d.leerling.name).join(", ")}</Muted>
                  )}
                  <Button small title="Huiswerk verwijderen" variant="danger" onPress={() => confirmDeleteHuiswerk(h)} />

                  <Text style={styles.subTitle}>Aftekenen per leerling</Text>
                  {actionError && <Text style={styles.error}>{actionError}</Text>}
                  {leerlingen.length === 0 ? (
                    <Muted>Geen leerlingen gevonden voor dit huiswerk.</Muted>
                  ) : (
                    leerlingen.map((l) => {
                      const inlevering = h.inleveringen.find((i) => i.leerling.id === l.id);
                      const done = !!inlevering;
                      const isBusy = busy === `${h.id}_${l.id}`;
                      return (
                        <View key={l.id} style={styles.leerlingBlock}>
                          <View style={styles.leerlingRow}>
                            <Text style={styles.leerlingNaam}>{l.name}</Text>
                            <Button
                              small
                              title={isBusy ? "..." : done ? "✓ Gedaan" : "Aftekenen"}
                              variant={done ? "secondary" : "primary"}
                              onPress={() => toggleAfvinken(h, l.id, done)}
                              disabled={isBusy}
                            />
                          </View>
                          {inlevering && (
                            <View style={styles.opmerkingArea}>
                              {inlevering.inhoud && inlevering.inhoud !== "✓" ? (
                                <View style={styles.inleverBox}>
                                  <Muted>Ingeleverd:</Muted>
                                  <Text style={styles.inleverText}>{inlevering.inhoud}</Text>
                                </View>
                              ) : null}
                              {inlevering.hasBijlage ? (
                                <Text style={styles.bijlage} onPress={() => openAttachment("inlevering", inlevering.id)}>
                                  📎 {inlevering.bijlageNaam ?? "Ingeleverd bestand"}
                                </Text>
                              ) : null}
                              {inlevering.opmerking ? (
                                <Muted>Opmerking: {inlevering.opmerking}</Muted>
                              ) : null}
                              {opmerkingFor === inlevering.id ? (
                                <View>
                                  <Input
                                    value={opmerkingText}
                                    onChangeText={setOpmerkingText}
                                    placeholder="Opmerking voor leerling en ouders..."
                                    multiline
                                  />
                                  <View style={styles.opmerkingButtons}>
                                    <Button
                                      small
                                      title="Opslaan"
                                      onPress={() => saveOpmerking(inlevering.id)}
                                      loading={busy === inlevering.id}
                                      disabled={!opmerkingText.trim()}
                                    />
                                    <Button
                                      small
                                      title="Annuleren"
                                      variant="ghost"
                                      onPress={() => {
                                        setOpmerkingFor(null);
                                        setOpmerkingText("");
                                      }}
                                    />
                                  </View>
                                </View>
                              ) : (
                                <Text
                                  style={styles.opmerkingLink}
                                  onPress={() => {
                                    setOpmerkingFor(inlevering.id);
                                    setOpmerkingText(inlevering.opmerking ?? "");
                                  }}
                                >
                                  {inlevering.opmerking ? "Opmerking bewerken" : "+ Opmerking toevoegen"}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 6 },
  bijlage: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginBottom: 6 },
  subTitle: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 6, marginBottom: 4 },
  leerlingBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: 4 },
  leerlingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  leerlingNaam: { fontSize: 14, color: colors.text, flex: 1 },
  opmerkingArea: { paddingLeft: 4, paddingBottom: 4 },
  inleverBox: { backgroundColor: colors.bg, borderRadius: 8, padding: 8, marginVertical: 4 },
  inleverText: { fontSize: 13, color: colors.text },
  opmerkingLink: { color: colors.info, fontSize: 13, paddingVertical: 2 },
  opmerkingButtons: { flexDirection: "row", gap: 8 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
  rankTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  rankNum: { width: 24, height: 24, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  rankNumLead: { backgroundColor: colors.primary },
  rankNumText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  rankNumTextLead: { color: "#fff" },
  rankNaam: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.text },
  rankPct: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
});
