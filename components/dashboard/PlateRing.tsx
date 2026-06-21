"use client";

import { useState } from "react";
import { NUTRIENTS, Nutrient, Nutrition } from "@/lib/types";
import { NUTRIENT_HEX, NUTRIENT_META, roundNutrient } from "@/lib/nutrition";
import { DailyGoals } from "@/lib/types";
import { useCountUp } from "@/hooks/useCountUp";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/**
 * The "plate" — concentric rings, one per nutrient, each filling toward its
 * daily goal. The signature element of the journal.
 */
export function PlateRing({ totals, goals }: { totals: Nutrition; goals: DailyGoals }) {
  // Unclamped — values can exceed 1.0 when a goal is surpassed
  const progress = Object.fromEntries(
    NUTRIENTS.map((n) => [n, goals[n] > 0 ? totals[n] / goals[n] : 0])
  ) as Record<Nutrient, number>;
  const [hovered, setHovered] = useState<Nutrient | null>(null);
  const size = 220;
  const c = size / 2;
  const stroke = 12;
  const gap = 15;
  // Inner edge of the innermost ring, minus a small gap — fills center with surface color
  const centerR = c - 8 - (NUTRIENTS.length - 1) * gap - stroke / 2 - 3;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Daily nutrient progress">
        <circle cx={c} cy={c} r={centerR} fill="var(--color-surface)" />
        {NUTRIENTS.map((n, i) => (
          <Ring
            key={n}
            nutrient={n}
            c={c}
            r={c - 8 - i * gap}
            stroke={stroke}
            filled={progress[n]}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
        {hovered ? (
          <div className="flex flex-col items-center gap-0.5">
            <div className="text-[0.58rem] font-semibold uppercase tracking-[0.18em]" style={{ color: NUTRIENT_HEX[hovered] }}>
              {NUTRIENT_META[hovered].label}
            </div>
            <div className="nums font-display text-xl font-semibold leading-none text-ink">
              {Math.round(progress[hovered] * 100)}%
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <AnimatedNumber
              value={totals.calories}
              format={(v) => roundNutrient("calories", v)}
              className="nums font-display text-2xl font-semibold leading-none text-ink"
            />
            <div className="flex flex-col items-center gap-px">
              <span className="text-[0.62rem] font-medium text-ink-soft">of {goals.calories}</span>
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-ink-faint">kcal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A single animated progress ring that fills from empty on mount. */
function Ring({
  nutrient, c, r, stroke, filled, onMouseEnter, onMouseLeave,
}: {
  nutrient: Nutrient; c: number; r: number; stroke: number; filled: number;
  onMouseEnter: () => void; onMouseLeave: () => void;
}) {
  const animated = useCountUp(filled, 700);
  const circ = 2 * Math.PI * r;
  const mainFill = Math.min(1, animated);
  const overflow = Math.max(0, animated - 1);
  return (
    <g transform={`rotate(-90 ${c} ${c})`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: "default" }}>
      {/* Track */}
      <circle cx={c} cy={c} r={r} fill="none" stroke={NUTRIENT_HEX[nutrient]} strokeOpacity={0.2} strokeWidth={stroke} />
      {/* Main fill arc — slightly sub-opaque so the overlap region darkens visibly */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={NUTRIENT_HEX[nutrient]}
        strokeOpacity={overflow > 0 ? 0.78 : 1}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${mainFill * circ} ${circ}`}
      />
      {/* Overflow: same color/opacity wraps from start — overlap region compounds to ~0.95, visibly bolder */}
      {overflow > 0 && (
        <circle
          cx={c} cy={c} r={r} fill="none"
          stroke={NUTRIENT_HEX[nutrient]}
          strokeOpacity={0.78}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${overflow * circ} ${circ}`}
        />
      )}
      {/* Transparent wider hit area for easier hovering */}
      <circle cx={c} cy={c} r={r} fill="none" stroke="transparent" strokeWidth={stroke + 8} />
    </g>
  );
}

/** Legend mapping each ring color to its nutrient — keeps the plate accessible. */
export function PlateLegend({ totals, goals }: { totals: Nutrition; goals: DailyGoals }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:grid-cols-1">
      {NUTRIENTS.map((n) => {
        const meta = NUTRIENT_META[n];
        const met = goals[n] > 0 && totals[n] >= goals[n];
        return (
          <li key={n} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NUTRIENT_HEX[n] }} aria-hidden="true" />
            <span className="text-ink-soft">{meta.label}</span>
            <span className="nums ml-auto font-medium text-ink">
              <AnimatedNumber value={totals[n]} format={(v) => roundNutrient(n, v)} />
              <span className="text-ink-faint">/{goals[n]}{meta.unit === "kcal" ? "" : "g"}</span>
            </span>
            {met && <span className="text-fiber" aria-label="goal met">✓</span>}
          </li>
        );
      })}
    </ul>
  );
}
