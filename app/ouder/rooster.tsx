import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { useT } from "../../lib/LanguageContext";
import { textStart } from "../../lib/rtl";
import { Loading, ErrorView, Muted } from "../../components/ui";
import { Agenda, AgendaEvent } from "../../components/Agenda";
import { colors, STATUS_COLORS } from "../../lib/theme";

interface KindLessen {
  kind: { id: string; name: string };
  lessen: {
    id: string;
    datum: string;
    begintijd: string;
    eindtijd: string;
    lokaal: string | null;
    klas: { naam: string };
    vak: { naam: string } | null;
    docenten: { id: string; name: string }[];
    aanwezigheid: { status: string }[];
  }[];
}

export default function OuderRooster() {
  const { user } = useAuth();
  const { t, isRTL, label } = useT();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<KindLessen[]>("/api/ouder/lessen");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const result = data ?? [];
  const meerdereKinderen = result.length > 1;

  // Alle lessen van alle kinderen samenvoegen tot één agenda
  const events: AgendaEvent[] = result.flatMap(({ kind, lessen }) =>
    lessen.map((l) => {
      const status = l.aanwezigheid?.[0]?.status;
      const c = status ? STATUS_COLORS[status] : null;
      return {
        id: `${kind.id}_${l.id}`,
        datum: l.datum,
        begintijd: l.begintijd,
        eindtijd: l.eindtijd,
        titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
        subtitel: [
          meerdereKinderen ? kind.name : null,
          (l.docenten ?? []).map((d) => d.name).join(", "),
          l.lokaal,
        ].filter(Boolean).join(" · ") || undefined,
        badges: status && c ? [{ text: label("status", status), bg: c.bg, fg: c.fg }] : undefined,
      };
    })
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { textAlign: textStart(isRTL) }]}>{t("c_groet")}</Text>
        <Text style={[styles.name, { textAlign: textStart(isRTL) }]}>{user?.name}</Text>
        {user?.schoolNaam ? <Muted>{user.schoolNaam}</Muted> : null}
      </View>
      <View style={styles.agendaWrap}>
        <Agenda events={events} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  greeting: { fontSize: 14, color: colors.textMuted },
  name: { fontSize: 22, fontWeight: "700", color: colors.text },
  agendaWrap: { flex: 1, paddingHorizontal: 16 },
});
