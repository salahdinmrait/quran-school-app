import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Input, Muted } from "./ui";
import { colors } from "../lib/theme";
import { useT } from "../lib/LanguageContext";
import { textStart } from "../lib/rtl";

// Eén manier om personen te kiezen, overal in de app. Overgenomen van het
// zoekveld waarmee een ouder aan een kind wordt gekoppeld — dat werkte al goed
// en die regels houden we vast:
//   • zonder zoekterm verschijnt er niets (geen lijst van honderden namen);
//   • er wordt gezocht op naam én e-mailadres;
//   • maximaal 8 treffers, met een hint om verder te typen;
//   • de selectie staat als chips onder het veld en is weg te tikken.
export interface Persoon {
  id: string;
  name: string;
  email?: string | null;
  /** Extra regel onder de naam, bv. "kind: Yusuf" of een klasnaam. */
  extra?: string | null;
}

const MAX_TREFFERS = 8;

export function PersonPicker({
  label,
  personen,
  geselecteerd,
  onChange,
  multi = true,
  placeholder,
  leegTekst,
}: {
  label?: string;
  personen: Persoon[];
  geselecteerd: string[];
  onChange: (ids: string[]) => void;
  multi?: boolean;
  placeholder?: string;
  leegTekst?: string;
}) {
  const { t, tel, isRTL } = useT();
  const [zoek, setZoek] = useState("");

  const q = zoek.trim().toLowerCase();
  const kiesbaar = personen.filter((p) => !geselecteerd.includes(p.id));
  const alleTreffers = q
    ? kiesbaar.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q) ||
          // De extra regel bevat rol en klas; daar mag ook op gezocht worden,
          // anders is "docent" of "klas 1" geen bruikbare zoekterm.
          (p.extra ?? "").toLowerCase().includes(q)
      )
    : [];
  const treffers = alleTreffers.slice(0, MAX_TREFFERS);
  const rest = alleTreffers.length - treffers.length;

  // De selectie bewaren we als id's en zoeken we hier weer op, zodat een chip
  // blijft kloppen als de lijst opnieuw geladen is.
  const selectie = geselecteerd
    .map((id) => personen.find((p) => p.id === id))
    .filter((p): p is Persoon => !!p);

  function kies(id: string) {
    onChange(multi ? [...geselecteerd, id] : [id]);
    setZoek("");
  }

  if (personen.length === 0) return <Muted>{leegTekst ?? t("c_geen_personen_gevonden")}</Muted>;

  return (
    <View>
      <Input
        label={label}
        value={zoek}
        onChangeText={setZoek}
        placeholder={placeholder ?? t("c_zoek_naam_email")}
        autoCapitalize="none"
      />

      {q.length > 0 &&
        (treffers.length === 0 ? (
          <Muted>{t("c_geen_resultaten")}</Muted>
        ) : (
          <View style={styles.zoekLijst}>
            {treffers.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => kies(p.id)}
                style={({ pressed }) => [styles.zoekRij, pressed && styles.zoekRijActief]}
              >
                <Text style={[styles.zoekNaam, { textAlign: textStart(isRTL) }]}>{p.name}</Text>
                {(p.extra || p.email) && (
                  <Text style={[styles.zoekEmail, { textAlign: textStart(isRTL) }]}>{p.extra ?? p.email}</Text>
                )}
              </Pressable>
            ))}
            {rest > 0 && (
              <Text style={[styles.zoekMeer, { textAlign: textStart(isRTL) }]}>
                {tel("c_nog_anderen", rest)}
              </Text>
            )}
          </View>
        ))}

      {selectie.length > 0 && (
        <View style={styles.selectieRij}>
          {selectie.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onChange(geselecteerd.filter((id) => id !== p.id))}
              style={styles.selectieChip}
            >
              <Text style={styles.selectieChipText}>{p.name} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zoekLijst: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    marginBottom: 8,
    overflow: "hidden",
  },
  zoekRij: { paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  zoekRijActief: { backgroundColor: colors.primaryLight },
  zoekNaam: { fontSize: 14, color: colors.text },
  zoekEmail: { fontSize: 12, color: colors.textMuted },
  zoekMeer: { fontSize: 12, color: colors.textFaint, padding: 8 },
  selectieRij: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  selectieChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  selectieChipText: { fontSize: 13, color: colors.primaryDark, fontWeight: "500" },
});
