"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { decodeJwt, GoogleClaims } from "@/lib/jwt";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface SessionValue {
  /** Signed-in user, or null when local-only. */
  user: GoogleClaims | null;
  /** Google ID token used to authenticate cloud requests. */
  token: string | null;
  /** Whether a Google client id is configured at all. */
  configured: boolean;
  /** GIS script finished loading. */
  ready: boolean;
  signOut: () => void;
  /** Render Google's official button into an element. */
  renderButton: (el: HTMLElement) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/* -------------------------------------------------------------------------- */
/* Token store                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The Google ID token, persisted in localStorage and exposed as an external
 * store so React can read it with `useSyncExternalStore` — restoring it on the
 * client without a setState-in-effect (and without a hydration mismatch, since
 * the server snapshot is always null). Also keeps tabs in sync.
 */
const TOKEN_KEY = "afj:gtoken";

let currentToken: string | null = null;
let tokenHydrated = false;
const tokenListeners = new Set<() => void>();
const emitToken = () => {
  for (const listener of tokenListeners) listener();
};

/** Read the stored token, returning it only if present and unexpired. */
function readValidToken(): string | null {
  try {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const claims = decodeJwt(stored);
    if (claims && claims.exp * 1000 > Date.now()) return stored;
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  } catch {
    return null;
  }
}

const tokenStore = {
  getSnapshot: (): string | null => currentToken,
  getServerSnapshot: (): string | null => null,

  subscribe(listener: () => void): () => void {
    tokenListeners.add(listener);
    if (!tokenHydrated) {
      tokenHydrated = true;
      currentToken = readValidToken();
      // Follow sign-in / sign-out in other tabs.
      window.addEventListener("storage", (e) => {
        if (e.key === TOKEN_KEY) {
          currentToken = readValidToken();
          emitToken();
        }
      });
      if (currentToken) emitToken();
    }
    return () => tokenListeners.delete(listener);
  },

  set(token: string) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    currentToken = token;
    emitToken();
  },

  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    currentToken = null;
    emitToken();
  },
};

/* -------------------------------------------------------------------------- */
/* Google Identity Services                                                   */
/* -------------------------------------------------------------------------- */

/* Minimal typings for the Google Identity Services global. */
interface GsiId {
  initialize: (config: Record<string, unknown>) => void;
  prompt: () => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
  disableAutoSelect: () => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.getSnapshot, tokenStore.getServerSnapshot);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  // Pure: just decode. Only valid tokens ever reach the store (fresh from Google,
  // or restored after an expiry check), so there is nothing to reject here.
  const user = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const handleCredential = useCallback((response: { credential: string }) => {
    tokenStore.set(response.credential);
  }, []);

  const initGsi = useCallback(() => {
    if (initialized.current || !CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      use_fedcm_for_prompt: true,
      auto_select: true,
    });
    initialized.current = true;
    setReady(true);
    if (!tokenStore.getSnapshot()) window.google.accounts.id.prompt();
  }, [handleCredential]);

  const signOut = useCallback(() => {
    tokenStore.clear();
    try {
      window.google?.accounts.id.disableAutoSelect();
    } catch {
      /* ignore */
    }
  }, []);

  const renderButton = useCallback((el: HTMLElement) => {
    if (!window.google) return;
    window.google.accounts.id.renderButton(el, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  }, []);

  const value: SessionValue = {
    user,
    token: user ? token : null,
    configured: Boolean(CLIENT_ID),
    ready,
    signOut,
    renderButton,
  };

  return (
    <SessionContext.Provider value={value}>
      {CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initGsi}
        />
      )}
      {children}
    </SessionContext.Provider>
  );
}
