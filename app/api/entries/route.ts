import { NextRequest } from "next/server";
import { verifyRequest } from "@/lib/server/auth";
import { entriesCollection } from "@/lib/server/db";
import { FoodEntry } from "@/lib/types";

/**
 * Cloud sync for a signed-in user's journal. Every request is authenticated
 * with a Google ID token and scoped to that user's account id.
 */

const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
const serverError = (e: unknown) =>
  Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });

/** List all of the user's entries. */
export async function GET(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const col = await entriesCollection();
    const docs = await col.find({ userId }, { projection: { _id: 0, userId: 0 } }).toArray();
    return Response.json({ entries: docs });
  } catch (e) {
    return serverError(e);
  }
}

/** Upsert a single entry. */
export async function PUT(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const entry = (await request.json()) as FoodEntry;
    if (!entry?.id) return Response.json({ error: "Missing entry id" }, { status: 400 });
    const col = await entriesCollection();
    await col.replaceOne({ userId, id: entry.id }, { ...entry, userId }, { upsert: true });
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}

/** Bulk upsert (used when first signing in to push local entries). */
export async function POST(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  try {
    const { entries } = (await request.json()) as { entries: FoodEntry[] };
    if (!Array.isArray(entries) || entries.length === 0) return Response.json({ ok: true });
    const col = await entriesCollection();
    await col.bulkWrite(
      entries.map((entry) => ({
        replaceOne: { filter: { userId, id: entry.id }, replacement: { ...entry, userId }, upsert: true },
      })),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}

/** Delete one entry by id (?id=...) or all entries (?all=true). */
export async function DELETE(request: NextRequest) {
  const userId = await verifyRequest(request);
  if (!userId) return unauthorized();
  const id = request.nextUrl.searchParams.get("id");
  const all = request.nextUrl.searchParams.get("all");
  if (!id && !all) return Response.json({ error: "Missing id or all param" }, { status: 400 });
  try {
    const col = await entriesCollection();
    if (all === "true") {
      await col.deleteMany({ userId });
    } else {
      await col.deleteOne({ userId, id: id! });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
