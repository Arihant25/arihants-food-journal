import { DEFAULT_GOALS } from "./nutrition";
import { AiProvider, FoodEntry, Settings } from "./types";

/**
 * Storage layer. The app is local-first: everything lives in localStorage and
 * works fully offline. When the user signs in with Google, entries also sync to
 * MongoDB through /api/entries (the cloud backend below).
 */

const ENTRIES_KEY = "afj:entries";
const SETTINGS_KEY = "afj:settings";

export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: "anthropic",
    apiKeys: {},
    models: {},
    ollamaBaseUrl: "http://localhost:11434",
  },
  goals: DEFAULT_GOALS,
};

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------------------------- local --------------------------------- */

export function loadLocalEntries(): FoodEntry[] {
  return read<FoodEntry[]>(ENTRIES_KEY, []);
}

export function saveLocalEntries(entries: FoodEntry[]) {
  write(ENTRIES_KEY, entries);
}

export function loadSettings(): Settings {
  const stored = read<Partial<Settings>>(SETTINGS_KEY, {});
  // Deep-merge with defaults so new fields appear for existing users.
  return {
    ai: { ...DEFAULT_SETTINGS.ai, ...stored.ai, apiKeys: { ...stored.ai?.apiKeys }, models: { ...stored.ai?.models } },
    goals: { ...DEFAULT_SETTINGS.goals, ...stored.goals },
    profile: stored.profile,
    name: stored.name,
  };
}

export function saveSettings(settings: Settings) {
  write(SETTINGS_KEY, settings);
}

/* ---------------------------------- cloud --------------------------------- */

const authHeaders = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export async function fetchCloudEntries(token: string): Promise<FoodEntry[]> {
  const res = await fetch("/api/entries", { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load cloud entries");
  const data = await res.json();
  return data.entries as FoodEntry[];
}

export async function putCloudEntry(token: string, entry: FoodEntry): Promise<void> {
  const res = await fetch("/api/entries", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("Failed to save entry to cloud");
}

export async function deleteCloudEntry(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/entries?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete cloud entry");
}

export async function deleteAllCloudEntries(token: string): Promise<void> {
  const res = await fetch("/api/entries?all=true", {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete all cloud entries");
}

/* ------------------------------- cloud keys ------------------------------- */

/** Fetch the user's synced settings (API keys + name). */
export async function fetchCloudKeys(token: string): Promise<{ apiKeys: Partial<Record<AiProvider, string>>; name?: string }> {
  const res = await fetch("/api/settings", { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to load cloud keys");
  const data = await res.json();
  return { apiKeys: (data.apiKeys ?? {}) as Partial<Record<AiProvider, string>>, name: data.name ?? undefined };
}

/** Store the user's API keys in their cloud account. */
export async function putCloudKeys(token: string, apiKeys: Partial<Record<AiProvider, string>>): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ apiKeys }),
  });
  if (!res.ok) throw new Error("Failed to save keys to cloud");
}

/** Store the user's display name in their cloud account. */
export async function putCloudName(token: string, name: string | undefined): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to save name to cloud");
}

/** Remove the user's synced keys from their cloud account. */
export async function deleteCloudKeys(token: string): Promise<void> {
  const res = await fetch("/api/settings", { method: "DELETE", headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to remove keys from cloud");
}

/** Push many entries at once (used when first signing in). */
export async function bulkPushCloud(token: string, entries: FoodEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error("Failed to sync entries to cloud");
}

/* --------------------------------- merging -------------------------------- */

/** Merge two entry lists by id, keeping the most recently updated copy. */
export function mergeEntries(a: FoodEntry[], b: FoodEntry[]): FoodEntry[] {
  const byId = new Map<string, FoodEntry>();
  for (const e of [...a, ...b]) {
    const existing = byId.get(e.id);
    if (!existing || e.updatedAt >= existing.updatedAt) byId.set(e.id, e);
  }
  return [...byId.values()];
}

/** Stable sort: by date then time, most recent first. */
export function sortEntries(entries: FoodEntry[]): FoodEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.time !== b.time) return a.time < b.time ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}
