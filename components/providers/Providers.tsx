"use client";

import { SessionProvider } from "./SessionProvider";
import { StoreProvider } from "./StoreProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
