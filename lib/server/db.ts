import "server-only";
import { MongoClient, Collection } from "mongodb";
import { AiProvider, FoodEntry } from "../types";

/**
 * MongoDB connection, cached across hot reloads in development. Used only by the
 * cloud-sync route handlers; the app works fully without it.
 */

const DB_NAME = "arihants_food_journal";

type StoredEntry = FoodEntry & { userId: string };

/** A user's synced settings: their display name plus, optionally, AI API keys. */
export type StoredSettings = {
    userId: string;
    apiKeys: Partial<Record<AiProvider, string>>;
    name?: string | null;
    updatedAt: number;
};

declare global {
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not configured");
    if (!global._mongoClientPromise) {
        const p = new MongoClient(uri).connect();
        // Only cache the promise after a successful connection; a rejected
        // promise would otherwise be re-used on every subsequent request.
        p.catch(() => { global._mongoClientPromise = undefined; });
        global._mongoClientPromise = p;
    }
    return global._mongoClientPromise;
}

export async function entriesCollection(): Promise<Collection<StoredEntry>> {
    const client = await clientPromise();
    const col = client.db(DB_NAME).collection<StoredEntry>("entries");
    // Idempotent: ensures fast per-user lookups and uniqueness of an entry id per user.
    await col.createIndex({ userId: 1, id: 1 }, { unique: true });
    return col;
}

export async function settingsCollection(): Promise<Collection<StoredSettings>> {
    const client = await clientPromise();
    const col = client.db(DB_NAME).collection<StoredSettings>("settings");
    // One settings document per user.
    await col.createIndex({ userId: 1 }, { unique: true });
    return col;
}
