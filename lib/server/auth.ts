import "server-only";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "./session";

/**
 * Verify a request by checking (in order):
 *  1. The long-lived HTTP-only session cookie (set by /api/auth/session).
 *  2. A short-lived Google ID token in the Authorization header (fallback for
 *     the first request right after sign-in, before the cookie is issued).
 *
 * Returns the stable Google account id (`sub`), or null when unauthenticated.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const client = new OAuth2Client();

export async function verifyRequest(request: NextRequest): Promise<string | null> {
    // 1. Session cookie (preferred — long-lived, no Google round-trip).
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    if (cookie) {
        const payload = verifySessionToken(cookie);
        if (payload) return payload.sub;
    }

    // 2. Bearer token fallback (short-lived Google ID token).
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.slice(7);
    if (!CLIENT_ID) return null;

    try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
        return ticket.getPayload()?.sub ?? null;
    } catch {
        return null;
    }
}
