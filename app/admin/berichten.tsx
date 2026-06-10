import { BerichtenView } from "../../components/BerichtenView";

export default function AdminBerichten() {
  return <BerichtenView targetsEndpoint="/api/admin/berichten-data" />;
}
