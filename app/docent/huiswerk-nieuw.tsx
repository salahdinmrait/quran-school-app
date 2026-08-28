import { useState } from "react";
import { Text, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFetch } from "../../lib/useFetch";
import { useT } from "../../lib/LanguageContext";
import { row, textStart } from "../../lib/rtl";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Button, Input, ChipSelect, Muted, Card } from "../../components/ui";
import { PersonPicker } from "../../components/PersonPicker";
import { pickBijlage, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import type { DocentKlas } from "./klassen";

type Doelgroep = "KLAS" | "LEERLINGEN";

// Huiswerk hoort altijd bij een les: de lesdatum bepaalt wanneer het aan de
// beurt is, dus er is geen aparte deadline en er valt hier geen les te kiezen.
// Het scherm wordt geopend vanuit het lesdetail in het rooster, dat de les, de
// klas en het vak meegeeft.
export default function DocentHuiswerkNieuw() {
  const router = useRouter();
  const { t, isRTL } = useT();
  const vooraf = useLocalSearchParams<{ lesId?: string; klasId?: string; vakId?: string }>();
  const kl = useFetch<DocentKlas[]>("/api/docent/klassen");

  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [vakId, setVakId] = useState<string | null>(vooraf.vakId ?? null);
  const [doelgroep, setDoelgroep] = useState<Doelgroep>("KLAS");
  const [leerlingIds, setLeerlingIds] = useState<string[]>([]);
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lesId = vooraf.lesId ?? null;

  // Zonder les is er niets om huiswerk aan te hangen. Dat kan gebeuren als
  // iemand het scherm rechtstreeks opent (bv. via een oude link op web).
  if (!lesId) {
    return (
      <Screen>
        <Card>
          <Text style={[styles.uitleg, { textAlign: textStart(isRTL) }]}>{t("dhn_uitleg")}</Text>
          <Button title={t("dhn_naar_rooster")} onPress={() => router.replace("/docent/rooster")} />
        </Card>
      </Screen>
    );
  }

  if (kl.loading) return <Loading />;
  if (kl.error) return <ErrorView message={kl.error} onRetry={kl.reload} />;

  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === vooraf.klasId) ?? null;
  const vakken = klas
    ? klas.vakken
    : Array.from(new Map(klassen.flatMap((k) => k.vakken).map((v) => [v.id, v])).values());
  const leerlingen = klas?.leerlingen ?? [];

  async function kies() {
    setError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setError(t(fout));
    else if (b) setBijlage(b);
  }

  async function handleSubmit() {
    if (!titel || !vakId) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/docent/huiswerk", {
        method: "POST",
        body: JSON.stringify({
          titel,
          beschrijving: beschrijving || null,
          vakId,
          lesId,
          // Een lege lijst betekent: voor de hele klas.
          ...(doelgroep === "LEERLINGEN" && leerlingIds.length > 0 ? { leerlingIds } : {}),
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageUrl: bijlage.url, bijlageType: bijlage.type } : {}),
        }),
      });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("dhn_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {klas && (
        <Muted style={{ marginBottom: 10 }}>{t("dhn_bij_les", { klas: klas.naam })}</Muted>
      )}

      <Input label={t("sm_titel_verplicht")} value={titel} onChangeText={setTitel} placeholder={t("dhn_titel_ph")} />
      <Input
        label={t("c_beschrijving")}
        value={beschrijving}
        onChangeText={setBeschrijving}
        multiline
        placeholder={t("dhn_besch_ph")}
      />

      <ChipSelect label={t("dhn_vak_verplicht")} options={vakken.map((v) => ({ value: v.id, label: v.naam }))} value={vakId} onChange={setVakId} />

      {leerlingen.length > 0 && (
        <View style={styles.box}>
          <ChipSelect<Doelgroep>
            label={t("dhn_doelgroep")}
            options={[
              { value: "KLAS", label: t("dhn_hele_klas") },
              { value: "LEERLINGEN", label: t("dhn_specifiek") },
            ]}
            value={doelgroep}
            onChange={(v) => { setDoelgroep(v ?? "KLAS"); setLeerlingIds([]); }}
          />
          {doelgroep === "LEERLINGEN" && (
            <PersonPicker
              personen={leerlingen}
              geselecteerd={leerlingIds}
              onChange={setLeerlingIds}
              placeholder={t("dhn_zoek_leerling")}
              leegTekst={t("dhn_geen_leerlingen")}
            />
          )}
        </View>
      )}

      <View style={styles.bijlageBox}>
        <Text style={[styles.bijlageLabel, { textAlign: textStart(isRTL) }]}>{t("dhn_bijlage_label")}</Text>
        {bijlage ? (
          <View style={[styles.bijlageRow, { flexDirection: row(isRTL) }]}>
            <Text style={[styles.bijlageNaam, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
              📎 {bijlage.naam}
            </Text>
            <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => setBijlage(null)} />
          </View>
        ) : (
          <Button small title={t("c_bestand_kiezen")} variant="secondary" onPress={kies} />
        )}
        <Muted style={{ marginTop: 4 }}>{t("dhn_video_hint")}</Muted>
      </View>

      {error && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{error}</Text>}

      <Button
        title={t("dhn_aanmaken")}
        onPress={handleSubmit}
        loading={saving}
        disabled={!titel || !vakId || (doelgroep === "LEERLINGEN" && leerlingIds.length === 0)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { marginBottom: 12 },
  uitleg: { fontSize: 14, color: colors.text, marginBottom: 12, lineHeight: 20 },
  bijlageBox: { marginBottom: 12 },
  bijlageLabel: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginBottom: 6 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});
