import { NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { settingsCollection } from "@/lib/server/db";
import { AiProvider, DailyGoals } from "@/lib/types";

/**
 * Cloud storage for a signed-in user's AI API keys. Opt-in only: the browser
 * writes here when the user enables "Sync API keys" in Settings, and clears it
 * (DELETE) when they turn it off. Every request is authenticated and scoped to
 * the user's Google account id.
 */

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const serverError = (e: unknown) =>
  Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });

/** Return the user's synced settings (API keys + daily requirements + name). */
export async function GET(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const col = await settingsCollection();
    const doc = await col.findOne({ userId }, { projection: { _id: 0, userId: 0 } });
    return Response.json({
      apiKeys: doc?.apiKeys ?? {},
      syncKeys: doc?.syncKeys ?? false,
      goals: doc?.goals ?? null,
      name: doc?.name ?? null,
    });
  } catch (e) {
    return serverError(e);
  }
}

/** Upsert the user's settings (API keys, daily requirements, and/or name). */
export async function PUT(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const body = (await request.json()) as {
      apiKeys?: Partial<Record<AiProvider, string>>;
      syncKeys?: boolean;
      goals?: DailyGoals;
      name?: string;
    };
    const col = await settingsCollection();
    const $set: Record<string, unknown> = { updatedAt: Date.now() };
    if (body.apiKeys !== undefined) $set.apiKeys = body.apiKeys;
    if (body.syncKeys !== undefined) $set.syncKeys = body.syncKeys;
    if (body.goals !== undefined) $set.goals = body.goals;
    if ("name" in body) $set.name = body.name ?? null;
    await col.updateOne({ userId }, { $set, $setOnInsert: { userId } } as object, { upsert: true });
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}

/**
 * Remove the user's synced keys and clear the opt-in (called when sync is turned
 * off), so other devices stop adopting them. Only the keys go — daily
 * requirements and name stay synced.
 */
export async function DELETE(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const col = await settingsCollection();
    await col.updateOne(
      { userId },
      { $unset: { apiKeys: "" }, $set: { syncKeys: false, updatedAt: Date.now() } },
      { upsert: true },
    );
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
