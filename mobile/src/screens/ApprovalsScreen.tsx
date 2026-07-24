import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPosts, postAction, Org, Post } from "../api";
import { colors } from "../theme";
import { s, Card, Button, ProviderDot } from "../ui";

export default function ApprovalsScreen({ org }: { org: Org }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getPosts(org.id, "pending_approval");
      setPosts(d.posts);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [org.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function act(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await postAction(id, action);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <View style={s.screen}>
      <View style={[s.container, { paddingBottom: 0 }]}>
        <Text style={s.h1}>Approvals</Text>
        <Text style={s.sub}>Posts waiting for a manager&apos;s sign-off.</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<Card><Text style={s.sub}>Nothing waiting for approval. 🎉</Text></Card>}
        renderItem={({ item: p }) => (
          <Card style={{ padding: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 14 }}>{p.body}</Text>
            <View style={[s.row, { marginTop: 8 }]}>
              {p.targets.map((t) => (
                <ProviderDot key={t.id} provider={t.socialAccount.provider} />
              ))}
              <Text style={{ fontSize: 12, color: colors.ink3, marginLeft: 4 }}>
                by {p.author.name}
                {p.scheduledAt ? ` · publish ${new Date(p.scheduledAt).toLocaleString()}` : ""}
              </Text>
            </View>
            <View style={[s.row, { marginTop: 12, gap: 10 }]}>
              <Button title="✓ Approve" onPress={() => act(p.id, "approve")} loading={busy === p.id} />
              <Button title="✕ Reject" kind="danger" onPress={() => act(p.id, "reject")} disabled={busy === p.id} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
