import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { bevestig } from "../lib/confirm";
import { useFetch } from "../lib/useFetch";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/LanguageContext";
import { row, textStart } from "../lib/rtl";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input, SectionTitle } from "./ui";
import { LinkText } from "./LinkText";
import { colors, STATUS_COLORS } from "../lib/theme";
import { fmtDatumTijd, fmtDatumKort } from "../lib/format";

interface Notitie {
  id: string;
  titel: string | null;
  inhoud: string;
  createdAt: string;
  auteur: { id: string; name: string; role: string };
}

interface Vak {
  id: string;
  naam: string;
}

interface Klas {
  id: string;
  naam: string;
  vakken: Vak[];
  docenten: { id: string; name: string }[];
}

interface Les {
  id: string;
  status: string;
  lesId: string;
  datum: string;
  begintijd: string | null;
  eindtijd: string | null;
  lokaal: string | null;
  klasNaam: string | null;
  vakNaam: string | null;
}

interface Dossier {
  leerling: { id: string; name: string; email: string | null } | null;
  notities: Notitie[];
  klassen: Klas[];
  vakken: Vak[];
  aanwezigheid: {
    totaal: number;
    aanwezig: number;
    afwezig: number;
    teLaat: number;
    geoorloofd: number;
    percentage: number | null;
    perVak: { vakId: string | null; vakNaam: string; totaal: number; aanwezig: number; percentage: number | null }[];
    geschiedenis: Les[];
  };
}

// Hoeveel lessen er meteen zichtbaar zijn; de rest komt achter "toon alles"
// vandaan, zodat de notities niet onder een jaar aan lessen verdwijnen.
const EERSTE_LESSEN = 8;

