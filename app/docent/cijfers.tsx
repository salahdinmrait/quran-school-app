import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { bevestig } from "../../lib/confirm";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, ChipSelect } from "../../components/ui";
import { PersonPicker } from "../../components/PersonPicker";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum } from "../../lib/format";
import type { DocentKlas } from "./klassen";

interface Cijfer {
  id: string;
  waarde: number;
  omschrijving: string | null;
  opmerking: string | null;
  hasBijlage: boolean;
  datum: string;
  leerling: { id: string; name: string };
  vak: { id: string; naam: string };
}

export default function DocentCijfers() {
  const { t, isRTL } = useT();
  const cf = useFetch<Cijfer[]>("/api/docent/cijfers");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [showForm, setShowForm] = useState(false);
  const [klasId, setKlasId] = useState<string | null>(null);
  const [leerlingIds, setLeerlingIds] = useState<string[]>([]);
  const [vakId, setVakId] = useState<string | null>(null);
  const [waarde, setWaarde] = useState("");
  const [omschrijving, setOmschrijving] = useState("");
  const [opmerking, setOpmerking] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cf.loading || kl.loading) return <Loading />;
  if (cf.error) return <ErrorView message={cf.error} onRetry={cf.reload} />;

  const cijfers = cf.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function kies() {
    setError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setError(t(fout));
    else if (b) setBijlage(b);
  }

  function confirmDelete(c: Cijfer) {
    bevestig(t("dc_verwijderen_titel"), t("dc_verwijderen_vraag", { waarde: c.waarde.toFixed(1), naam: c.leerling.name }), async () => {
      setError(null);
      try {
        await api(`/api/docent/cijfers/${c.id}`, { method: "DELETE" });
        await cf.reload();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t("c_verwijderen_mislukt"));
      }
    });
  }

  async function handleSubmit() {
    const leerlingId = leerlingIds[0];
    if (!leerlingId || !vakId || !waarde) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/docent/cijfers", {
        method: "POST",
        body: JSON.stringify({
          leerlingId, vakId, waarde,
          omschrijving: omschrijving || null,
          opmerking: opmerking || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      setWaarde(""); setOmschrijving(""); setOpmerking(""); setBijlage(null); setLeerlingIds([]);
      setShowForm(false);
      await cf.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("dc_opslaan_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={cf.refreshing} onRefresh={cf.refresh}>
      <Button
        title={showForm ? t("sm_form_sluiten") : t("dc_invoeren")}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm(!showForm)}
      />

      {showForm && (
        <Card>
          <ChipSelect
            label={t("c_klas")}
            options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
            value={klasId}
            onChange={(v) => { setKlasId(v); setLeerlingIds([]); setVakId(null); }}
          />
          {klas && (
            <>
              <PersonPicker
                label={t("c_leerling")}
                personen={klas.leerlingen}
                geselecteerd={leerlingIds}
                onChange={setLeerlingIds}
                multi={false}
                placeholder={t("dc_zoek_leerling")}
                leegTekst={t("dhn_geen_leerlingen")}
              />
              <ChipSelect label={t("c_vak")} options={klas.vakken.map((v) => ({ value: v.id, label: v.naam }))} value={vakId} onChange={setVakId} />
            </>
          )}
          <Input label={t("dc_cijfer_label")} value={waarde} onChangeText={setWaarde} keyboardType="numeric" placeholder="7.5" />
          <Input label={t("c_omschrijving")} value={omschrijving} onChangeText={setOmschrijving} placeholder={t("dc_omschrijving_ph")} />
          <Input
            label={t("dc_opmerking_label")}
            value={opmerking}
            onChangeText={setOpmerking}
            multiline
            placeholder={t("dc_opmerking_ph")}
          />
          <View style={[styles.bijlageRow, { flexDirection: row(isRTL) }]}>
            {bijlage ? (
              <>
                <Text style={[styles.bijlageNaam, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
                  📎 {bijlage.naam}
                </Text>
                <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => setBijlage(null)} />
              </>
            ) : (
              <Button small title={t("dc_bestand")} variant="secondary" onPress={kies} />
            )}
          </View>
          {error && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{error}</Text>}
          <Button title={t("c_opslaan")} onPress={handleSubmit} loading={saving} disabled={leerlingIds.length === 0 || !vakId || !waarde} />
        </Card>
      )}

      {cijfers.length === 0 ? (
        <Empty text={t("dc_geen")} />
      ) : (
        cijfers.map((c) => (
          <Card key={c.id}>
            <View style={[styles.row, { flexDirection: row(isRTL) }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{c.leerling.name}</Text>
                <Muted>
                  {c.vak.naam} · {fmtDatum(c.datum)}
                  {c.omschrijving ? ` · ${c.omschrijving}` : ""}
                </Muted>
                {c.opmerking ? (
                  <LinkText style={[styles.opmerking, { textAlign: textStart(isRTL) }]}>{c.opmerking}</LinkText>
                ) : null}
                {c.hasBijlage ? (
                  <Text style={[styles.bijlage, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("cijfer", c.id)}>
                    📎 {t("c_bijlage")}
                  </Text>
                ) : null}
              </View>
              <Badge
                text={c.waarde.toFixed(1)}
                bg={c.waarde >= 5.5 ? colors.successLight : colors.dangerLight}
                fg={c.waarde >= 5.5 ? colors.primaryDark : colors.danger}
              />
            </View>
            <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
              <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => confirmDelete(c)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  opmerking: { fontSize: 13, color: colors.info, marginTop: 4 },
  bijlage: { fontSize: 13, color: colors.info, textDecorationLine: "underline", marginTop: 4 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});
