import { Redirect } from "expo-router";

// Rooster is het landingsscherm (tab-bar navigatie).
export default function LeerlingIndex() {
  return <Redirect href="/leerling/rooster" />;
}
