"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountButton } from "./AccountButton";
import { useStore } from "../providers/StoreProvider";

const LINKS = [
    { href: "/", label: "Journal" },
    { href: "/analysis", label: "Analysis" },
    { href: "/settings", label: "Settings" },
];

export function AppNav() {
    const pathname = usePathname();
    const { settings } = useStore();
    const displayName = settings.name?.trim() || "Arihant";

    return (
        <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6">
                <Link href="/" className="group flex items-center gap-2.5" aria-label={`${displayName}'s Food Journal home`}>
                    <Sprig />
                    <span className="font-display text-lg font-semibold leading-none tracking-tight text-herb-deep">
                        {displayName}&rsquo;s
                        <span className="block text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ink-soft">
                            Food Journal
                        </span>
                    </span>
                </Link>

                <nav aria-label="Primary" className="order-last flex w-full items-center justify-center gap-1 rounded-pill bg-surface/70 p-1 shadow-[0_1px_0_#fff_inset,0_1px_3px_#0000000d] sm:order-none sm:w-auto sm:justify-start">
                    {LINKS.map((link) => {
                        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? "page" : undefined}
                                className={`rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4 ${active
                                    ? "bg-herb text-paper shadow-sm"
                                    : "text-ink-soft hover:bg-herb-soft hover:text-herb-deep"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <AccountButton />
            </div>
        </header>
    );
}

/** A small hand-drawn sprig — the brand mark. */
function Sprig() {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M12 21V8" stroke="var(--color-herb)" strokeWidth="1.8" strokeLinecap="round" />
            <path
                d="M12 12c-2.4 0-4.2-1.6-4.6-4 2.5-.3 4.4 1.1 4.6 4Z"
                fill="var(--color-fiber)"
            />
            <path
                d="M12 9.5c.3-2.6 2.3-4.2 5-3.8-.2 2.6-2.2 4.2-5 3.8Z"
                fill="var(--color-herb)"
            />
        </svg>
    );
}
