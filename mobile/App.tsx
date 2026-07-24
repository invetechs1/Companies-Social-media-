import React, { useEffect, useState } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { loadSession, getOrgs, clearSession, Org, User } from "./src/api";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import OverviewScreen from "./src/screens/OverviewScreen";
import PostsScreen from "./src/screens/PostsScreen";
import ComposerScreen from "./src/screens/ComposerScreen";
import ApprovalsScreen from "./src/screens/ApprovalsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Overview: "▦",
  Posts: "≡",
  Compose: "✎",
  Approvals: "✓",
  Settings: "⚙",
};

export default function App() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [org, setOrg] = useState<Org | null>(null);

  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session.token && session.user) {
        try {
          const d = await getOrgs();
          if (d.organizations.length > 0) {
            setOrgs(d.organizations);
            setOrg(d.organizations[0]);
            setUser(session.user);
          } else {
            await clearSession();
          }
        } catch {
          await clearSession();
        }
      }
      setBooted(true);
    })();
  }, []);

  async function handleLogin(u: User) {
    const d = await getOrgs();
    setOrgs(d.organizations);
    setOrg(d.organizations[0] || null);
    setUser(u);
  }

  if (!booted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user || !org) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: org.brandColor || colors.accent,
          tabBarInactiveTintColor: colors.ink3,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name] || "•"}</Text>
          ),
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        })}
      >
        <Tab.Screen name="Overview">{() => <OverviewScreen org={org} />}</Tab.Screen>
        <Tab.Screen name="Posts">{() => <PostsScreen org={org} />}</Tab.Screen>
        <Tab.Screen name="Compose">{() => <ComposerScreen org={org} onDone={() => {}} />}</Tab.Screen>
        <Tab.Screen name="Approvals">{() => <ApprovalsScreen org={org} />}</Tab.Screen>
        <Tab.Screen name="Settings">
          {() => (
            <SettingsScreen
              user={user}
              orgs={orgs}
              org={org}
              onSwitchOrg={setOrg}
              onLogout={() => {
                setUser(null);
                setOrg(null);
              }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
