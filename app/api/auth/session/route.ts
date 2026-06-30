import { OAuth2Client } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_OPTIONS, createSessionToken } from "@/lib/server/session";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const client = new OAuth2Client();

/** Exchange a Google ID token for a long-lived HTTP-only session cookie. */
export async function POST(request: NextRequest) {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idToken = header.slice(7);
    if (!CLIENT_ID) return Response.json({ error: "Not configured" }, { status: 500 });

    try {
        const ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload?.sub) return Response.json({ error: "Invalid token" }, { status: 401 });

        const sessionToken = createSessionToken(payload.sub, {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
        });

        const res = NextResponse.json({ ok: true });
        res.cookies.set({ ...COOKIE_OPTIONS, value: sessionToken });
        return res;
    } catch {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
}

/** Clear the session cookie (sign out). */
export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE_OPTIONS.name);
    return res;
}
