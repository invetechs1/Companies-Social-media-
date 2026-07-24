import React, { useCallback, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { createPost, getAccounts, postAction, Account, Org } from "../api";
import { colors, PROVIDERS } from "../theme";
import { s, Card, Button, ProviderDot } from "../ui";

export default function ComposerScreen({ org, onDone }: { org: Org; onDone: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(""); // "YYYY-MM-DD HH:mm"
  const [needsApproval, setNeedsApproval] = useState(false);
  const [busy, setBusy] = useState("");

  useFocusEffect(
    useCallback(() => {
      getAccounts(org.id)
        .then((d) => setAccounts(d.accounts))
        .catch(() => {});
    }, [org.id])
  );

  const hasX = selected.some((id) => accounts.find((a) => a.id === id)?.provider === "twitter");
  const limit = hasX ? 280 : 5000;

  function toggle(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
  }

  function parseWhen(): string | null {
    if (!when.trim()) return null;
    const d = new Date(when.replace(" ", "T"));
    if (isNaN(d.getTime())) throw new Error("Invalid date. Use format: 2026-08-01 14:30");
    return d.toISOString();
  }

  async function save(mode: "draft" | "schedule" | "now") {
    if (selected.length === 0) return Alert.alert("Select accounts", "Pick at least one social account.");
    if (!body.trim()) return Alert.alert("Empty post", "Write something first.");
    setBusy(mode);
    try {
      const scheduledAt = mode === "schedule" ? parseWhen() : null;
      if (mode === "schedule" && !scheduledAt) throw new Error("Enter a date & time to schedule (2026-08-01 14:30).");
      const { post } = await createPost(org.id, {
        body,
        mediaUrls: [],
        socialAccountIds: selected,
        scheduledAt,
        requestApproval: needsApproval,
      });
      if (mode === "now" && !needsApproval) {
        await postAction(post.id, "publish_now");
        Alert.alert("Published ✓", "Your post was sent to all selected platforms.");
      } else {
        Alert.alert("Saved ✓", needsApproval ? "Submitted for approval." : mode === "schedule" ? "Post scheduled." : "Draft saved.");
      }
      setBody("");
      setWhen("");
      setSelected([]);
      setNeedsApproval(false);
      onDone();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>New post</Text>
      <Text style={s.sub}>Compose once, publish everywhere.</Text>

      <Card>
        <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Publish to</Text>
        {accounts.length === 0 ? (
          <Text style={s.sub}>No accounts connected. Connect them from the web dashboard → Social accounts.</Text>
        ) : (
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {accounts.map((a) => {
              const on = selected.includes(a.id);
              return (
                <TouchableOpacity key={a.id} style={[s.chip, on && s.chipOn]} onPress={() => toggle(a.id)}>
                  <ProviderDot provider={a.provider} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: on ? colors.accent : colors.ink2 }}>
                    {a.displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <TextInput
          style={[s.input, { minHeight: 120, textAlignVertical: "top", marginTop: 0 }]}
          multiline
          value={body}
          onChangeText={setBody}
          maxLength={limit}
          placeholder="What do you want to share?"
          placeholderTextColor={colors.ink3}
        />
        <Text style={{ alignSelf: "flex-end", fontSize: 11, color: body.length >= limit ? colors.crit : colors.ink3, marginTop: 4 }}>
          {body.length}/{limit}{hasX ? "  (X limit)" : ""}
        </Text>
      </Card>

      <Card>
        <Text style={s.label}>Schedule (optional) — YYYY-MM-DD HH:mm</Text>
        <TextInput
          style={s.input}
          value={when}
          onChangeText={setWhen}
          placeholder="2026-08-01 14:30"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
        />
        <View style={[s.row, { marginTop: 14, justifyContent: "space-between" }]}>
          <Text style={{ color: colors.ink, fontSize: 14 }}>Require manager approval</Text>
          <Switch value={needsApproval} onValueChange={setNeedsApproval} trackColor={{ true: colors.accent }} />
        </View>
      </Card>

      <View style={[s.row, { marginTop: 16, gap: 10 }]}>
        <Button title="Save draft" kind="ghost" onPress={() => save("draft")} loading={busy === "draft"} disabled={!!busy} />
        <Button title="Schedule" onPress={() => save("schedule")} loading={busy === "schedule"} disabled={!!busy} />
        <Button title="Publish now" onPress={() => save("now")} loading={busy === "now"} disabled={!!busy || needsApproval} />
      </View>
    </ScrollView>
  );
}
