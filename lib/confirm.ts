import { Alert, Platform } from "react-native";

// Bevestigingsdialoog die op álle platformen werkt.
// Alert.alert toont geen knoppen op web (react-native-web) — daar window.confirm.
export function bevestig(
  titel: string,
  vraag: string,
  onBevestig: () => void,
  bevestigLabel = "Verwijderen"
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${titel}\n\n${vraag}`)) onBevestig();
    return;
  }
  Alert.alert(titel, vraag, [
    { text: "Annuleren", style: "cancel" },
    { text: bevestigLabel, style: "destructive", onPress: onBevestig },
  ]);
}
