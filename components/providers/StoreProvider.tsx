"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import {
  bulkPushCloud,
  deleteAllCloudEntries,
  deleteCloudEntry,
  deleteCloudKeys,
  fetchCloudEntries,
  fetchCloudKeys,
  mergeEntries,
  putCloudEntry,
  putCloudKeys,
  putCloudName,
} from "@/lib/storage";
import { store } from "@/lib/store";
import { FoodEntry, Settings } from "@/lib/types";
import { useSession } from "./SessionProvider";

type SyncState = "local" | "syncing" | "synced" | "error";

interface StoreValue {
  ready: boolean;
  entries: FoodEntry[];
  settings: Settings;
  sync: SyncState;
  upsertEntry: (entry: FoodEntry) => void;
  upsertMany: (entries: FoodEntry[]) => void;
  deleteEntry: (id: string) => void;
  clearAllEntries: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => void;
  refresh: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { token } = useSession();
  // The local-first data lives in an external store, so it can hydrate from
  // localStorage on the client without a setState-in-effect. Reading it first
  // also guarantees the store is hydrated before the sign-in effect runs.
  const { hydrated, entries, settings } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [sync, setSync] = useState<SyncState>("local");
  const [syncTick, setSyncTick] = useState(0);

  // On sign-in (or manual refresh): pull cloud, merge with local, push the union back.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setSync("syncing");
    (async () => {
      try {
        const local = store.getEntries();
        const cloud = await fetchCloudEntries(token);
        const merged = mergeEntries(local, cloud);
        if (cancelled) return;
        store.setEntries(merged);
        // Push anything the cloud was missing.
        const cloudIds = new Set(cloud.map((e) => e.id));
        await bulkPushCloud(token, merged.filter((e) => !cloudIds.has(e.id)));
        if (!cancelled) setSync("synced");
      } catch {
        if (!cancelled) setSync("error");
      }

      // Pull cloud settings (name always; API keys only when sync is on).
      try {
        const cloud = await fetchCloudKeys(token);
        if (cancelled) return;
        const prev = store.getSettings();
        const next: Settings = {
          ...prev,
          // Restore name from cloud if not already set locally.
          name: prev.name ?? cloud.name,
        };
        if (prev.ai.syncKeys) {
          next.ai = { ...prev.ai, apiKeys: { ...prev.ai.apiKeys, ...cloud.apiKeys } };
        }
        store.setSettings(next);
      } catch {
        /* keep local settings if the pull fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, syncTick]);

  const upsertEntry = useCallback(
    (entry: FoodEntry) => {
      store.upsertEntry(entry);
      if (token) putCloudEntry(token, entry).catch(() => setSync("error"));
    },
    [token],
  );

  const upsertMany = useCallback(
    (incoming: FoodEntry[]) => {
      store.upsertMany(incoming);
      if (token) bulkPushCloud(token, incoming).catch(() => setSync("error"));
    },
    [token],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      store.deleteEntry(id);
      if (token) deleteCloudEntry(token, id).catch(() => setSync("error"));
    },
    [token],
  );

  const clearAllEntries = useCallback(async () => {
    store.clearEntries();
    if (token) await deleteAllCloudEntries(token);
  }, [token]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const prev = store.getSettings();
      const next = { ...prev, ...patch };
      store.setSettings(next);

      // Mirror API keys to the cloud when sync is on; clear them when turned off.
      // Always mirror name changes when signed in.
      if (token) {
        const was = prev.ai.syncKeys ?? false;
        const now = next.ai.syncKeys ?? false;
        if (now) {
          putCloudKeys(token, next.ai.apiKeys).catch(() => setSync("error"));
        } else if (was) {
          deleteCloudKeys(token).catch(() => setSync("error"));
        }
        if ("name" in patch) {
          putCloudName(token, next.name).catch(() => { });
        }
      }
    },
    [token],
  );

  const refresh = useCallback(() => {
    if (!token) return;
    setSyncTick((t) => t + 1);
  }, [token]);

  const value: StoreValue = {
    ready: hydrated,
    entries,
    settings,
    // While signed out there is no cloud connection, so always report "local".
    sync: token ? sync : "local",
    upsertEntry,
    upsertMany,
    deleteEntry,
    clearAllEntries,
    updateSettings,
    refresh,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
