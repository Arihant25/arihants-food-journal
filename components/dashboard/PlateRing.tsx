"use client";

import { useState } from "react";
import { NUTRIENTS, Nutrient, Nutrition } from "@/lib/types";
import { NUTRIENT_HEX, NUTRIENT_META, goalProgress, roundNutrient } from "@/lib/nutrition";
import { DailyGoals } from "@/lib/types";
import { useCountUp } from "@/hooks/useCountUp";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/**
 * The "plate" — concentric rings, one per nutrient, each filling toward its
 * daily goal. The signature element of the journal.
 */
export function PlateRing({ totals, goals }: { totals: Nutrition; goals: DailyGoals }) {
  const progress = goalProgress(totals, goals);
  const [hovered, setHovered] = useState<Nutrient | null>(null);
  const size = 184;
  const c = size / 2;
  const stroke = 9;
  const gap = 13;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Daily nutrient progress">
        {NUTRIENTS.map((n, i) => (
          <Ring
            key={n}
            nutrient={n}
            c={c}
            r={c - 8 - i * gap}
            stroke={stroke}
            filled={Math.min(1, progress[n])}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
        {hovered ? (
          <div>
            <div className="text-[0.65rem] font-medium uppercase tracking-[0.14em]" style={{ color: NUTRIENT_HEX[hovered] }}>
              {NUTRIENT_META[hovered].label}
            </div>
            <div className="nums font-display text-2xl font-semibold leading-none text-ink">
              {Math.round(Math.min(1, progress[hovered]) * 100)}%
            </div>
          </div>
        ) : (
          <div>
            <AnimatedNumber
              value={totals.calories}
              format={(v) => roundNutrient("calories", v)}
              className="nums font-display text-3xl font-semibold leading-none text-ink"
            />
            <div className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-ink-soft">
              of {goals.calories} kcal
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
  return (
    <g transform={`rotate(-90 ${c} ${c})`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: "default" }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={NUTRIENT_HEX[nutrient]} strokeOpacity={0.16} strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={NUTRIENT_HEX[nutrient]}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${animated * circ} ${circ}`}
      />
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
