import "server-only";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";

/**
 * Verify a Google Identity Services ID token (from One Tap / FedCM sign-in) and
 * return the stable Google account id (`sub`). Returns null when missing or invalid.
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const client = new OAuth2Client();

export async function verifyRequest(request: NextRequest): Promise<string | null> {
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
