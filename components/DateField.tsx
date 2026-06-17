import { useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colors } from "../lib/theme";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ── DateField ────────────────────────────────────────────────────────────────
// value/onChange in "YYYY-MM-DD" (API-formaat); weergave in DD-MM-YYYY.
export function DateField({
  label,
  value,
  onChange,
  placeholder = "Kies een datum",
  minimumDate,
}: {
  label?: string;
  value: string;
  onChange: (yyyymmdd: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const [showIos, setShowIos] = useState(false);
  const current = value ? new Date(value + "T00:00:00") : new Date();

  function commit(d: Date) {
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }

  function open() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        minimumDate,
        onChange: (e, d) => {
          if (e.type === "set" && d) commit(d);
        },
      });
    } else {
      setShowIos(true);
    }
  }

  const display = value ? `${value.slice(8, 10)}-${value.slice(5, 7)}-${value.slice(0, 4)}` : "";

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={open}>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || placeholder}</Text>
      </Pressable>
      {Platform.OS === "ios" && showIos && (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            onChange={(_e, d) => { if (d) commit(d); }}
          />
          <Pressable style={styles.iosDone} onPress={() => setShowIos(false)}>
            <Text style={styles.iosDoneText}>Klaar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── TimeField ────────────────────────────────────────────────────────────────
// value/onChange in "HH:MM".
export function TimeField({
  label,
  value,
  onChange,
  placeholder = "Kies een tijd",
}: {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
}) {
  const [showIos, setShowIos] = useState(false);
  const base = new Date();
  if (value) {
    const [h, m] = value.split(":").map(Number);
    base.setHours(h || 0, m || 0, 0, 0);
  }

  function commit(d: Date) {
    onChange(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }

  function open() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base,
        mode: "time",
        is24Hour: true,
        onChange: (e, d) => {
          if (e.type === "set" && d) commit(d);
        },
      });
    } else {
      setShowIos(true);
    }
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={open}>
        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
      </Pressable>
      {Platform.OS === "ios" && showIos && (
        <View style={styles.iosBox}>
          <DateTimePicker
            value={base}
            mode="time"
            is24Hour
            display="spinner"
            onChange={(_e, d) => { if (d) commit(d); }}
          />
          <Pressable style={styles.iosDone} onPress={() => setShowIos(false)}>
            <Text style={styles.iosDoneText}>Klaar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginBottom: 4 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  value: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textFaint },
  iosBox: { backgroundColor: colors.card, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: colors.border },
  iosDone: { alignSelf: "flex-end", padding: 12 },
  iosDoneText: { color: colors.primaryDark, fontWeight: "600", fontSize: 15 },
});
