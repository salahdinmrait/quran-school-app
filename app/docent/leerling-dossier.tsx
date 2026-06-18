import { useLocalSearchParams } from "expo-router";
import { LeerlingDossierView } from "../../components/LeerlingDossierView";

export default function DocentLeerlingDossier() {
  const { leerlingId, naam } = useLocalSearchParams<{ leerlingId: string; naam?: string }>();
  if (!leerlingId) return null;
  return <LeerlingDossierView leerlingId={leerlingId} leerlingNaam={naam} />;
}
