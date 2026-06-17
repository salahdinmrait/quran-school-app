import { View, Text, StyleSheet } from "react-native";
import { useFetch } from "../../lib/useFetch";
import { useAuth } from "../../lib/auth";
import { Loading, ErrorView, Muted } from "../../components/ui";
import { Agenda, AgendaEvent } from "../../components/Agenda";
import { LinkText } from "../../components/LinkText";
import { openAttachment } from "../../lib/bijlage";
import { colors } from "../../lib/theme";

interface Les {
  id: string;
  datum: string;
  begintijd: string;
  eindtijd: string;
  lokaal: string | null;
  beschrijving: string | null;
  hasBijlage: boolean;
  klas: { id: string; naam: string };
  vak: { id: string; naam: string } | null;
  docenten: { id: string; name: string }[];
  huiswerk: {
    id: string;
    titel: string;
    deadline: string | null;
    vak: { naam: string };
    inleveringen: { id: string }[];
  }[];
}

export default function LeerlingRooster() {
  const { user } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<Les[]>("/api/leerling/lessen");

  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const lessen = data ?? [];

  const events: AgendaEvent[] = lessen.map((l) => ({
    id: l.id,
    datum: l.datum,
    begintijd: l.begintijd,
    eindtijd: l.eindtijd,
    titel: l.klas.naam + (l.vak ? ` · ${l.vak.naam}` : ""),
    subtitel: [l.docenten.map((d) => d.name).join(", "), l.lokaal].filter(Boolean).join(" · ") || undefined,
    badges: l.huiswerk.length > 0
      ? [{ text: `${l.huiswerk.length} huiswerk`, bg: colors.warningLight, fg: colors.warning }]
      : undefined,
    extra: (
      <View>
        {l.beschrijving ? <LinkText style={styles.beschrijving}>{l.beschrijving}</LinkText> : null}
        {l.hasBijlage ? (
          <Text style={styles.bijlage} onPress={() => openAttachment("les", l.id)}>📎 Lesbijlage openen</Text>
        ) : null}
        {l.huiswerk.map((hw) => (
          <View key={hw.id} style={styles.hwRow}>
            <Text style={styles.hwDot}>•</Text>
            <Text style={styles.hwText}>
              {hw.titel}
              {hw.inleveringen.length > 0 ? "  ✓" : ""}
            </Text>
          </View>
        ))}
      </View>
    ),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Assalamu alaykum,</Text>
        <Text style={styles.name}>{user?.name}</Text>
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
  beschrijving: { fontSize: 13, color: colors.text, marginTop: 6 },
  bijlage: { color: colors.info, fontSize: 13, textDecorationLine: "underline", marginTop: 6 },
  hwRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  hwDot: { color: colors.warning, fontSize: 13 },
  hwText: { flex: 1, fontSize: 13, color: colors.textMuted },
});
