import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { clearSession, getAccounts, getServerUrl, Account, Org, User } from "../api";
import { colors, PROVIDERS } from "../theme";
import { s, Card, Button, ProviderDot } from "../ui";

export default function SettingsScreen({
  user,
  orgs,
  org,
  onSwitchOrg,
  onLogout,
}: {
  user: User;
  orgs: Org[];
  org: Org;
  onSwitchOrg: (o: Org) => void;
  onLogout: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAccounts(org.id)
        .then((d) => setAccounts(d.accounts))
        .catch(() => {});
    }, [org.id])
  );

  function logout() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          onLogout();
        },
      },
    ]);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}>
      <Text style={s.h1}>Settings</Text>

      <Card>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Workspace</Text>
        <View style={[s.row, { flexWrap: "wrap", marginTop: 10 }]}>
          {orgs.map((o) => {
            const on = o.id === org.id;
            return (
              <TouchableOpacity key={o.id} style={[s.chip, on && s.chipOn]} onPress={() => onSwitchOrg(o)}>
                <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: o.brandColor, marginRight: 6 }} />
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: on ? colors.accent : colors.ink2 }}>{o.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 4 }}>
          Plan: {org.plan} ({org.planStatus})
        </Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Connected accounts</Text>
        {accounts.length === 0 ? (
          <Text style={s.sub}>No accounts connected yet.</Text>
        ) : (
          accounts.map((a) => (
            <View key={a.id} style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <ProviderDot provider={a.provider} />
              <Text style={{ flex: 1, fontSize: 13.5, color: colors.ink, marginLeft: 4 }}>{a.displayName}</Text>
              <Text style={{ fontSize: 11.5, color: a.status === "connected" ? colors.good : colors.crit }}>{a.status}</Text>
            </View>
          ))
        )}
        <View style={{ marginTop: 12 }}>
          <Button
            title="Connect accounts (opens web dashboard)"
            kind="ghost"
            onPress={() => Linking.openURL(`${getServerUrl()}/dashboard/${org.id}/accounts`)}
          />
        </View>
        <Text style={{ fontSize: 11.5, color: colors.ink3, marginTop: 8 }}>
          Platform OAuth (Facebook, X, TikTok…) requires a browser — connect once on the web, then publish from anywhere.
        </Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Account</Text>
        <Text style={{ fontSize: 13.5, color: colors.ink, marginTop: 8 }}>{user.name}</Text>
        <Text style={{ fontSize: 12.5, color: colors.ink3 }}>{user.email}</Text>
        <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 2 }}>Server: {getServerUrl()}</Text>
        <View style={{ marginTop: 14 }}>
          <Button title="Sign out" kind="danger" onPress={logout} />
        </View>
      </Card>
    </ScrollView>
  );
}
