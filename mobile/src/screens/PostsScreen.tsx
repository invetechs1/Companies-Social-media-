import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPosts, postAction, deletePost, Org, Post } from "../api";
import { colors } from "../theme";
import { s, Card, Button, StatusPill, ProviderDot } from "../ui";

const FILTERS = ["all", "draft", "pending_approval", "scheduled", "published"];

export default function PostsScreen({ org }: { org: Org }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getPosts(org.id, filter === "all" ? undefined : filter);
      setPosts(d.posts);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [org.id, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function act(id: string, action: string) {
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

  function remove(id: string) {
    Alert.alert("Delete post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(id);
          try {
            await deletePost(id);
            await load();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          } finally {
            setBusy("");
          }
        },
      },
    ]);
  }

  return (
    <View style={s.screen}>
      <View style={[s.container, { paddingBottom: 0 }]}>
        <Text style={s.h1}>Posts</Text>
        <View style={[s.row, { flexWrap: "wrap", marginTop: 10 }]}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipOn]} onPress={() => setFilter(f)}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: filter === f ? colors.accent : colors.ink2 }}>
                {f === "all" ? "All" : f === "pending_approval" ? "Approval" : f[0].toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[s.container, { paddingTop: 4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<Card><Text style={s.sub}>No posts match this filter.</Text></Card>}
        renderItem={({ item: p }) => (
          <Card style={{ padding: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 14 }}>{p.body}</Text>
            <View style={[s.row, { marginTop: 8, justifyContent: "space-between" }]}>
              <View style={s.row}>
                {p.targets.map((t) => (
                  <ProviderDot key={t.id} provider={t.socialAccount.provider} />
                ))}
                <Text style={{ fontSize: 11.5, color: colors.ink3, marginLeft: 4 }}>
                  {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString() : new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <StatusPill status={p.status} />
            </View>
            {p.targets.some((t) => t.errorMessage) && (
              <Text style={{ color: colors.crit, fontSize: 12, marginTop: 6 }}>
                {p.targets.filter((t) => t.errorMessage).map((t) => `${t.socialAccount.displayName}: ${t.errorMessage}`).join("\n")}
              </Text>
            )}
            <View style={[s.row, { marginTop: 10, gap: 8 }]}>
              {["draft", "approved", "scheduled", "failed"].includes(p.status) && (
                <Button title="Publish now" onPress={() => act(p.id, "publish_now")} loading={busy === p.id} />
              )}
              {p.status === "draft" && (
                <Button title="Submit" kind="ghost" onPress={() => act(p.id, "submit")} disabled={busy === p.id} />
              )}
              {!["published", "publishing"].includes(p.status) && (
                <Button title="Delete" kind="danger" onPress={() => remove(p.id)} disabled={busy === p.id} />
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}
