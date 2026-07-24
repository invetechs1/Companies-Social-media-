import React from "react";
import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { colors, STATUS, PROVIDERS } from "./theme";

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg = kind === "primary" ? colors.accent : kind === "danger" ? colors.critBg : colors.card;
  const fg = kind === "primary" ? "#fff" : kind === "danger" ? colors.crit : colors.ink;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.btn, { backgroundColor: bg, borderColor: kind === "ghost" ? colors.border : bg, opacity: disabled || loading ? 0.55 : 1 }]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : <Text style={{ color: fg, fontWeight: "600", fontSize: 14 }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function StatusPill({ status }: { status: string }) {
  const st = STATUS[status] || STATUS.draft;
  return (
    <View style={[s.pill, { backgroundColor: st.bg }]}>
      <Text style={{ color: st.fg, fontSize: 11, fontWeight: "700" }}>{st.label}</Text>
    </View>
  );
}

export function ProviderDot({ provider }: { provider: string }) {
  const p = PROVIDERS[provider];
  if (!p) return null;
  return (
    <View style={[s.pdot, { backgroundColor: p.color }]}>
      <Text style={{ color: "#fff", fontSize: 8, fontWeight: "800" }}>{p.glyph}</Text>
    </View>
  );
}

export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.ink2, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: { padding: 16 },
  h1: { fontSize: 22, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 13, color: colors.ink2, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 12,
  },
  btn: {
    borderRadius: 9,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
    marginTop: 8,
  },
  label: { fontSize: 11, fontWeight: "700", color: colors.ink2, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 14 },
  pill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  pdot: { width: 18, height: 18, borderRadius: 5, alignItems: "center", justifyContent: "center", marginRight: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
