/** Decode a JWT payload client-side (no verification — display only). */
export interface GoogleClaims {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  exp: number;
}

export function decodeJwt(token: string): GoogleClaims | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json))) as GoogleClaims;
  } catch {
    return null;
  }
}
