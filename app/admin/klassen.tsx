import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect, Badge } from "../../components/ui";
import { PersonPicker } from "../../components/PersonPicker";
import { colors } from "../../lib/theme";
import { useT } from "../../lib/LanguageContext";
import { row } from "../../lib/rtl";

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
  email: string;
  role: string;
}

interface Vak {
  id: string;
  naam: string;
}

export default function AdminKlassen() {
  const { t, tel, isRTL, label } = useT();
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
  const [checked, setChecked] = useState<string[]>([]);

  // Docent / vak koppelen
  const [koppelDocentIds, setKoppelDocentIds] = useState<string[]>([]);
  const [koppelVakId, setKoppelVakId] = useState<string | null>(null);

  const loadDetail = useCallback(async (klasId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const d = await api<KlasDetail>(`/api/klassen/${klasId}`);
      setDetail(d);
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : t("ak_laden_mislukt"));
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
      setError(e instanceof ApiError ? e.message : t("ak_aanmaken_mislukt"));
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
      setDetailError(e instanceof ApiError ? e.message : t("c_actie_mislukt"));
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
      t("ak_klas_verwijderen"),
      t("c_archiveren_vraag", { naam: k.naam }),
      () =>
        doAction(async () => {
          await api(`/api/klassen/${k.id}`, { method: "DELETE" });
          setOpenId(null);
        }, true)
    );
  }

  function confirmRemoveLeerling(klasId: string, l: { id: string; name: string }) {
    bevestig(t("ak_leerling_verwijderen"), t("ak_leerling_vraag", { naam: l.name }), () =>
      doAction(async () => {
        await api(`/api/klassen/${klasId}/leerlingen`, {
          method: "DELETE",
          body: JSON.stringify({ leerlingId: l.id }),
        });
      }, true)
    );
  }

  async function handleAddLeerlingen(klasId: string) {
    if (checked.length === 0) return;
    await doAction(async () => {
      await api(`/api/klassen/${klasId}/leerlingen`, {
        method: "POST",
        body: JSON.stringify({ leerlingIds: checked }),
      });
      setChecked([]);
      setAddLeerlingen(false);
    }, true);
  }

  // Beschikbare (nog niet gekoppelde) personen/vakken voor de geopende klas
  const linkedLeerlingIds = new Set(detail?.leerlingen.map((x) => x.leerlingId) ?? []);
  const linkedDocentIds = new Set(detail?.docenten.map((x) => x.docentId) ?? []);
  const linkedVakIds = new Set(detail?.vakken.map((x) => x.vakId) ?? []);
  const beschikbareLeerlingen = leerlingen.filter((l) => !linkedLeerlingIds.has(l.id));
  const beschikbareDocenten = docenten.filter((d) => !linkedDocentIds.has(d.id));
  const beschikbareVakken = vakken.filter((v) => !linkedVakIds.has(v.id));

  return (
    <Screen refreshing={kl.refreshing} onRefresh={kl.refresh}>
      <Button
        title={showForm ? t("sm_form_sluiten") : t("ak_nieuwe_klas")}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <Input label={t("c_naam_verplicht")} value={naam} onChangeText={setNaam} placeholder={t("ak_naam_ph")} />
          <Input label={t("c_beschrijving")} value={beschrijving} onChangeText={setBeschrijving} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title={t("ak_klas_aanmaken")} onPress={handleCreate} loading={saving} disabled={!naam} />
        </Card>
      )}

      {klassen.length === 0 ? (
        <Empty text={t("ak_geen_klassen")} />
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
                  setChecked([]);
                  setKoppelDocentIds([]);
                  setKoppelVakId(null);
                }}
              >
                <Text style={styles.title}>{k.naam}</Text>
                <Muted>
                  {tel("c_n_leerlingen", k._count.leerlingen)} · {tel("c_n_docenten", k._count.docenten)} · {tel("c_n_vakken", k._count.vakken)}
                </Muted>
                {k.beschrijving ? <Muted style={{ marginTop: 2 }}>{k.beschrijving}</Muted> : null}
              </Pressable>

              {expanded && (
                <View style={styles.detail}>
                  {detailLoading && <Muted>{t("c_laden")}</Muted>}
                  {detailError && <Text style={styles.error}>{detailError}</Text>}

                  {detail && detail.id === k.id && (
                    <>
                      {/* ── Naam bewerken / klas verwijderen ── */}
                      {editNaam ? (
                        <View>
                          <Input label={t("c_naam")} value={nieuweNaam} onChangeText={setNieuweNaam} />
                          <Input label={t("c_beschrijving")} value={nieuweBeschrijving} onChangeText={setNieuweBeschrijving} />
                          <View style={[styles.btnRow, { flexDirection: row(isRTL) }]}>
                            <Button small title={t("c_opslaan")} onPress={saveNaam} loading={busy} disabled={nieuweNaam.trim().length < 2} />
                            <Button small title={t("c_annuleren")} variant="ghost" onPress={() => setEditNaam(false)} />
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.btnRow, { flexDirection: row(isRTL) }]}>
                          <Button
                            small
                            title={t("ak_naam_bewerken")}
                            variant="secondary"
                            onPress={() => {
                              setNieuweNaam(detail.naam);
                              setNieuweBeschrijving(detail.beschrijving ?? "");
                              setEditNaam(true);
                            }}
                          />
                          <Button small title={t("ak_klas_verwijderen")} variant="danger" onPress={() => confirmDeleteKlas(detail)} />
                        </View>
                      )}

                      {/* ── Leerlingen ── */}
                      <Text style={styles.subTitle}>{t("ak_leerlingen_n", { count: detail.leerlingen.length })}</Text>
                      {detail.leerlingen.length === 0 ? (
                        <Muted>{t("ak_geen_lln")}</Muted>
                      ) : (
                        detail.leerlingen.map((x) => (
                          <View key={x.id} style={[styles.personRow, { flexDirection: row(isRTL) }]}>
                            <Text style={styles.personNaam}>{x.leerling.name}</Text>
                            <Button
                              small
                              title={t("c_verwijderen")}
                              variant="ghost"
                              onPress={() => confirmRemoveLeerling(detail.id, { id: x.leerlingId, name: x.leerling.name })}
                            />
                          </View>
                        ))
                      )}

                      {addLeerlingen ? (
                        <View style={styles.addBox}>
                          <PersonPicker
                            personen={beschikbareLeerlingen}
                            geselecteerd={checked}
                            onChange={setChecked}
                            placeholder={t("dc_zoek_leerling")}
                            leegTekst={t("ak_geen_besch_lln")}
                          />
                          <View style={[styles.btnRow, { flexDirection: row(isRTL) }]}>
                            <Button
                              small
                              title={t("ak_inschrijven", { count: checked.length })}
                              onPress={() => handleAddLeerlingen(detail.id)}
                              loading={busy}
                              disabled={checked.length === 0}
                            />
                            <Button small title={t("c_annuleren")} variant="ghost" onPress={() => { setAddLeerlingen(false); setChecked([]); }} />
                          </View>
                        </View>
                      ) : (
                        beschikbareLeerlingen.length > 0 && (
                          <Button small title={t("ak_lln_toevoegen")} variant="secondary" onPress={() => setAddLeerlingen(true)} />
                        )
                      )}

                      {/* ── Docenten ── */}
                      <Text style={styles.subTitle}>{t("ak_docenten_n", { count: detail.docenten.length })}</Text>
                      {detail.docenten.length === 0 ? (
                        <Muted>{t("ak_geen_doc")}</Muted>
                      ) : (
                        detail.docenten.map((x) => (
                          <View key={x.id} style={[styles.personRow, { flexDirection: row(isRTL) }]}>
                            <Text style={styles.personNaam}>{x.docent.name}</Text>
                            <Button
                              small
                              title={t("c_verwijderen")}
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
                          <PersonPicker
                            personen={beschikbareDocenten}
                            geselecteerd={koppelDocentIds}
                            onChange={setKoppelDocentIds}
                            multi={false}
                            placeholder={t("ak_zoek_docent")}
                            leegTekst={t("ak_geen_besch_doc")}
                          />
                          <Button
                            small
                            title={t("ak_docent_koppelen")}
                            onPress={() =>
                              doAction(async () => {
                                await api(`/api/klassen/${detail.id}/docenten`, {
                                  method: "POST",
                                  body: JSON.stringify({ docentId: koppelDocentIds[0] }),
                                });
                                setKoppelDocentIds([]);
                              }, true)
                            }
                            loading={busy}
                            disabled={koppelDocentIds.length === 0}
                          />
                        </View>
                      )}

                      {/* ── Vakken ── */}
                      <Text style={styles.subTitle}>{t("ak_vakken_n", { count: detail.vakken.length })}</Text>
                      {detail.vakken.length === 0 ? (
                        <Muted>{t("ak_geen_vakken")}</Muted>
                      ) : (
                        detail.vakken.map((x) => (
                          <View key={x.id} style={[styles.personRow, { flexDirection: row(isRTL) }]}>
                            <View style={{ flexDirection: row(isRTL), alignItems: "center", gap: 6, flex: 1 }}>
                              <Text style={styles.personNaam}>{x.vak.naam}</Text>
                              <Badge text={label("categorie", x.vak.categorie)} />
                            </View>
                            <Button
                              small
                              title={t("c_verwijderen")}
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
                            title={t("ak_vak_koppelen")}
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  personNaam: { fontSize: 14, color: colors.text, flexShrink: 1 },
  btnRow: { gap: 8, flexWrap: "wrap" },
  addBox: { marginTop: 6 },
  error: { color: colors.danger, marginBottom: 8 },
});
