import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { api, ApiError } from "../../lib/api";
import { Loading, ErrorView, Card, Muted, Button, Input, ChipSelect } from "../../components/ui";
import { Agenda, AgendaEvent, huiswerkBadge } from "../../components/Agenda";
import { DateField, TimeField } from "../../components/DateField";
import { LesDetail, type Les } from "../../components/LesDetail";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import type { DocentKlas } from "./klassen";

export default function DocentRooster() {
  const { t, isRTL } = useT();
  const ls = useFetch<Les[]>("/api/docent/lessen");
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [gekozenLesId, setGekozenLesId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [klasId, setKlasId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [datum, setDatum] = useState("");
  const [begintijd, setBegintijd] = useState("");
  const [eindtijd, setEindtijd] = useState("");
  const [lokaal, setLokaal] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [herhalenTot, setHerhalenTot] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ls.loading || kl.loading) return <Loading />;
  if (ls.error) return <ErrorView message={ls.error} onRetry={ls.reload} />;

  const lessen = ls.data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;
  // Uit de lijst halen (niet apart bewaren) zodat het detail meteen de nieuwe
  // gegevens toont nadat de lessen opnieuw zijn opgehaald.
  const gekozenLes = lessen.find((l) => l.id === gekozenLesId) ?? null;

  async function kies() {
    setError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setError(t(fout));
    else if (b) setBijlage(b);
  }

  async function handleSubmit() {
    if (!klasId || !datum || !begintijd || !eindtijd) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/lessen", {
        method: "POST",
        body: JSON.stringify({
          klasId, vakId: vakId || null, datum, begintijd, eindtijd,
          lokaal: lokaal || null,
          beschrijving: beschrijving || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
          ...(herhalenTot ? { herhalen: { totDatum: herhalenTot } } : {}),
        }),
      });
      setShowForm(false);
      setDatum(""); setBegintijd(""); setEindtijd(""); setLokaal(""); setBeschrijving(""); setHerhalenTot(""); setBijlage(null);
      await ls.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("dr_les_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  const events: AgendaEvent[] = lessen.map((l) => ({
    id: l.id,
    datum: l.datum,
    begintijd: l.begintijd,
    eindtijd: l.eindtijd,
    titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
    subtitel: l.lokaal || undefined,
    badges: huiswerkBadge(l.huiswerkAantal, t("c_hw_label")),
    onPress: () => setGekozenLesId(l.id),
    extra: (
      <View>
        {l.beschrijving ? (
          <LinkText style={[styles.beschrijving, { textAlign: textStart(isRTL) }]}>{l.beschrijving}</LinkText>
        ) : null}
        {l.hasBijlage ? (
          <Text style={[styles.bijlage, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("les", l.id)}>
            📎 {t("ld_lesbijlage")}
          </Text>
        ) : null}
      </View>
    ),
  }));

  if (gekozenLes) {
    return (
      <View style={styles.container}>
        <LesDetail
          les={gekozenLes}
          rol="DOCENT"
          onSluiten={() => setGekozenLesId(null)}
          onGewijzigd={ls.reload}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { flexDirection: row(isRTL) }]}>
        <Button
          title={showForm ? t("c_sluiten") : t("dr_les_inplannen")}
          variant={showForm ? "secondary" : "primary"}
          small
          onPress={() => setShowForm(!showForm)}
        />
        <Muted>{t("lr_tik_les")}</Muted>
      </View>

      {showForm ? (
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Card>
            <ChipSelect
              label={t("dr_klas_verplicht")}
              options={klassen.map((k) => ({ value: k.id, label: k.naam }))}
              value={klasId}
              onChange={(v) => { setKlasId(v); setVakId(null); }}
            />
            {klas && klas.vakken.length > 0 && (
              <ChipSelect
                label={t("c_vak_optioneel")}
                options={[{ value: "", label: t("c_geen") }, ...klas.vakken.map((v) => ({ value: v.id, label: v.naam }))]}
                value={vakId ?? ""}
                onChange={(v) => setVakId(v || null)}
              />
            )}
            <DateField label={t("dr_datum_verplicht")} value={datum} onChange={setDatum} />
            <TimeField label={t("dr_begintijd_verplicht")} value={begintijd} onChange={setBegintijd} />
            <TimeField label={t("dr_eindtijd_verplicht")} value={eindtijd} onChange={setEindtijd} />
            <Input label={t("c_lokaal")} value={lokaal} onChangeText={setLokaal} placeholder={t("c_lokaal2")} />
            <Input
              label={t("c_omschrijving_opmerking")}
              value={beschrijving}
              onChangeText={setBeschrijving}
              multiline
              placeholder={t("ld_omschrijving_ph")}
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
                <Button small title={t("c_bestand_bijvoegen_max")} variant="secondary" onPress={kies} />
              )}
            </View>
            <DateField label={t("dr_herhalen")} value={herhalenTot} onChange={setHerhalenTot} minimumDate={datum ? new Date(datum) : undefined} />
            {error && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{error}</Text>}
            <Button
              title={herhalenTot ? t("dr_herhalende_aanmaken") : t("dr_les_aanmaken")}
              onPress={handleSubmit}
              loading={saving}
              disabled={!klasId || !datum || !begintijd || !eindtijd}
            />
          </Card>
        </ScrollView>
      ) : (
        <View style={styles.agendaWrap}>
          <Agenda events={events} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerRow: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  formScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  agendaWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  beschrijving: { fontSize: 13, color: colors.text, marginTop: 6 },
  bijlage: { color: colors.info, fontSize: 13, textDecorationLine: "underline", marginTop: 6 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});
