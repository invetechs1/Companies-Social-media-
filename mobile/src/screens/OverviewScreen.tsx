import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAccounts, getPosts, Org, Post } from "../api";
import { colors } from "../theme";
import { s, Card, StatTile, StatusPill, ProviderDot } from "../ui";

export default function OverviewScreen({ org }: { org: Org }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accountCount, setAccountCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [p, a] = await Promise.all([getPosts(org.id), getAccounts(org.id)]);
      setPosts(p.posts);
      setAccountCount(a.accounts.length);
    } catch (e: any) {
      setError(e.message);
    }
  }, [org.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const count = (st: string) => posts.filter((p) => p.status === st).length;
  const recent = posts.slice(0, 6);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={s.h1}>{org.name}</Text>
      <Text style={s.sub}>Workspace overview</Text>
      {error ? <Text style={{ color: colors.crit, marginTop: 10 }}>{error}</Text> : null}

      <View style={[s.row, { marginTop: 12, gap: 10 }]}>
        <StatTile value={accountCount} label="Accounts" />
        <StatTile value={count("scheduled")} label="Scheduled" />
      </View>
      <View style={[s.row, { marginTop: 10, gap: 10 }]}>
        <StatTile value={count("published")} label="Published" />
        <StatTile value={count("pending_approval")} label="Need approval" />
      </View>

      <Card>
        <Text style={{ fontWeight: "700", color: colors.ink, marginBottom: 6 }}>Recent posts</Text>
        {recent.length === 0 ? (
          <Text style={s.sub}>No posts yet — create one from the Compose tab.</Text>
        ) : (
          recent.map((p) => (
            <View key={p.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 10 }}>
              <Text numberOfLines={2} style={{ color: colors.ink, fontSize: 13.5 }}>{p.body}</Text>
              <View style={[s.row, { marginTop: 6, justifyContent: "space-between" }]}>
                <View style={s.row}>
                  {p.targets.map((t) => (
                    <ProviderDot key={t.id} provider={t.socialAccount.provider} />
                  ))}
                </View>
                <StatusPill status={p.status} />
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
