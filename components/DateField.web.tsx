import { View, Text, StyleSheet } from "react-native";
import { colors } from "../lib/theme";

// Web-variant: gebruikt de native HTML datum/tijd-kiezer van de browser.
// value/onChange in API-formaat ("YYYY-MM-DD" resp. "HH:MM").

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 0,
  padding: "10px 12px",
  fontSize: 15,
  color: colors.text,
  fontFamily: "inherit",
  outline: "none",
};

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label?: string;
  value: string;
  onChange: (yyyymmdd: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}) {
  const min = minimumDate
    ? `${minimumDate.getFullYear()}-${String(minimumDate.getMonth() + 1).padStart(2, "0")}-${String(minimumDate.getDate()).padStart(2, "0")}`
    : undefined;
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <input type="date" value={value} min={min} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </View>
  );
}

export function TimeField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (hhmm: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "500", color: colors.textMuted, marginBottom: 4 },
});
