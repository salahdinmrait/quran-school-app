import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { api, ApiError } from "../lib/api";
import { bevestig } from "../lib/confirm";
import { pickBijlage, openAttachment, GekozenBijlage } from "../lib/bijlage";
import { colors, fonts, radius, STATUS_COLORS, STATUS_LABELS } from "../lib/theme";
import { fmtDatum } from "../lib/format";
import { Button, Card, Input, Muted } from "./ui";
import { DateField, TimeField } from "./DateField";
import { LinkText } from "./LinkText";

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
}

interface LesHuiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  deadline: string | null;
  hasBijlage: boolean;
  vak: { id: string; naam: string };
  inleveringen: { id: string }[];
}

interface AanwezigheidRecord {
  status: string;
  leerling: { id: string; name: string };
}

// Detailscherm van één les: huiswerk bekijken/toevoegen, aanwezigheid
// registreren, lesgegevens wijzigen en — als laatste stap — de les verwijderen.
// Huiswerk en aanwezigheid lopen via de docent-API's; een beheerder ziet
// daarom alleen de lesgegevens.
export function LesDetail({
  les,
  rol,
  onSluiten,
  onGewijzigd,
}: {
  les: Les;
  rol: "ADMIN" | "DOCENT";
  onSluiten: () => void;
  onGewijzigd: () => void | Promise<void>;
}) {
  const router = useRouter();
  const isDocent = rol === "DOCENT";
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

  const [huiswerk, setHuiswerk] = useState<LesHuiswerk[]>([]);
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
      setError(e instanceof ApiError ? e.message : "Aanwezigheid opslaan mislukt");
    }
  }

  async function kiesBijlage() {
    setError(null);
    const { bijlage, error: e } = await pickBijlage();
    if (e) setError(e);
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
        body.bijlageData = nieuweBijlage.data;
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
      setError(e instanceof ApiError ? e.message : "Opslaan mislukt");
    } finally {
      setOpslaan(false);
    }
  }

  function verwijderLes() {
    bevestig(
      "Les verwijderen",
      `${les.klas.naam} op ${fmtDatum(les.datum)} definitief verwijderen? De aanwezigheidsregistratie van deze les verdwijnt mee. Huiswerk blijft bestaan, maar is niet langer aan deze les gekoppeld.`,
      async () => {
        try {
          await api(`/api/lessen/${les.id}`, { method: "DELETE" });
          onSluiten();
          await onGewijzigd();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Verwijderen mislukt");
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
      <View style={styles.kop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titel}>
            {les.klas.naam}
            {les.vak ? ` · ${les.vak.naam}` : ""}
          </Text>
          <Muted>
            {fmtDatum(les.datum)} · {les.begintijd}–{les.eindtijd}
            {les.lokaal ? ` · ${les.lokaal}` : ""}
          </Muted>
        </View>
        <Button title="Sluiten" variant="secondary" small onPress={onSluiten} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {isDocent && (
        <>
          <Text style={styles.sectie}>Huiswerk bij deze les</Text>
          <Card>
            {huiswerk.length === 0 ? (
              <Muted>Nog geen huiswerk aan deze les gekoppeld.</Muted>
            ) : (
              huiswerk.map((h) => (
                <View key={h.id} style={styles.hwRij}>
                  <Text style={styles.hwTitel}>{h.titel}</Text>
                  <Muted>
                    {h.vak.naam}
                    {h.deadline ? ` · deadline ${fmtDatum(h.deadline)}` : ""}
                    {` · ${h.inleveringen.length} ingeleverd`}
                  </Muted>
                  {h.beschrijving ? (
                    <LinkText style={styles.hwTekst}>{h.beschrijving}</LinkText>
                  ) : null}
                  {h.hasBijlage ? (
                    <Text style={styles.link} onPress={() => openAttachment("huiswerk", h.id)}>
                      📎 Bijlage openen
                    </Text>
                  ) : null}
                </View>
              ))
            )}
            <Button
              title="+ Huiswerk voor deze les"
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
          </Card>

          <Text style={styles.sectie}>Aanwezigheid</Text>
          {leerlingen.length === 0 ? (
            <Card>
              <Muted>Deze klas heeft nog geen leerlingen.</Muted>
            </Card>
          ) : (
            leerlingen.map(({ leerling }) => {
              const huidig = aanwezigheid[leerling.id];
              return (
                <Card key={leerling.id}>
                  <Text style={styles.leerling}>{leerling.name}</Text>
                  <View style={styles.statusRij}>
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
                            {STATUS_LABELS[s]}
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

      <Text style={styles.sectie}>Lesgegevens</Text>
      <Card>
        <DateField label="Datum" value={datum} onChange={setDatum} />
        <TimeField label="Begintijd" value={begintijd} onChange={setBegintijd} />
        <TimeField label="Eindtijd" value={eindtijd} onChange={setEindtijd} />
        <Input label="Lokaal" value={lokaal} onChangeText={setLokaal} placeholder="Lokaal 2" />
        <Input
          label="Omschrijving / opmerking"
          value={beschrijving}
          onChangeText={setBeschrijving}
          multiline
          placeholder="bijv. Neem soera Al-Mulk door"
        />

        <Text style={styles.velLabel}>Bestand</Text>
        {nieuweBijlage ? (
          <View style={styles.bijlageRij}>
            <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {nieuweBijlage.naam}</Text>
            <Button small title="Ongedaan maken" variant="ghost" onPress={() => setNieuweBijlage(null)} />
          </View>
        ) : heeftBijlage ? (
          <View style={styles.bijlageRij}>
            <Text style={styles.bijlageNaam} numberOfLines={1}>
              📎 {les.bijlageNaam ?? "Lesbijlage"}
            </Text>
            <Button small title="Openen" variant="ghost" onPress={() => openAttachment("les", les.id)} />
            <Button small title="Weghalen" variant="ghost" onPress={() => setBijlageWeg(true)} />
          </View>
        ) : (
          <View style={styles.bijlageRij}>
            {bijlageWeg ? (
              <>
                <Muted>Bijlage wordt weggehaald bij opslaan.</Muted>
                <Button small title="Toch houden" variant="ghost" onPress={() => setBijlageWeg(false)} />
              </>
            ) : (
              <Button small title="Bestand bijvoegen (max 4 MB)" variant="secondary" onPress={kiesBijlage} />
            )}
          </View>
        )}

        {opgeslagen && <Text style={styles.gelukt}>Wijzigingen opgeslagen.</Text>}
        <Button title="Wijzigingen opslaan" onPress={bewaar} loading={opslaan} disabled={!datum || !begintijd || !eindtijd} />
      </Card>

      <View style={styles.gevaar}>
        <View style={styles.gevaarKop}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={styles.gevaarTitel}>Les verwijderen</Text>
        </View>
        <Muted>Dit kan niet ongedaan worden gemaakt.</Muted>
        <Button title="Les verwijderen" variant="danger" onPress={verwijderLes} />
      </View>
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
  hwTitel: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
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
