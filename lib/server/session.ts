import "server-only";
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "";
export const COOKIE_NAME = "afj-session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export interface SessionPayload {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
    iat: number;
    exp: number;
}

function sign(payload: object): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
    if (!SECRET) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const [header, body, sig] = parts;
        const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
        if (!crypto.timingSafeEqual(Buffer.from(sig, "ascii"), Buffer.from(expected, "ascii"))) return null;
        const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
        if (payload.exp * 1000 <= Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

export function createSessionToken(
    sub: string,
    profile: { name?: string; email?: string; picture?: string },
): string {
    const now = Math.floor(Date.now() / 1000);
    return sign({ sub, ...profile, iat: now, exp: now + MAX_AGE });
}

export const COOKIE_OPTIONS = {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
};
