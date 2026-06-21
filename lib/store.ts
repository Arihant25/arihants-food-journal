import {
  DEFAULT_SETTINGS,
  loadLocalEntries,
  loadSettings,
  mergeEntries,
  saveLocalEntries,
  saveSettings,
} from "./storage";
import { FoodEntry, Settings } from "./types";

/**
 * The app's local-first data, as a tiny external store that React reads with
 * `useSyncExternalStore`. Keeping the source of truth outside React lets us
 * hydrate from localStorage on the client without a setState-in-effect (which
 * would risk a hydration mismatch) — the server snapshot is simply "not yet
 * loaded", and the real data flows in once the client subscribes.
 *
 * localStorage is the persisted mirror: every mutation writes through to it.
 */

export type StoreSnapshot = {
  /** False until the first client-side load completes; UI gates on this. */
  hydrated: boolean;
  entries: FoodEntry[];
  settings: Settings;
};

/** Stable, never-mutated snapshot used on the server and during hydration. */
const SERVER_SNAPSHOT: StoreSnapshot = {
  hydrated: false,
  entries: [],
  settings: DEFAULT_SETTINGS,
};

let snapshot: StoreSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Replace the snapshot (new reference so React re-renders) and notify. */
function set(patch: Partial<StoreSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

/** Load persisted data into the store. Runs once, on the first subscription. */
function hydrate() {
  if (snapshot.hydrated) return;
  snapshot = {
    hydrated: true,
    entries: loadLocalEntries(),
    settings: loadSettings(),
  };
  emit();
}

export const store = {
  getSnapshot: (): StoreSnapshot => snapshot,
  getServerSnapshot: (): StoreSnapshot => SERVER_SNAPSHOT,

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    hydrate();
    return () => listeners.delete(listener);
  },

  getEntries: (): FoodEntry[] => snapshot.entries,
  getSettings: (): Settings => snapshot.settings,

  /** Set the full entry list, persisting it. */
  setEntries(entries: FoodEntry[]) {
    saveLocalEntries(entries);
    set({ entries });
  },

  upsertEntry(entry: FoodEntry) {
    this.setEntries(mergeEntries(snapshot.entries.filter((e) => e.id !== entry.id), [entry]));
  },

  upsertMany(incoming: FoodEntry[]) {
    this.setEntries(mergeEntries(snapshot.entries, incoming));
  },

  deleteEntry(id: string) {
    this.setEntries(snapshot.entries.filter((e) => e.id !== id));
  },

  clearEntries() {
    this.setEntries([]);
  },

  /** Set the full settings object, persisting it. */
  setSettings(settings: Settings) {
    saveSettings(settings);
    set({ settings });
  },

  updateSettings(patch: Partial<Settings>) {
    this.setSettings({ ...snapshot.settings, ...patch });
  },
};
