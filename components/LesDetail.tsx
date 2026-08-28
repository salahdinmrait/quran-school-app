import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api, ApiError } from "../lib/api";
import { bevestig } from "../lib/confirm";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors, fonts, radius, STATUS_COLORS } from "../lib/theme";
import { fmtDatum } from "../lib/format";
import { Button, Card, Input, KV, Muted } from "./ui";
import { DateField, TimeField } from "./DateField";
import { LinkText } from "./LinkText";
import { useT } from "../lib/LanguageContext";
import { row, textStart } from "../lib/rtl";

const STATUSES = ["AANWEZIG", "TE_LAAT", "GEOORLOOFD", "AFWEZIG"] as const;

export interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  beschrijving: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
  huiswerkAantal: number;
  klas: {
    id: string;
    naam: string;
    leerlingen?: { leerling: { id: string; name: string } }[];
  };
  vak: { id: string; naam: string } | null;
  /** Alleen gevuld in de leerlingweergave; de docent ziet zijn eigen naam niet. */
  docenten?: { id: string; name: string }[];
}

export interface LesHuiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  hasBijlage: boolean;
  vak: { id: string; naam: string };
  // Eén rij per leerling die de docent heeft afgevinkt.
  inleveringen: { id: string }[];
}

interface AanwezigheidRecord {
  status: string;
  leerling: { id: string; name: string };
}

