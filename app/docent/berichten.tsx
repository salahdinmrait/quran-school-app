import { BerichtenView } from "../../components/BerichtenView";

export default function DocentBerichten() {
  return <BerichtenView targetsEndpoint="/api/docent/klassen" />;
}
