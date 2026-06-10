import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";
import { Loading } from "../components/ui";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;

  switch (user.role) {
    case "ADMIN":
      return <Redirect href="/admin" />;
    case "DOCENT":
      return <Redirect href="/docent" />;
    case "LEERLING":
      return <Redirect href="/leerling" />;
    case "OUDER":
      return <Redirect href="/ouder" />;
    default:
      return <Redirect href="/login" />;
  }
}
