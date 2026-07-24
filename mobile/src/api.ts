import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API client for the Bassir Social Pro server.
 * Authenticates with the Bearer token returned by POST /api/auth/login.
 */

export type User = { id: string; name: string; email: string; isSuperAdmin: boolean };
export type Org = {
  id: string;
  name: string;
  slug: string;
  brandColor: string;
  plan: string;
  planStatus: string;
};
export type Account = {
  id: string;
  provider: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
};
export type PostTarget = {
  id: string;
  status: string;
  errorMessage: string | null;
  socialAccount: { provider: string; displayName: string };
};
export type Post = {
  id: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string };
  targets: PostTarget[];
};

let serverUrl = "";
let token = "";

export async function loadSession(): Promise<{ serverUrl: string; token: string; user: User | null }> {
  const [u, t, us] = await Promise.all([
    AsyncStorage.getItem("serverUrl"),
    AsyncStorage.getItem("token"),
    AsyncStorage.getItem("user"),
  ]);
  serverUrl = u || "";
  token = t || "";
  return { serverUrl, token, user: us ? JSON.parse(us) : null };
}

export async function saveSession(url: string, tok: string, user: User) {
  serverUrl = url.replace(/\/+$/, "");
  token = tok;
  await AsyncStorage.multiSet([
    ["serverUrl", serverUrl],
    ["token", token],
    ["user", JSON.stringify(user)],
  ]);
}

export async function clearSession() {
  token = "";
  await AsyncStorage.multiRemove(["token", "user"]);
}

export function getServerUrl() {
  return serverUrl;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!serverUrl) throw new Error("Server URL is not set");
  const res = await fetch(serverUrl + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
}

export async function login(url: string, email: string, password: string) {
  serverUrl = url.replace(/\/+$/, "");
  const data = await api<{ ok: boolean; token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await saveSession(serverUrl, data.token, data.user);
  return data.user;
}

export const getOrgs = () => api<{ organizations: Org[] }>("/api/orgs");
export const getAccounts = (orgId: string) => api<{ accounts: Account[] }>(`/api/orgs/${orgId}/accounts`);
export const getPosts = (orgId: string, status?: string) =>
  api<{ posts: Post[] }>(`/api/orgs/${orgId}/posts${status ? `?status=${status}` : ""}`);
export const createPost = (
  orgId: string,
  body: { body: string; mediaUrls: string[]; socialAccountIds: string[]; scheduledAt: string | null; requestApproval: boolean }
) => api<{ post: Post }>(`/api/orgs/${orgId}/posts`, { method: "POST", body: JSON.stringify(body) });
export const postAction = (postId: string, action: string, note?: string) =>
  api<{ ok: boolean }>(`/api/posts/${postId}/actions`, { method: "POST", body: JSON.stringify({ action, note }) });
export const deletePost = (postId: string) => api<{ ok: boolean }>(`/api/posts/${postId}`, { method: "DELETE" });
