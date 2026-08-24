import { Alert, Platform } from "react-native";

// Bevestigingsdialoog die op álle platformen werkt.
// Alert.alert toont geen knoppen op web (react-native-web) — daar window.confirm.
// De twee vaste knoplabels volgen de taal. LanguageProvider zet ze hier neer,
// net als bij de datumlabels: zo hoeft geen enkele aanroep ze mee te geven.
let LABEL_ANNULEREN = "Annuleren";
let LABEL_VERWIJDEREN = "Verwijderen";

/** Aangeroepen door <LanguageProvider>; buiten die context niet nodig. */
export function setBevestigLabels(annuleren: string, verwijderen: string): void {
  LABEL_ANNULEREN = annuleren;
  LABEL_VERWIJDEREN = verwijderen;
}

export function bevestig(
  titel: string,
  vraag: string,
  onBevestig: () => void,
  bevestigLabel?: string
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${titel}\n\n${vraag}`)) onBevestig();
    return;
  }
  Alert.alert(titel, vraag, [
    { text: LABEL_ANNULEREN, style: "cancel" },
    { text: bevestigLabel ?? LABEL_VERWIJDEREN, style: "destructive", onPress: onBevestig },
  ]);
}
