import { NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { settingsCollection } from "@/lib/server/db";
import { AiProvider } from "@/lib/types";

/**
 * Cloud storage for a signed-in user's AI API keys. Opt-in only: the browser
 * writes here when the user enables "Sync API keys" in Settings, and clears it
 * (DELETE) when they turn it off. Every request is authenticated and scoped to
 * the user's Google account id.
 */

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const serverError = (e: unknown) =>
  Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });

/** Return the user's synced settings (API keys + name). */
export async function GET(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const col = await settingsCollection();
    const doc = await col.findOne({ userId }, { projection: { _id: 0, userId: 0 } });
    return Response.json({ apiKeys: doc?.apiKeys ?? {}, name: doc?.name ?? null });
  } catch (e) {
    return serverError(e);
  }
}

/** Upsert the user's settings (API keys and/or name). */
export async function PUT(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const body = (await request.json()) as { apiKeys?: Partial<Record<AiProvider, string>>; name?: string };
    const col = await settingsCollection();
    const $set: Record<string, unknown> = { updatedAt: Date.now() };
    if (body.apiKeys !== undefined) $set.apiKeys = body.apiKeys;
    if ("name" in body) $set.name = body.name ?? null;
    await col.updateOne({ userId }, { $set, $setOnInsert: { userId } } as object, { upsert: true });
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}

/** Remove the user's synced keys (called when sync is turned off). */
export async function DELETE(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const col = await settingsCollection();
    await col.deleteOne({ userId });
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
