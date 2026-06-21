"use client";

import { useEffect, useRef, useState } from "react";

/** easeOutCubic — fast start, gentle settle. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animate a number from 0 up to `value` on mount, and tween between values on
 * later changes. Returns the current in-flight value. Honors reduced-motion by
 * snapping straight to the target.
 */
export function useCountUp(value: number, duration = 900): number {
    const [display, setDisplay] = useState(0);
    const displayRef = useRef(0);
    const rafRef = useRef(0);

    useEffect(() => {
        const reduce =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (reduce || duration <= 0) {
            displayRef.current = value;
            // Snap on the next frame rather than synchronously in the effect body.
            rafRef.current = requestAnimationFrame(() => setDisplay(value));
            return () => cancelAnimationFrame(rafRef.current);
        }

        const from = displayRef.current;
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const v = from + (value - from) * ease(t);
            displayRef.current = v;
            setDisplay(v);
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration]);

    return display;
}