// Gedeeld leerlingendossier — gebruikt door docent en admin. Notities blijven bij
// de leerling; latere docenten zien wat eerdere docenten schreven en kunnen aanvullen.
export function LeerlingDossierView({ leerlingId, leerlingNaam }: { leerlingId: string; leerlingNaam?: string }) {
  const { user } = useAuth();
  const { t, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Dossier>(
    `/api/leerling-dossier?leerlingId=${encodeURIComponent(leerlingId)}`
  );

  const [titel, setTitel] = useState("");
  const [inhoud, setInhoud] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [allesTonen, setAllesTonen] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const notities = data?.notities ?? [];
  const klassen = data?.klassen ?? [];
  const naam = data?.leerling?.name ?? leerlingNaam ?? t("c_leerling");

  const aanw = data?.aanwezigheid;
  const geschiedenis = aanw?.geschiedenis ?? [];
  const zichtbaar = allesTonen ? geschiedenis : geschiedenis.slice(0, EERSTE_LESSEN);

  async function toevoegen() {
    if (!inhoud.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      await api("/api/leerling-dossier", {
        method: "POST",
        body: JSON.stringify({ leerlingId, titel: titel.trim() || null, inhoud: inhoud.trim() }),
      });
      setTitel("");
      setInhoud("");
      await reload();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setSaving(false);
    }
  }

  function verwijder(n: Notitie) {
    bevestig(t("dos_verwijderen_titel"), t("dos_verwijderen_vraag"), async () => {
      try {
        await api(`/api/leerling-dossier?id=${n.id}`, { method: "DELETE" });
        await reload();
      } catch { /* noop */ }
    });
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text style={[styles.naam, { textAlign: textStart(isRTL) }]}>{naam}</Text>
      <Muted style={{ marginBottom: 12 }}>{t("dos_uitleg")}</Muted>

      {/* Klassen en vakken */}
      <SectionTitle>{t("dos_klassen_vakken")}</SectionTitle>
      {klassen.length === 0 ? (
        <Card><Muted>{t("dos_geen_klassen")}</Muted></Card>
      ) : (
        klassen.map((k) => (
          <Card key={k.id}>
            <Text style={[styles.titel, { textAlign: textStart(isRTL) }]}>{k.naam}</Text>
            {k.vakken.length > 0 && (
              <View style={[styles.chips, { flexDirection: row(isRTL) }]}>
                {k.vakken.map((v) => (
                  <Badge key={v.id} text={v.naam} />
                ))}
              </View>
            )}
            {k.docenten.length > 0 && (
              <Muted style={{ marginTop: 6 }}>{k.docenten.map((d) => d.name).join(", ")}</Muted>
            )}
          </Card>
        ))
      )}

      {/* Aanwezigheid over alle lessen bij elkaar */}
      <SectionTitle>{t("c_aanwezigheid")}</SectionTitle>
      {!aanw || aanw.totaal === 0 ? (
        <Card><Muted>{t("la_geen")}</Muted></Card>
      ) : (
        <>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{aanw.percentage}%</Text>
            <Muted>{t("la_aanwezig_over", { count: aanw.totaal })}</Muted>
            {/* De vier statussen apart, anders verdwijnt "te laat" en
                "geoorloofd" ongezien in dat ene percentage. */}
            <View style={[styles.tellingen, { flexDirection: row(isRTL) }]}>
              {([
                ["AANWEZIG", aanw.aanwezig],
                ["AFWEZIG", aanw.afwezig],
                ["TE_LAAT", aanw.teLaat],
                ["GEOORLOOFD", aanw.geoorloofd],
              ] as const).map(([status, n]) => {
                const c = STATUS_COLORS[status];
                return (
                  <View key={status} style={styles.telling}>
                    <Text style={[styles.tellingGetal, { color: c.fg }]}>{n}</Text>
                    <Text style={styles.tellingLabel} numberOfLines={1}>{label("status", status)}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {aanw.perVak.length > 1 && (
            <Card>
              <Text style={[styles.cardSub, { textAlign: textStart(isRTL) }]}>{t("c_per_vak")}</Text>
              {aanw.perVak.map((v) => (
                <View key={v.vakId ?? v.vakNaam} style={[styles.vakRow, { flexDirection: row(isRTL) }]}>
                  <Text style={styles.vakNaam}>{v.vakNaam}</Text>
                  <Badge
                    text={`${v.percentage}% · ${v.totaal}`}
                    bg={(v.percentage ?? 0) >= 80 ? colors.successLight : colors.warningLight}
                    fg={(v.percentage ?? 0) >= 80 ? colors.primaryDark : colors.warning}
                  />
                </View>
              ))}
            </Card>
          )}

          <SectionTitle>{t("dos_geschiedenis")}</SectionTitle>
          {zichtbaar.map((l) => {
            const c = STATUS_COLORS[l.status] ?? STATUS_COLORS.AANWEZIG;
            return (
              <Card key={l.id}>
                <View style={[styles.lesRow, { flexDirection: row(isRTL) }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.titel, { textAlign: textStart(isRTL) }]}>
                      {l.klasNaam ?? "—"}
                      {l.vakNaam ? ` · ${l.vakNaam}` : ""}
                    </Text>
                    <Muted>
                      {fmtDatumKort(l.datum)}
                      {l.begintijd ? ` · ${l.begintijd}–${l.eindtijd ?? ""}` : ""}
                      {l.lokaal ? ` · ${l.lokaal}` : ""}
                    </Muted>
                  </View>
                  <Badge text={label("status", l.status)} bg={c.bg} fg={c.fg} />
                </View>
              </Card>
            );
          })}
          {geschiedenis.length > EERSTE_LESSEN && (
            <Pressable onPress={() => setAllesTonen((v) => !v)} style={styles.meer}>
              <Text style={styles.meerTekst}>
                {allesTonen ? t("dos_toon_minder") : t("dos_toon_alles", { count: geschiedenis.length })}
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* Nieuwe notitie */}
      <SectionTitle>{t("c_dossier")}</SectionTitle>
      <Card>
        <Input label={t("dos_titel_optioneel")} value={titel} onChangeText={setTitel} placeholder={t("dos_titel_ph")} />
        <Input label={t("dos_notitie_verplicht")} value={inhoud} onChangeText={setInhoud} multiline placeholder={t("dos_notitie_ph")} />
        {formError && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{formError}</Text>}
        <Button title={t("dos_toevoegen")} onPress={toevoegen} loading={saving} disabled={!inhoud.trim()} />
      </Card>

      {notities.length === 0 ? (
        <Empty icon="document-text-outline" text={t("dos_geen")} />
      ) : (
        notities.map((n) => {
          const eigen = n.auteur.id === user?.id;
          return (
            <Card key={n.id}>
              {n.titel ? (
                <Text style={[styles.titel, { textAlign: textStart(isRTL) }]}>{n.titel}</Text>
              ) : null}
              <LinkText style={[styles.inhoud, { textAlign: textStart(isRTL) }]}>{n.inhoud}</LinkText>
              <View style={[styles.metaRow, { flexDirection: row(isRTL) }]}>
                <Muted>
                  {n.auteur.name} ({label("rol", n.auteur.role)}) · {fmtDatumTijd(n.createdAt)}
                </Muted>
                {(eigen || user?.role === "ADMIN") && (
                  <Text style={styles.verwijder} onPress={() => verwijder(n)}>
                    {t("c_verwijderen")}
                  </Text>
                )}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  naam: { fontSize: 22, fontWeight: "700", color: colors.text },
  titel: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
  inhoud: { fontSize: 14, color: colors.text },
  metaRow: { alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  verwijder: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  error: { color: colors.danger, marginBottom: 8 },
  chips: { flexWrap: "wrap", gap: 6, marginTop: 6 },
  statCard: { alignItems: "center", backgroundColor: colors.primaryLight, borderColor: colors.primary },
  statValue: { fontSize: 32, fontWeight: "800", color: colors.primaryDark },
  tellingen: { justifyContent: "space-between", alignSelf: "stretch", marginTop: 12, gap: 4 },
  telling: { flex: 1, alignItems: "center" },
  tellingGetal: { fontSize: 18, fontWeight: "700" },
  tellingLabel: { fontSize: 11, color: colors.textMuted },
  cardSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: 6 },
  vakRow: { alignItems: "center", justifyContent: "space-between", paddingVertical: 4, gap: 8 },
  vakNaam: { fontSize: 14, color: colors.text, fontWeight: "500", flexShrink: 1 },
  lesRow: { alignItems: "center", gap: 8 },
  meer: { paddingVertical: 10, alignItems: "center" },
  meerTekst: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