// Detailscherm van één les: huiswerk bekijken/toevoegen/verwijderen,
// aanwezigheid registreren, lesgegevens wijzigen en — als laatste stap — de les
// verwijderen. Huiswerk en aanwezigheid lopen via de docent-API's; een
// beheerder ziet daarom alleen de lesgegevens.
//
// Een leerling opent hetzelfde scherm vanuit zijn rooster, maar dan
// alleen-lezen: lesgegevens en het huiswerk van deze les, zonder
// aanwezigheidsknoppen en zonder gevarenzone. Het huiswerk komt dan mee uit de
// roosterlijst (`huiswerkVooraf`), want de docent-API is voor een leerling
// terecht afgesloten.
export function LesDetail({
  les,
  rol,
  huiswerkVooraf,
  onSluiten,
  onGewijzigd,
}: {
  les: Les;
  rol: "ADMIN" | "DOCENT" | "LEERLING";
  huiswerkVooraf?: LesHuiswerk[];
  onSluiten: () => void;
  onGewijzigd: () => void | Promise<void>;
}) {
  const router = useRouter();
  const { t, isRTL } = useT();
  const isDocent = rol === "DOCENT";
  const isLeerling = rol === "LEERLING";
  const leerlingen = les.klas.leerlingen ?? [];

  const [datum, setDatum] = useState(les.datum.slice(0, 10));
  const [begintijd, setBegintijd] = useState(les.begintijd);
  const [eindtijd, setEindtijd] = useState(les.eindtijd);
  const [lokaal, setLokaal] = useState(les.lokaal ?? "");
  const [beschrijving, setBeschrijving] = useState(les.beschrijving ?? "");
  const [nieuweBijlage, setNieuweBijlage] = useState<GekozenBijlage | null>(null);
  const [bijlageWeg, setBijlageWeg] = useState(false);
  const [opslaan, setOpslaan] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [huiswerk, setHuiswerk] = useState<LesHuiswerk[]>(huiswerkVooraf ?? []);
  const [aanwezigheid, setAanwezigheid] = useState<Record<string, string>>({});

  // Huiswerk opnieuw ophalen zodra dit scherm weer op de voorgrond staat —
  // de docent komt hier terug ná het aanmaken van huiswerk voor deze les.
  const laadHuiswerk = useCallback(async () => {
    if (!isDocent) return;
    try {
      setHuiswerk(await api<LesHuiswerk[]>(`/api/docent/huiswerk?lesId=${les.id}`));
    } catch {
      /* huiswerk is bijzaak; de rest van het scherm blijft bruikbaar */
    }
  }, [isDocent, les.id]);

  useFocusEffect(
    useCallback(() => {
      laadHuiswerk();
    }, [laadHuiswerk])
  );

  useEffect(() => {
    if (!isDocent) return;
    let actueel = true;
    (async () => {
      try {
        const data = await api<AanwezigheidRecord[]>(`/api/docent/absentie?lesId=${les.id}`);
        if (!actueel) return;
        const map: Record<string, string> = {};
        for (const r of data) map[r.leerling.id] = r.status;
        setAanwezigheid(map);
      } catch {
        /* laat de knoppen leeg; registreren werkt alsnog */
      }
    })();
    return () => {
      actueel = false;
    };
  }, [isDocent, les.id]);

  async function zetStatus(leerlingId: string, status: string) {
    const vorige = aanwezigheid[leerlingId];
    setAanwezigheid((r) => ({ ...r, [leerlingId]: status }));
    try {
      await api("/api/docent/absentie", {
        method: "POST",
        body: JSON.stringify({ lesId: les.id, leerlingId, status }),
      });
    } catch (e) {
      setAanwezigheid((r) => ({ ...r, [leerlingId]: vorige }));
      setError(e instanceof ApiError ? e.message : t("ld_aanwezigheid_mislukt"));
    }
  }

  // Huiswerk verwijderen kan alleen hier, bij de les waar het bij hoort. De
  // API ruimt de doelgroep en de aftekeningen mee op, zodat er niets
  // achterblijft en de leerling het meteen niet meer ziet.
  function verwijderHuiswerk(hw: LesHuiswerk) {
    bevestig(
      t("ld_hw_verwijderen_titel"),
      t("ld_hw_verwijderen_vraag", { titel: hw.titel }),
      async () => {
        const vorige = huiswerk;
        setHuiswerk((h) => h.filter((x) => x.id !== hw.id));
        try {
          await api(`/api/docent/huiswerk/${hw.id}`, { method: "DELETE" });
          await onGewijzigd();
        } catch (e) {
          setHuiswerk(vorige);
          setError(e instanceof ApiError ? e.message : t("c_verwijderen_mislukt"));
        }
      }
    );
  }

  async function kiesBijlage() {
    setError(null);
    const { bijlage, fout } = await pickBijlage();
    if (fout) setError(t(fout));
    else if (bijlage) {
      setNieuweBijlage(bijlage);
      setBijlageWeg(false);
    }
  }

  async function bewaar() {
    setOpslaan(true);
    setError(null);
    setOpgeslagen(false);
    try {
      const body: Record<string, unknown> = {
        datum,
        begintijd,
        eindtijd,
        lokaal: lokaal || null,
        beschrijving: beschrijving || null,
      };
      if (nieuweBijlage) {
        body.bijlageNaam = nieuweBijlage.naam;
        body.bijlageUrl = nieuweBijlage.url;
        body.bijlageType = nieuweBijlage.type;
      } else if (bijlageWeg) {
        body.bijlageNaam = null;
      }
      await api(`/api/lessen/${les.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setNieuweBijlage(null);
      setBijlageWeg(false);
      setOpgeslagen(true);
      await onGewijzigd();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("c_opslaan_mislukt"));
    } finally {
      setOpslaan(false);
    }
  }

  function verwijderLes() {
    bevestig(
      t("ld_les_verwijderen"),
      t("ld_les_verwijderen_vraag", { klas: les.klas.naam, datum: fmtDatum(les.datum) }),
      async () => {
        try {
          await api(`/api/lessen/${les.id}`, { method: "DELETE" });
          onSluiten();
          await onGewijzigd();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : t("c_verwijderen_mislukt"));
        }
      }
    );
  }

  const heeftBijlage = les.hasBijlage && !bijlageWeg;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.kop, { flexDirection: row(isRTL) }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.titel, { textAlign: textStart(isRTL) }]}>
            {les.klas.naam}
            {les.vak ? ` · ${les.vak.naam}` : ""}
          </Text>
          <Muted>
            {fmtDatum(les.datum)} · {les.begintijd}–{les.eindtijd}
            {les.lokaal ? ` · ${les.lokaal}` : ""}
          </Muted>
          {les.docenten && les.docenten.length > 0 ? (
            <Muted>{les.docenten.map((d) => d.name).join(", ")}</Muted>
          ) : null}
        </View>
        <Button title={t("c_sluiten")} variant="secondary" small onPress={onSluiten} />
      </View>

      {error && <Text style={[styles.error, { textAlign: textStart(isRTL) }]}>{error}</Text>}

      {(isDocent || isLeerling) && (
        <>
          <Text style={[styles.sectie, { textAlign: textStart(isRTL) }]}>{t("ld_huiswerk_bij_les")}</Text>
          <Card>
            {huiswerk.length === 0 ? (
              <Muted>
                {isLeerling ? t("ld_geen_huiswerk_leerling") : t("ld_geen_huiswerk_docent")}
              </Muted>
            ) : (
              huiswerk.map((h) => (
                <View key={h.id} style={styles.hwRij}>
                  <View style={[styles.hwKop, { flexDirection: row(isRTL) }]}>
                    <Text style={[styles.hwTitel, { textAlign: textStart(isRTL) }]}>{h.titel}</Text>
                    {isDocent && (
                      <Button small title={t("c_verwijderen")} variant="ghost" onPress={() => verwijderHuiswerk(h)} />
                    )}
                  </View>
                  <Muted>
                    {h.vak.naam}
                    {isDocent
                      ? ` · ${t("ld_n_afgevinkt", { count: h.inleveringen.length })}`
                      : h.inleveringen.length > 0
                      ? ` · ${t("ld_afgevinkt_door_docent")}`
                      : ""}
                  </Muted>
                  {h.beschrijving ? (
                    <LinkText style={styles.hwTekst}>{h.beschrijving}</LinkText>
                  ) : null}
                  {h.hasBijlage ? (
                    <Text
                      style={[styles.link, { textAlign: textStart(isRTL) }]}
                      onPress={() => openAttachment("huiswerk", h.id)}
                    >
                      📎 {t("c_bijlage_openen")}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
            {isDocent && (
              <Button
                title={t("ld_hw_toevoegen")}
                variant="secondary"
                small
                onPress={() =>
                  router.push({
                    pathname: "/docent/huiswerk-nieuw",
                    params: {
                      lesId: les.id,
                      klasId: les.klas.id,
                      ...(les.vak ? { vakId: les.vak.id } : {}),
                    },
                  })
                }
              />
            )}
          </Card>
        </>
      )}

      {isDocent && (
        <>
          <Text style={[styles.sectie, { textAlign: textStart(isRTL) }]}>{t("c_aanwezigheid")}</Text>
          {leerlingen.length === 0 ? (
            <Card>
              <Muted>{t("ld_geen_leerlingen")}</Muted>
            </Card>
          ) : (
            leerlingen.map(({ leerling }) => {
              const huidig = aanwezigheid[leerling.id];
              return (
                <Card key={leerling.id}>
                  <Text style={[styles.leerling, { textAlign: textStart(isRTL) }]}>{leerling.name}</Text>
                  <View style={[styles.statusRij, { flexDirection: row(isRTL) }]}>
                    {STATUSES.map((s) => {
                      const actief = huidig === s;
                      const c = STATUS_COLORS[s];
                      return (
                        <Pressable
                          key={s}
                          onPress={() => zetStatus(leerling.id, s)}
                          style={[styles.statusChip, actief && { backgroundColor: c.bg, borderColor: c.fg }]}
                        >
                          <Text style={[styles.statusTekst, actief && { color: c.fg, fontFamily: fonts.displayMedium }]}>
                            {t(`status_${s}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}

      {isLeerling ? (
        <>
          <Text style={[styles.sectie, { textAlign: textStart(isRTL) }]}>{t("ld_lesgegevens")}</Text>
          <Card>
            <KV k={t("c_vak")} v={les.vak?.naam ?? "—"} />
            <KV k={t("c_docent")} v={les.docenten?.map((d) => d.name).join(", ") || "—"} />
            <KV k={t("c_datum")} v={fmtDatum(les.datum)} />
            <KV k={t("c_begintijd")} v={les.begintijd} />
            <KV k={t("c_eindtijd")} v={les.eindtijd} />
            {les.lokaal ? <KV k={t("c_lokaal")} v={les.lokaal} /> : null}
            {les.beschrijving ? <LinkText style={styles.hwTekst}>{les.beschrijving}</LinkText> : null}
            {les.hasBijlage ? (
              <Text
                style={[styles.link, { textAlign: textStart(isRTL) }]}
                onPress={() => openAttachment("les", les.id)}
              >
                📎 {t("ld_openen_naam", { naam: les.bijlageNaam ?? t("ld_lesbijlage") })}
              </Text>
            ) : null}
          </Card>
        </>
      ) : (
        <>
      <Text style={[styles.sectie, { textAlign: textStart(isRTL) }]}>{t("ld_lesgegevens")}</Text>
      <Card>
        <DateField label={t("c_datum")} value={datum} onChange={setDatum} />
        <TimeField label={t("c_begintijd")} value={begintijd} onChange={setBegintijd} />
        <TimeField label={t("c_eindtijd")} value={eindtijd} onChange={setEindtijd} />
        <Input label={t("c_lokaal")} value={lokaal} onChangeText={setLokaal} placeholder={t("c_lokaal2")} />
        <Input
          label={t("c_omschrijving_opmerking")}
          value={beschrijving}
          onChangeText={setBeschrijving}
          multiline
          placeholder={t("ld_omschrijving_ph")}
        />

        <Text style={[styles.velLabel, { textAlign: textStart(isRTL) }]}>{t("c_bestand")}</Text>
        {nieuweBijlage ? (
          <View style={[styles.bijlageRij, { flexDirection: row(isRTL) }]}>
            <Text style={[styles.bijlageNaam, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
              📎 {nieuweBijlage.naam}
            </Text>
            <Button small title={t("ld_ongedaan_maken")} variant="ghost" onPress={() => setNieuweBijlage(null)} />
          </View>
        ) : heeftBijlage ? (
          <View style={[styles.bijlageRij, { flexDirection: row(isRTL) }]}>
            <Text style={[styles.bijlageNaam, { textAlign: textStart(isRTL) }]} numberOfLines={1}>
              📎 {les.bijlageNaam ?? t("ld_lesbijlage")}
            </Text>
            <Button small title={t("c_openen")} variant="ghost" onPress={() => openAttachment("les", les.id)} />
            <Button small title={t("ld_weghalen")} variant="ghost" onPress={() => setBijlageWeg(true)} />
          </View>
        ) : (
          <View style={[styles.bijlageRij, { flexDirection: row(isRTL) }]}>
            {bijlageWeg ? (
              <>
                <Muted>{t("ld_bijlage_weg")}</Muted>
                <Button small title={t("ld_toch_houden")} variant="ghost" onPress={() => setBijlageWeg(false)} />
              </>
            ) : (
              <Button small title={t("c_bestand_bijvoegen_max")} variant="secondary" onPress={kiesBijlage} />
            )}
          </View>
        )}

        {opgeslagen && (
          <Text style={[styles.gelukt, { textAlign: textStart(isRTL) }]}>{t("ld_wijzigingen_opgeslagen")}</Text>
        )}
        <Button title={t("ld_wijzigingen_opslaan")} onPress={bewaar} loading={opslaan} disabled={!datum || !begintijd || !eindtijd} />
      </Card>

      <View style={styles.gevaar}>
        <View style={[styles.gevaarKop, { flexDirection: row(isRTL) }]}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={styles.gevaarTitel}>{t("ld_les_verwijderen")}</Text>
        </View>
        <Muted>{t("c_niet_ongedaan")}</Muted>
        <Button title={t("ld_les_verwijderen")} variant="danger" onPress={verwijderLes} />
      </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  kop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 },
  titel: { fontSize: 17, fontFamily: fonts.display, color: colors.text },
  sectie: {
    fontSize: 12,
    fontFamily: fonts.displayMedium,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 8,
  },
  hwRij: { marginBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10 },
  hwKop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  hwTitel: { flex: 1, fontSize: 15, fontFamily: fonts.display, color: colors.text },
  hwTekst: { fontSize: 13, color: colors.text, marginTop: 4 },
  link: { color: colors.info, fontSize: 13, textDecorationLine: "underline", marginTop: 6 },
  leerling: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginBottom: 8 },
  statusRij: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: {
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.card,
  },
  statusTekst: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },
  velLabel: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.textMuted, marginBottom: 6 },
  bijlageRij: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text, fontFamily: fonts.body },
  gelukt: { color: colors.success, fontSize: 13, marginBottom: 4 },
  error: { color: colors.danger, marginBottom: 8 },
  gevaar: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    padding: 12,
    marginTop: 20,
  },
  gevaarKop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  gevaarTitel: { fontSize: 14, fontFamily: fonts.display, color: colors.danger },
});
