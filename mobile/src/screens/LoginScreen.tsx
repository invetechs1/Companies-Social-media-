import React, { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { login, getServerUrl, User } from "../api";
import { colors } from "../theme";
import { s, Button, Card } from "../ui";

export default function LoginScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [url, setUrl] = useState(getServerUrl() || "https://");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const user = await login(url.trim(), email.trim(), password);
      onLogin(user);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[s.container, { flexGrow: 1, justifyContent: "center" }]}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={{ width: 56, height: 56, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>B</Text>
          </View>
          <Text style={[s.h1, { marginTop: 10 }]}>Bassir Social Pro</Text>
          <Text style={s.sub}>Manage all your social media in one place</Text>
        </View>
        <Card>
          <Text style={s.label}>Server URL</Text>
          <TextInput
            style={s.input}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://social.yourcompany.com"
            placeholderTextColor={colors.ink3}
          />
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@company.com"
            placeholderTextColor={colors.ink3}
          />
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.ink3}
          />
          {error ? <Text style={{ color: colors.crit, marginTop: 12, fontSize: 13 }}>{error}</Text> : null}
          <View style={{ marginTop: 18 }}>
            <Button title={busy ? "Signing in…" : "Sign in"} onPress={submit} loading={busy} />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
