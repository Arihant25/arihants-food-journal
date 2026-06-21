"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "../providers/SessionProvider";
import { useStore } from "../providers/StoreProvider";

const SYNC_LABEL: Record<string, string> = {
    local: "On this device",
    syncing: "Syncing…",
    synced: "Synced to cloud",
    error: "Sync failed — saved locally",
};

export function AccountButton() {
    const { user, configured, signOut, renderButton } = useSession();
    const { sync } = useStore();
    const [open, setOpen] = useState(false);
    const buttonHost = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Render Google's button into the popover when signed out.
    useEffect(() => {
        if (open && !user && buttonHost.current) {
            buttonHost.current.innerHTML = "";
            renderButton(buttonHost.current);
        }
    }, [open, user, renderButton]);

    // Close the panel the moment the user signs in. Adjusting state during render
    // on a detected change is the React-recommended alternative to an effect here.
    const [wasSignedIn, setWasSignedIn] = useState(Boolean(user));
    if (Boolean(user) !== wasSignedIn) {
        setWasSignedIn(Boolean(user));
        if (user) setOpen(false);
    }

    // Close menu on outside click or Escape.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (!configured) {
        return (
            <Link
                href="/settings"
                className="hidden rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-herb hover:text-herb sm:inline-block"
                title="Set up Google sign-in to sync across devices"
            >
                Local mode
            </Link>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`flex items-center gap-2 rounded-pill border border-line bg-surface text-sm font-medium text-ink-soft transition-colors hover:border-herb ${user ? "p-1" : "px-3 py-1"}`}
            >
                {user ? (
                    <Avatar user={user} />
                ) : (
                    <span className="text-herb">Sign in</span>
                )}
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-organic border border-line bg-surface p-3 shadow-[0_8px_30px_#2b272214]"
                >
                    {user ? (
                        <>
                            <div className="flex items-center gap-3 px-1 pb-3">
                                <Avatar user={user} large />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                                    <p className="truncate text-xs text-ink-soft">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-herb-soft px-3 py-2 text-xs text-herb-deep">
                                <span className={`h-1.5 w-1.5 rounded-full ${sync === "error" ? "bg-protein" : "bg-fiber"}`} />
                                {SYNC_LABEL[sync]}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    signOut();
                                    setOpen(false);
                                }}
                                className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-paper-deep"
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="px-1 pb-2 text-xs text-ink-soft">
                                Sign in with Google to back up and sync your journal.
                            </p>
                            <div ref={buttonHost} className="flex justify-center" />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function Avatar({ user, large }: { user: { name?: string; email?: string; picture?: string }; large?: boolean }) {
    const size = large ? "h-9 w-9" : "h-7 w-7";
    const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
    if (user.picture) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={user.picture} alt="" className={`${size} rounded-full object-cover`} referrerPolicy="no-referrer" />;
    }
    return (
        <span className={`${size} grid place-items-center rounded-full bg-herb text-paper`}>{initial}</span>
    );
}
