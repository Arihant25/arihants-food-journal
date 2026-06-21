"use client";

import { useCountUp } from "@/hooks/useCountUp";

/**
 * Renders a number that counts up from 0 to `value` on mount. `format` shapes
 * the in-flight value for display (e.g. rounding); defaults to whole numbers.
 */
export function AnimatedNumber({
    value,
    format = (v) => Math.round(v),
    duration,
    className,
}: {
    value: number;
    format?: (v: number) => React.ReactNode;
    duration?: number;
    className?: string;
}) {
    const current = useCountUp(value, duration);
    return <span className={className}>{format(current)}</span>;
}
