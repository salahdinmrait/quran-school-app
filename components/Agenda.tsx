import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";
import {
  WEEKDAGEN_KORT, addDays, dayKey, fmtDagLang, fmtMaandJaar, monthGrid,
  sameDay, startOfDay, weekDays,
} from "../lib/dates";

export interface AgendaEvent {
  id: string;
  datum: string; // ISO
  begintijd: string; // "09:00"
  eindtijd: string;
  titel: string;
  subtitel?: string;
  badges?: { text: string; bg?: string; fg?: string }[];
  extra?: React.ReactNode;
  onPress?: () => void;
}

type Mode = "dag" | "week" | "maand";

export function Agenda({ events }: { events: AgendaEvent[] }) {
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));

  // Groepeer events per dag-sleutel
  const byDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const k = dayKey(e.datum);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.begintijd.localeCompare(b.begintijd));
    return map;
  }, [events]);

  function shift(dir: 1 | -1) {
    if (mode === "dag") setAnchor((a) => addDays(a, dir));
    else if (mode === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  }

  const periodeLabel =
    mode === "dag" ? fmtDagLang(anchor)
    : mode === "week" ? `Week van ${fmtDagLang(weekDays(anchor)[0])}`
    : fmtMaandJaar(anchor);

  return (
    <View style={{ flex: 1 }}>
      {/* Modus-schakelaar */}
      <View style={styles.modeRow}>
        {(["dag", "week", "maand"] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.modeChip, mode === m && styles.modeChipActive]}>
            <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
              {m === "dag" ? "Dag" : m === "week" ? "Week" : "Maand"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Periode-navigatie */}
      <View style={styles.navRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setAnchor(startOfDay(new Date()))} style={{ flex: 1 }}>
          <Text style={styles.periodeLabel} numberOfLines={1}>{periodeLabel}</Text>
        </Pressable>
        <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {mode === "dag" && <DagView dag={anchor} byDay={byDay} />}
      {mode === "week" && <WeekView anchor={anchor} byDay={byDay} />}
      {mode === "maand" && (
        <MaandView anchor={anchor} byDay={byDay} onPickDay={(d) => { setAnchor(d); setMode("dag"); }} />
      )}
    </View>
  );
}

function EventCard({ e }: { e: AgendaEvent }) {
  const inner = (
    <View style={styles.event}>
      <View style={styles.eventTime}>
        <Text style={styles.eventTimeText}>{e.begintijd}</Text>
        <Text style={styles.eventTimeMuted}>{e.eindtijd}</Text>
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle}>{e.titel}</Text>
        {e.subtitel ? <Text style={styles.eventSub}>{e.subtitel}</Text> : null}
        {e.badges && e.badges.length > 0 && (
          <View style={styles.badgeRow}>
            {e.badges.map((b, i) => (
              <View key={i} style={[styles.badge, { backgroundColor: b.bg ?? colors.primaryLight }]}>
                <Text style={[styles.badgeText, { color: b.fg ?? colors.primaryDark }]}>{b.text}</Text>
              </View>
            ))}
          </View>
        )}
        {e.extra}
      </View>
    </View>
  );
  if (e.onPress) {
    return (
      <Pressable onPress={e.onPress} style={({ pressed }) => [styles.eventWrap, pressed && { opacity: 0.7 }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.eventWrap}>{inner}</View>;
}

function DagView({ dag, byDay }: { dag: Date; byDay: Map<string, AgendaEvent[]> }) {
  const items = byDay.get(dayKey(dag)) ?? [];
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {items.length === 0 ? (
        <Empty text="Geen lessen op deze dag." />
      ) : (
        items.map((e) => <EventCard key={e.id} e={e} />)
      )}
    </ScrollView>
  );
}

function WeekView({ anchor, byDay }: { anchor: Date; byDay: Map<string, AgendaEvent[]> }) {
  const days = weekDays(anchor);
  const today = new Date();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {days.map((d) => {
        const items = byDay.get(dayKey(d)) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={dayKey(d)} style={styles.weekDay}>
            <Text style={[styles.weekDayLabel, sameDay(d, today) && styles.todayLabel]}>
              {fmtDagLang(d)}
            </Text>
            {items.map((e) => <EventCard key={e.id} e={e} />)}
          </View>
        );
      })}
      {days.every((d) => (byDay.get(dayKey(d)) ?? []).length === 0) && (
        <Empty text="Geen lessen deze week." />
      )}
    </ScrollView>
  );
}

function MaandView({
  anchor, byDay, onPickDay,
}: {
  anchor: Date;
  byDay: Map<string, AgendaEvent[]>;
  onPickDay: (d: Date) => void;
}) {
  const grid = monthGrid(anchor);
  const today = new Date();
  const maand = anchor.getMonth();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.weekHeader}>
        {WEEKDAGEN_KORT.map((w) => (
          <Text key={w} style={styles.weekHeaderCell}>{w}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {grid.map((d) => {
          const inMonth = d.getMonth() === maand;
          const heeft = (byDay.get(dayKey(d)) ?? []).length > 0;
          const isToday = sameDay(d, today);
          return (
            <Pressable key={dayKey(d)} style={styles.monthCell} onPress={() => onPickDay(d)}>
              <View style={[styles.monthCellInner, isToday && styles.monthCellToday]}>
                <Text style={[styles.monthCellText, !inMonth && styles.monthCellMuted, isToday && styles.monthCellTextToday]}>
                  {d.getDate()}
                </Text>
                {heeft && <View style={[styles.dot, isToday && { backgroundColor: "#fff" }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.maandHint}>Tik op een dag voor de lessen.</Text>
    </ScrollView>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="calendar-outline" size={30} color={colors.textFaint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  modeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeChipText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  modeChipTextActive: { color: "#fff", fontWeight: "600" },
  navRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  navBtn: { padding: 4 },
  periodeLabel: { textAlign: "center", fontSize: 15, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  scroll: { paddingBottom: 24 },
  eventWrap: { marginBottom: 8 },
  event: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  eventTime: {
    width: 58,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  eventTimeText: { fontSize: 14, fontWeight: "700", color: colors.primaryDark },
  eventTimeMuted: { fontSize: 11, color: colors.primaryDark, opacity: 0.7 },
  eventBody: { flex: 1, padding: 10 },
  eventTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  eventSub: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  weekDay: { marginBottom: 12 },
  weekDayLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "capitalize",
    marginBottom: 6,
  },
  todayLabel: { color: colors.primaryDark },
  weekHeader: { flexDirection: "row", marginBottom: 4 },
  weekHeaderCell: { flex: 1, textAlign: "center", fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  monthCellInner: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  monthCellToday: { backgroundColor: colors.primary },
  monthCellText: { fontSize: 14, color: colors.text },
  monthCellMuted: { color: colors.textFaint },
  monthCellTextToday: { color: "#fff", fontWeight: "700" },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 2 },
  maandHint: { textAlign: "center", fontSize: 12, color: colors.textMuted, marginTop: 12 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
});
