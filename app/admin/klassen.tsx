import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect, CheckRow, Badge } from "../../components/ui";
import { colors, CATEGORIE_LABELS } from "../../lib/theme";
import { plural } from "../../lib/format";

interface KlasSummary {
  id: string;
  naam: string;
  beschrijving: string | null;
  _count: { leerlingen: number; docenten: number; vakken: number };
}

interface KlasDetail {
  id: string;
  naam: string;
  beschrijving: string | null;
  leerlingen: { id: string; leerlingId: string; leerling: { id: string; name: string; email: string } }[];
  docenten: { id: string; docentId: string; docent: { id: string; name: string; email: string } }[];
  vakken: { id: string; vakId: string; vak: { id: string; naam: string; categorie: string } }[];
}

interface Gebruiker {
  id: string;
  name: string;
  role: string;
}

interface Vak {
  id: string;
  naam: string;
}

export default function AdminKlassen() {
  const kl = useFetch<KlasSummary[]>("/api/klassen");
  const gb = useFetch<Gebruiker[]>("/api/gebruikers");
  const vk = useFetch<Vak[]>("/api/vakken");

  // Nieuwe klas
  const [showForm, setShowForm] = useState(false);
  const [naam, setNaam] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geopende klas (detail/beheer)
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KlasDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Naam bewerken
  const [editNaam, setEditNaam] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweBeschrijving, setNieuweBeschrijving] = useState("");

  // Leerlingen toevoegen (multi-select)
  const [addLeerlingen, setAddLeerlingen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [zoek, setZoek] = useState("");

  // Docent / vak koppelen
  const [koppelDocentId, setKoppelDocentId] = useState<string | null>(null);
  const [koppelVakId, setKoppelVakId] = useState<string | null>(null);

  const loadDetail = useCallback(async (klasId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const d = await api<KlasDetail>(`/api/klassen/${klasId}`);
      setDetail(d);
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : "Kon klas niet laden");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openId) loadDetail(openId);
    else setDetail(null);
  }, [openId, loadDetail]);

  if (kl.loading) return <Loading />;
  if (kl.error) return <ErrorView message={kl.error} onRetry={kl.reload} />;

  const klassen = kl.data ?? [];
  const leerlingen = (gb.data ?? []).filter((g) => g.role === "LEERLING");
  const docenten = (gb.data ?? []).filter((g) => g.role === "DOCENT");
  const vakken = vk.data ?? [];

  async function handleCreate() {
    if (!naam) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/klassen", {
        method: "POST",
        body: JSON.stringify({ naam, beschrijving: beschrijving || undefined }),
      });
      setNaam("");
      setBeschrijving("");
      setShowForm(false);
      await kl.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kon klas niet aanmaken");
    } finally {
      setSaving(false);
    }
  }

  async function doAction(fn: () => Promise<unknown>, refreshList = false) {
    setBusy(true);
    setDetailError(null);
    try {
      await fn();
      if (openId) await loadDetail(openId);
      if (refreshList) await kl.reload();
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : "Actie mislukt");
    } finally {
      setBusy(false);
    }
  }

  function saveNaam() {
    if (!detail || !nieuweNaam.trim()) return;
    doAction(async () => {
      await api(`/api/klassen/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({ naam: nieuweNaam.trim(), beschrijving: nieuweBeschrijving }),
      });
      setEditNaam(false);
    }, true);
  }

  function confirmDeleteKlas(k: KlasDetail) {
    bevestig(
      "Klas verwijderen",
      `"${k.naam}" naar het archief verplaatsen?`,
      () =>
        doAction(async () => {
          await api(`/api/klassen/${k.id}`, { method: "DELETE" });
          setOpenId(null);
        }, true)
    );
  }

  function confirmRemoveLeerling(klasId: string, l: { id: string; name: string }) {
    bevestig("Leerling verwijderen", `${l.name} uit deze klas halen?`, () =>
      doAction(async () => {
        await api(`/api/klassen/${klasId}/leerlingen`, {
          method: "DELETE",
          body: JSON.stringify({ leerlingId: l.id }),
        });
      }, true)
    );
  }

  async function handleAddLeerlingen(klasId: string) {
    if (checked.size === 0) return;
    await doAction(async () => {
      await api(`/api/klassen/${klasId}/leerlingen`, {
        method: "POST",
        body: JSON.stringify({ leerlingIds: Array.from(checked) }),
      });
      setChecked(new Set());
      setAddLeerlingen(false);
      setZoek("");
    }, true);
  }

  // Beschikbare (nog niet gekoppelde) personen/vakken voor de geopende klas
  const linkedLeerlingIds = new Set(detail?.leerlingen.map((x) => x.leerlingId) ?? []);
  const linkedDocentIds = new Set(detail?.docenten.map((x) => x.docentId) ?? []);
  const linkedVakIds = new Set(detail?.vakken.map((x) => x.vakId) ?? []);
  const beschikbareLeerlingen = leerlingen.filter((l) => !linkedLeerlingIds.has(l.id));
  const beschikbareDocenten = docenten.filter((d) => !linkedDocentIds.has(d.id));
  const beschikbareVakken = vakken.filter((v) => !linkedVakIds.has(v.id));
  const gefilterdeLeerlingen = zoek.trim()
    ? beschikbareLeerlingen.filter((l) => l.name.toLowerCase().includes(zoek.trim().toLowerCase()))
    : beschikbareLeerlingen;

  return (
    <Screen refreshing={kl.refreshing} onRefresh={kl.refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Nieuwe klas"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <Input label="Naam *" value={naam} onChangeText={setNaam} placeholder="bijv. Klas 1A" />
          <Input label="Beschrijving" value={beschrijving} onChangeText={setBeschrijving} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Klas aanmaken" onPress={handleCreate} loading={saving} disabled={!naam} />
        </Card>
      )}

      {klassen.length === 0 ? (
        <Empty text="Nog geen klassen." />
      ) : (
        klassen.map((k) => {
          const expanded = openId === k.id;
          return (
            <Card key={k.id}>
              {/* Alleen de kop toggle't — anders klapt de kaart op web dicht bij klikken in het beheer-formulier */}
              <Pressable
                onPress={() => {
                  setOpenId(expanded ? null : k.id);
                  setEditNaam(false);
                  setAddLeerlingen(false);
                  setChecked(new Set());
                  setKoppelDocentId(null);
                  setKoppelVakId(null);
                }}
              >
                <Text style={styles.title}>{k.naam}</Text>
                <Muted>
                  {plural(k._count.leerlingen, "leerling", "leerlingen")} · {plural(k._count.docenten, "docent", "docenten")} · {plural(k._count.vakken, "vak", "vakken")}
                </Muted>
                {k.beschrijving ? <Muted style={{ marginTop: 2 }}>{k.beschrijving}</Muted> : null}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  {detailLoading && <Muted>Laden...</Muted>}
                  {detailError && <Text style={styles.error}>{detailError}</Text>}

                  {detail && detail.id === k.id && (
                    <>
                      {/* ── Naam bewerken / klas verwijderen ── */}
                      {editNaam ? (
                        <View>
                          <Input label="Naam" value={nieuweNaam} onChangeText={setNieuweNaam} />
                          <Input label="Beschrijving" value={nieuweBeschrijving} onChangeText={setNieuweBeschrijving} />
                          <View style={styles.btnRow}>
                            <Button small title="Opslaan" onPress={saveNaam} loading={busy} disabled={nieuweNaam.trim().length < 2} />
                            <Button small title="Annuleren" variant="ghost" onPress={() => setEditNaam(false)} />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.btnRow}>
                          <Button
                            small
                            title="Naam bewerken"
                            variant="secondary"
                            onPress={() => {
                              setNieuweNaam(detail.naam);
                              setNieuweBeschrijving(detail.beschrijving ?? "");
                              setEditNaam(true);
                            }}
                          />
                          <Button small title="Klas verwijderen" variant="danger" onPress={() => confirmDeleteKlas(detail)} />
                        </View>
                      )}

                      {/* ── Leerlingen ── */}
                      <Text style={styles.subTitle}>Leerlingen ({detail.leerlingen.length})</Text>
                      {detail.leerlingen.length === 0 ? (
                        <Muted>Nog geen leerlingen ingeschreven.</Muted>
                      ) : (
                        detail.leerlingen.map((x) => (
                          <View key={x.id} style={styles.personRow}>
                            <Text style={styles.personNaam}>{x.leerling.name}</Text>
                            <Button
                              small
                              title="Verwijderen"
                              variant="ghost"
                              onPress={() => confirmRemoveLeerling(detail.id, { id: x.leerlingId, name: x.leerling.name })}
                            />
                          </View>
                        ))
                      )}

                      {addLeerlingen ? (
                        <View style={styles.addBox}>
                          {beschikbareLeerlingen.length > 6 && (
                            <Input value={zoek} onChangeText={setZoek} placeholder="Zoeken op naam..." />
                          )}
                          {gefilterdeLeerlingen.length === 0 ? (
                            <Muted>Geen beschikbare leerlingen.</Muted>
                          ) : (
                            gefilterdeLeerlingen.map((l) => (
                              <CheckRow
                                key={l.id}
                                label={l.name}
                                checked={checked.has(l.id)}
                                onToggle={() =>
                                  setChecked((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(l.id)) next.delete(l.id);
                                    else next.add(l.id);
                                    return next;
                                  })
                                }
                              />
                            ))
                          )}
                          <View style={styles.btnRow}>
                            <Button
                              small
                              title={`Inschrijven (${checked.size})`}
                              onPress={() => handleAddLeerlingen(detail.id)}
                              loading={busy}
                              disabled={checked.size === 0}
                            />
                            <Button small title="Annuleren" variant="ghost" onPress={() => { setAddLeerlingen(false); setChecked(new Set()); }} />
                          </View>
                        </View>
                      ) : (
                        beschikbareLeerlingen.length > 0 && (
                          <Button small title="+ Leerlingen toevoegen" variant="secondary" onPress={() => setAddLeerlingen(true)} />
                        )
                      )}

                      {/* ── Docenten ── */}
                      <Text style={styles.subTitle}>Docenten ({detail.docenten.length})</Text>
                      {detail.docenten.length === 0 ? (
                        <Muted>Nog geen docenten gekoppeld.</Muted>
                      ) : (
                        detail.docenten.map((x) => (
                          <View key={x.id} style={styles.personRow}>
                            <Text style={styles.personNaam}>{x.docent.name}</Text>
                            <Button
                              small
                              title="Verwijderen"
                              variant="ghost"
                              onPress={() =>
                                doAction(async () => {
                                  await api(`/api/klassen/${detail.id}/docenten`, {
                                    method: "DELETE",
                                    body: JSON.stringify({ docentId: x.docentId }),
                                  });
                                }, true)
                              }
                            />
                          </View>
                        ))
                      )}
                      {beschikbareDocenten.length > 0 && (
                        <View>
                          <ChipSelect
                            options={beschikbareDocenten.map((d) => ({ value: d.id, label: d.name }))}
                            value={koppelDocentId}
                            onChange={setKoppelDocentId}
                          />
                          <Button
                            small
                            title="Docent koppelen"
                            onPress={() =>
                              doAction(async () => {
                                await api(`/api/klassen/${detail.id}/docenten`, {
                                  method: "POST",
                                  body: JSON.stringify({ docentId: koppelDocentId }),
                                });
                                setKoppelDocentId(null);
                              }, true)
                            }
                            loading={busy}
                            disabled={!koppelDocentId}
                          />
                        </View>
                      )}

                      {/* ── Vakken ── */}
                      <Text style={styles.subTitle}>Vakken ({detail.vakken.length})</Text>
                      {detail.vakken.length === 0 ? (
                        <Muted>Nog geen vakken gekoppeld.</Muted>
                      ) : (
                        detail.vakken.map((x) => (
                          <View key={x.id} style={styles.personRow}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                              <Text style={styles.personNaam}>{x.vak.naam}</Text>
                              <Badge text={CATEGORIE_LABELS[x.vak.categorie] ?? x.vak.categorie} />
                            </View>
                            <Button
                              small
                              title="Verwijderen"
                              variant="ghost"
                              onPress={() =>
                                doAction(async () => {
                                  await api(`/api/klassen/${detail.id}/vakken`, {
                                    method: "DELETE",
                                    body: JSON.stringify({ vakId: x.vakId }),
                                  });
                                }, true)
                              }
                            />
                          </View>
                        ))
                      )}
                      {beschikbareVakken.length > 0 && (
                        <View>
                          <ChipSelect
                            options={beschikbareVakken.map((v) => ({ value: v.id, label: v.naam }))}
                            value={koppelVakId}
                            onChange={setKoppelVakId}
                          />
                          <Button
                            small
                            title="Vak koppelen"
                            onPress={() =>
                              doAction(async () => {
                                await api(`/api/klassen/${detail.id}/vakken`, {
                                  method: "POST",
                                  body: JSON.stringify({ vakId: koppelVakId }),
                                });
                                setKoppelVakId(null);
                              }, true)
                            }
                            loading={busy}
                            disabled={!koppelVakId}
                          />
                        </View>
                      )}
                    </>
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
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  subTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  personNaam: { fontSize: 14, color: colors.text, flexShrink: 1 },
  btnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  addBox: { marginTop: 6 },
  error: { color: colors.danger, marginBottom: 8 },
});
