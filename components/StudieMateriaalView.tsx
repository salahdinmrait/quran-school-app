import { useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { bevestig } from "../lib/confirm";
import { useFetch } from "../lib/useFetch";
import { useT } from "../lib/LanguageContext";
import { row, textStart } from "../lib/rtl";
import { api, ApiError } from "../lib/api";
import { Screen, Loading, ErrorView, Card, Muted, Empty, Button, Input, ChipSelect } from "./ui";
import { LinkText } from "./LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors } from "../lib/theme";
import { fmtDatum } from "../lib/format";

interface Materiaal {
  id: string;
  titel: string;
  beschrijving: string | null;
  linkUrl: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  docent: { id: string; name: string };
  klas: { id: string; naam: string } | null;
  vak: { id: string; naam: string } | null;
  createdAt: string;
}

interface DocentKlas {
  id: string;
  naam: string;
  vakken: { id: string; naam: string }[];
}

export function StudieMateriaalView({ canManage }: { canManage: boolean }) {
  const { t, isRTL } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Materiaal[]>("/api/studiemateriaal");
  const kl = useFetch<DocentKlas[]>(canManage ? "/api/docent/klassen" : null);

  const [showForm, setShowForm] = useState(false);
  const [titel, setTitel] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [klasId, setKlasId] = useState<string | null>(null);
  const [vakId, setVakId] = useState<string | null>(null);
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const materialen = data ?? [];
  const klassen = kl.data ?? [];
  const klas = klassen.find((k) => k.id === klasId) ?? null;

  async function kies() {
    setFormError(null);
    const { bijlage: b, fout } = await pickBijlage();
    if (fout) setFormError(t(fout));
    else if (b) setBijlage(b);
  }

  async function handleCreate() {
    if (!titel) return;
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/studiemateriaal", {
        method: "POST",
        body: JSON.stringify({
          titel,
          beschrijving: beschrijving || null,
          linkUrl: linkUrl || null,
          klasId: klasId || null,
          vakId: vakId || null,
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageUrl: bijlage.url, bijlageType: bijlage.type } : {}),
        }),
      });
      setTitel(""); setBeschrijving(""); setLinkUrl(""); setKlasId(null); setVakId(null); setBijlage(null);
      setShowForm(false);
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(m: Materiaal) {
    bevestig(t("c_verwijderen"), t("sm_verwijder_vraag", { titel: m.titel }), async () => {
      try {
        await api(`/api/studiemateriaal?id=${m.id}`, { method: "DELETE" });
        await reload();
      } catch { /* noop */ }
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {canManage && (
        <Button
          title={showForm ? t("sm_form_sluiten") : t("sm_nieuw")}
          variant={showForm ? "secondary" : "primary"}
          onPress={() => setShowForm(!showForm)}
        />
      )}

      {canManage && showForm && (
        <Card>
          <Input label={t("sm_titel_verplicht")} value={titel} onChangeText={setTitel} placeholder={t("sm_titel_ph")} />
          <Input label={t("c_beschrijving")} value={beschrijving} onChangeText={setBeschrijving} multiline />
          <Input label={t("sm_link")} value={linkUrl} onChangeText={setLinkUrl} placeholder="https://..." autoCapitalize="none" />
          {klassen.length > 0 && (
            <ChipSelect
              label={t("c_klas_optioneel")}
              options={[{ value: "", label: t("c_alle") }, ...klassen.map((k) => ({ value: k.id, label: k.naam }))]}
              value={klasId ?? ""}
              onChange={(v) => { setKlasId(v || null); setVakId(null); }}
            />
          )}
          {klas && klas.vakken.length > 0 && (
            <ChipSelect
              label={t("c_vak_optioneel")}
              options={[{ value: "", label: t("c_alle") }, ...klas.vakken.map((v) => ({ value: v.id, label: v.naam }))]}
              value={vakId ?? ""}
              onChange={(v) => setVakId(v || null)}
            />
          )}
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
          {formError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{formError}</Text>}
          <Button title={t("c_opslaan")} onPress={handleCreate} loading={saving} disabled={!titel} />
        </Card>
      )}

      {materialen.length === 0 ? (
        <Empty icon="folder-open-outline" text={t("sm_geen")} />
      ) : (
        materialen.map((m) => (
          <Card key={m.id}>
            <Text style={[styles.title, { textAlign: textStart(isRTL) }]}>{m.titel}</Text>
            <Muted>
              {[m.klas?.naam, m.vak?.naam, m.docent.name, fmtDatum(m.createdAt)].filter(Boolean).join(" · ")}
            </Muted>
            {m.beschrijving ? (
              <LinkText style={[styles.beschrijving, { textAlign: textStart(isRTL) }]}>{m.beschrijving}</LinkText>
            ) : null}
            {m.linkUrl ? (
              <Text style={[styles.link, { textAlign: textStart(isRTL) }]} onPress={() => Linking.openURL(m.linkUrl!)}>
                🔗 {m.linkUrl}
              </Text>
            ) : null}
            {m.hasBijlage ? (
              <Text style={[styles.link, { textAlign: textStart(isRTL) }]} onPress={() => openAttachment("studiemateriaal", m.id)}>
                📎 {m.bijlageNaam ?? t("c_bijlage_openen")}
              </Text>
            ) : null}
            {canManage && (
              <View style={{ marginTop: 6 }}>
                <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => confirmDelete(m)} />
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  beschrijving: { fontSize: 14, color: colors.text, marginTop: 6 },
  link: { color: colors.info, fontSize: 14, textDecorationLine: "underline", marginTop: 6 },
  bijlageRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  error: { color: colors.danger, marginBottom: 8 },
});
