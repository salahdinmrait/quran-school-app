import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect, KV } from "../../components/ui";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface HifdhTaak {
  id: string;
  type: string;
  surahNr: number;
  vanAyah: number;
  totAyah: number;
  weekStart: string;
  voltooid: boolean;
}

interface HifdhProfiel {
  id: string;
  startSurahNr: number;
  huidigeSurahNr: number;
  huidigeAyahNr: number;
  ayaatPerWeek: number;
  opmerkingen: string | null;
  leerling: { id: string; name: string; email: string };
  taken: HifdhTaak[];
}

export default function DocentHifdh() {
  const pf = useFetch<HifdhProfiel[]>("/api/hifdh");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [openId, setOpenId] = useState<string | null>(null);
  const [busyTaak, setBusyTaak] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [leerlingId, setLeerlingId] = useState<string | null>(null);
  const [startSurahNr, setStartSurahNr] = useState("114");
  const [ayaatPerWeek, setAyaatPerWeek] = useState("5");
  const [opmerkingen, setOpmerkingen] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pf.loading || kl.loading) return <Loading />;
  if (pf.error) return <ErrorView message={pf.error} onRetry={pf.reload} />;

  const profielen = pf.data ?? [];
  const klassen = kl.data ?? [];
  const profielLeerlingIds = new Set(profielen.map((p) => p.leerling.id));
  const beschikbareLeerlingen = Array.from(
    new Map(
      klassen
        .flatMap((k) => k.leerlingen)
        .filter((l) => !profielLeerlingIds.has(l.id))
        .map((l) => [l.id, l])
    ).values()
  );

  async function toggleTaak(t: HifdhTaak) {
    setBusyTaak(t.id);
    setError(null);
    try {
      await api(`/api/hifdh/taken/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({ voltooid: !t.voltooid }),
      });
      await pf.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Actie mislukt");
    } finally {
      setBusyTaak(null);
    }
  }

  async function createProfiel() {
    if (!leerlingId || !startSurahNr) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/hifdh", {
        method: "POST",
        body: JSON.stringify({
          leerlingId,
          startSurahNr: Number(startSurahNr),
          ayaatPerWeek: Number(ayaatPerWeek) || 5,
          opmerkingen: opmerkingen || null,
        }),
      });
      setShowForm(false);
      setLeerlingId(null);
      setOpmerkingen("");
      await pf.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aanmaken mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={pf.refreshing} onRefresh={pf.refresh}>
      <Button
        title={showForm ? "Formulier sluiten" : "+ Nieuw hifdh-traject"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          {beschikbareLeerlingen.length === 0 ? (
            <Muted>Alle leerlingen hebben al een traject.</Muted>
          ) : (
            <>
              <ChipSelect
                label="Leerling"
                options={beschikbareLeerlingen.map((l) => ({ value: l.id, label: l.name }))}
                value={leerlingId}
                onChange={setLeerlingId}
              />
              <Input
                label="Start surah (1–114, bv. 114 = An-Naas)"
                value={startSurahNr}
                onChangeText={setStartSurahNr}
                keyboardType="numeric"
              />
              <Input label="Ayaat per week" value={ayaatPerWeek} onChangeText={setAyaatPerWeek} keyboardType="numeric" />
              <Input label="Opmerkingen" value={opmerkingen} onChangeText={setOpmerkingen} multiline />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button
                title="Traject starten (6 weken taken)"
                onPress={createProfiel}
                loading={saving}
                disabled={!leerlingId || !startSurahNr}
              />
            </>
          )}
        </Card>
      )}

      {profielen.length === 0 ? (
        <Empty icon="moon-outline" text="Nog geen hifdh-trajecten." />
      ) : (
        profielen.map((p) => {
          const expanded = openId === p.id;
          const open = p.taken.filter((t) => !t.voltooid);
          return (
            <Card key={p.id} onPress={() => setOpenId(expanded ? null : p.id)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.leerling.name}</Text>
                  <Muted>
                    Surah {p.huidigeSurahNr}, ayah {p.huidigeAyahNr} · {p.ayaatPerWeek}/week
                  </Muted>
                </View>
                <Badge
                  text={`${p.taken.length - open.length}/${p.taken.length}`}
                  bg={open.length === 0 ? colors.successLight : colors.warningLight}
                  fg={open.length === 0 ? colors.primaryDark : colors.warning}
                />
              </View>

              {expanded && (
                <View style={styles.detail}>
                  {error && <Text style={styles.error}>{error}</Text>}
                  {p.taken.map((t) => (
                    <View key={t.id} style={styles.taakRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taakTitel}>
                          Surah {t.surahNr} · ayah {t.vanAyah}–{t.totAyah}
                        </Text>
                        <Muted>
                          Week {fmtDatum(t.weekStart)} · {t.type === "NIEUW" ? "Nieuw" : "Herhaling"}
                        </Muted>
                      </View>
                      <Button
                        small
                        title={busyTaak === t.id ? "..." : t.voltooid ? "✓" : "Afvinken"}
                        variant={t.voltooid ? "secondary" : "primary"}
                        onPress={() => toggleTaak(t)}
                        disabled={busyTaak === t.id}
                      />
                    </View>
                  ))}
                  {p.opmerkingen ? <KV k="Opmerkingen" v={p.opmerkingen} /> : null}
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
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  taakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  taakTitel: { fontSize: 14, color: colors.text, fontWeight: "500" },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
});
