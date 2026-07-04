import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { api, ApiError } from "../../lib/api";
import { Screen, Loading, ErrorView, Card, Badge, Muted, Empty, Button, Input } from "../../components/ui";
import { LinkText } from "../../components/LinkText";
import { pickBijlage, openAttachment, GekozenBijlage } from "../../lib/bijlage";
import { colors } from "../../lib/theme";
import { fmtDatum, fmtDatumTijd, isVerlopen } from "../../lib/format";

interface Inlevering {
  id: string;
  inhoud: string;
  createdAt: string;
  opmerking: string | null;
  opmerkingOp: string | null;
  bijlageNaam: string | null;
  hasBijlage: boolean;
}

interface Huiswerk {
  id: string;
  titel: string;
  beschrijving: string | null;
  deadline: string | null;
  vak: { naam: string; categorie: string };
  bijlageNaam: string | null;
  hasBijlage: boolean;
  ingeLeverd: boolean;
  inlevering?: Inlevering;
}

interface KlasRanking {
  klasId: string;
  klasNaam: string;
  top3: { positie: number; leerling: { id: string; name: string }; percentage: number }[];
  totaalHw: number;
  eigenPositie: number | null;
  eigenPercentage: number;
}

export default function LeerlingHuiswerk() {
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Huiswerk[]>("/api/leerling/huiswerk");
  const rk = useFetch<KlasRanking[]>("/api/leerling/ranking");
  const [openId, setOpenId] = useState<string | null>(null);

  // Inlever-state voor het geopende item
  const [tekst, setTekst] = useState("");
  const [bijlage, setBijlage] = useState<GekozenBijlage | null>(null);
  const [busy, setBusy] = useState(false);
  const [inleverError, setInleverError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const rankings = (rk.data ?? []).filter((r) => r.totaalHw > 0);
  const open = (data ?? []).filter((h) => !h.ingeLeverd);
  const klaar = (data ?? []).filter((h) => h.ingeLeverd);

  function toggle(id: string) {
    setOpenId(openId === id ? null : id);
    setTekst("");
    setBijlage(null);
    setInleverError(null);
    setEditing(false);
  }

  async function kies() {
    setInleverError(null);
    const { bijlage: b, error: e } = await pickBijlage();
    if (e) setInleverError(e);
    else if (b) setBijlage(b);
  }

  async function inleveren(hw: Huiswerk) {
    if (!tekst.trim() && !bijlage) {
      setInleverError("Schrijf iets of voeg een bestand toe.");
      return;
    }
    setBusy(true);
    setInleverError(null);
    try {
      await api("/api/leerling/inlevering", {
        method: "POST",
        body: JSON.stringify({
          huiswerkId: hw.id,
          inhoud: tekst.trim(),
          ...(bijlage ? { bijlageNaam: bijlage.naam, bijlageData: bijlage.data, bijlageType: bijlage.type } : {}),
        }),
      });
      setTekst("");
      setBijlage(null);
      setEditing(false);
      await reload();
    } catch (e) {
      setInleverError(e instanceof ApiError ? e.message : "Inleveren mislukt");
    } finally {
      setBusy(false);
    }
  }

  function renderInleverForm(hw: Huiswerk) {
    return (
      <View style={styles.inleverForm}>
        <Input value={tekst} onChangeText={setTekst} placeholder="Typ je antwoord (optioneel)..." multiline />
        <View style={styles.bijlageRow}>
          {bijlage ? (
            <>
              <Text style={styles.bijlageNaam} numberOfLines={1}>📎 {bijlage.naam}</Text>
              <Button small title="Verwijderen" variant="ghost" onPress={() => setBijlage(null)} />
            </>
          ) : (
            <Button small title="Bestand kiezen (foto/pdf/audio)" variant="secondary" onPress={kies} />
          )}
        </View>
        {inleverError && <Text style={styles.error}>{inleverError}</Text>}
        <Button title="Inleveren" onPress={() => inleveren(hw)} loading={busy} disabled={!tekst.trim() && !bijlage} />
      </View>
    );
  }

  function renderItem(hw: Huiswerk) {
    const expanded = openId === hw.id;
    const verlopen = !hw.ingeLeverd && isVerlopen(hw.deadline);
    const inl = hw.inlevering;
    // "Afgerond" als de docent heeft afgevinkt met "✓"; anders is het een eigen inlevering ter beoordeling
    const eigenInlevering = inl && inl.inhoud !== "✓";
    return (
      <Card key={hw.id}>
        {/* Alleen de kop-rij toggle't — anders klapt de kaart op web dicht bij klikken in het inleverformulier */}
        <Pressable onPress={() => toggle(hw.id)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{hw.titel}</Text>
            <Muted>{hw.vak.naam} · deadline {fmtDatum(hw.deadline)}</Muted>
          </View>
          {hw.ingeLeverd ? (
            <Badge text="Ingeleverd ✓" />
          ) : verlopen ? (
            <Badge text="Verlopen" bg={colors.dangerLight} fg={colors.danger} />
          ) : (
            <Badge text="Open" bg={colors.warningLight} fg={colors.warning} />
          )}
        </Pressable>

        {expanded && (
          <View style={styles.detail}>
            {hw.beschrijving ? <LinkText style={styles.beschrijving}>{hw.beschrijving}</LinkText> : null}
            {hw.hasBijlage && (
              <Text style={styles.bijlageText} onPress={() => openAttachment("huiswerk", hw.id)}>📎 {hw.bijlageNaam ?? "Bijlage openen"}</Text>
            )}

            {/* Eigen inlevering tonen */}
            {eigenInlevering && inl && (
              <View style={styles.inleveringBox}>
                <Text style={styles.opmerkingLabel}>Jouw inlevering ({fmtDatumTijd(inl.createdAt)}):</Text>
                {inl.inhoud ? <Text style={styles.opmerkingText}>{inl.inhoud}</Text> : null}
                {inl.hasBijlage ? (
                  <Text style={styles.bijlageText} onPress={() => openAttachment("inlevering", inl.id)}>📎 {inl.bijlageNaam ?? "Jouw bestand"}</Text>
                ) : null}
              </View>
            )}

            {/* Docent-opmerking */}
            {inl?.opmerking ? (
              <View style={styles.opmerkingBox}>
                <Text style={styles.opmerkingLabel}>Opmerking van docent:</Text>
                <LinkText style={styles.opmerkingText}>{inl.opmerking}</LinkText>
              </View>
            ) : null}

            {/* Inleveren / wijzigen */}
            {!hw.ingeLeverd && renderInleverForm(hw)}
            {hw.ingeLeverd && eigenInlevering && (
              editing ? renderInleverForm(hw) : (
                <Button small title="Inlevering wijzigen" variant="secondary" onPress={() => { setEditing(true); setTekst(inl?.inhoud ?? ""); }} />
              )
            )}
            {hw.ingeLeverd && !eigenInlevering && (
              <Muted style={{ marginTop: 8 }}>Afgevinkt door de docent.</Muted>
            )}
          </View>
        )}
      </Card>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {rankings.map((r) => (
        <View key={r.klasId} style={styles.rankCard}>
          <Text style={styles.rankTitle}>Klassement {r.klasNaam}</Text>
          {r.top3.map((item) => (
            <View key={item.leerling.id} style={styles.rankRow}>
              <View style={[styles.rankNum, item.positie === 1 && styles.rankNumLead]}>
                <Text style={[styles.rankNumText, item.positie === 1 && styles.rankNumTextLead]}>{item.positie}</Text>
              </View>
              <Text style={styles.rankNaam}>{item.leerling.name}</Text>
              <Text style={styles.rankPct}>{item.percentage}%</Text>
            </View>
          ))}
          {r.eigenPositie !== null && (
            <Text style={styles.eigenPositie}>Jouw positie: #{r.eigenPositie} · {r.eigenPercentage}% ingeleverd</Text>
          )}
        </View>
      ))}

      {(data ?? []).length === 0 ? (
        <Empty text="Nog geen huiswerk." />
      ) : (
        <>
          {open.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Open ({open.length})</Text>
              {open.map(renderItem)}
            </>
          )}
          {klaar.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Ingeleverd ({klaar.length})</Text>
              {klaar.map(renderItem)}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8, marginTop: 8 },
  detail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  beschrijving: { fontSize: 14, color: colors.text, marginBottom: 8 },
  bijlageText: { color: colors.info, fontSize: 14, textDecorationLine: "underline", paddingVertical: 4 },
  inleveringBox: { marginTop: 6, backgroundColor: colors.bg, borderRadius: 8, padding: 10 },
  inleverForm: { marginTop: 10 },
  bijlageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  bijlageNaam: { flex: 1, fontSize: 14, color: colors.text },
  opmerkingBox: { backgroundColor: colors.infoLight, borderRadius: 8, padding: 10, marginTop: 6 },
  opmerkingLabel: { fontSize: 12, fontWeight: "600", color: colors.info, marginBottom: 2 },
  opmerkingText: { fontSize: 14, color: colors.text },
  rankCard: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning, borderRadius: 12, padding: 14, marginBottom: 12 },
  rankTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  rankNum: { width: 24, height: 24, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  rankNumLead: { backgroundColor: colors.primary },
  rankNumText: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  rankNumTextLead: { color: "#fff" },
  rankNaam: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.text },
  rankPct: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  eigenPositie: { marginTop: 8, fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, marginBottom: 4 },
});
