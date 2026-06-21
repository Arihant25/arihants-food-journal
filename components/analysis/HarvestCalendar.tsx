"use client";

import { DailyGoals, NUTRIENTS, Nutrition } from "@/lib/types";
import { NUTRIENT_HEX, NUTRIENT_META, goalsMet } from "@/lib/nutrition";
import { MONTH_NAMES, monthGrid } from "@/lib/analysis";
import { fromISODate, todayISO } from "@/lib/date";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * "Harvest calendar" — every day grows a seed-dot for each nutrient goal it met.
 * Color alone isn't accessible, so each day also carries a descriptive label.
 */
export function HarvestCalendar({
  year,
  month,
  totals,
  goals,
  onPrev,
  onNext,
}: {
  year: number;
  month: number;
  totals: Map<string, Nutrition>;
  goals: DailyGoals;
  onPrev: () => void;
  onNext: () => void;
}) {
  const weeks = monthGrid(year, month);
  const today = todayISO();

  return (
    <div className="rounded-organic border border-line bg-surface p-5 shadow-[0_1px_3px_#2b272210] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">
          {MONTH_NAMES[month]} <span className="text-ink-soft">{year}</span>
        </h2>
        <div className="flex gap-1">
          <CalNav label="Previous month" onClick={onPrev}>‹</CalNav>
          <CalNav label="Next month" onClick={onNext}>›</CalNav>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {d}
          </div>
        ))}

        {weeks.flat().map((iso, i) => {
          if (!iso) return <div key={i} aria-hidden="true" />;
          const t = totals.get(iso);
          const met = t ? goalsMet(t, goals) : null;
          const metList = met ? NUTRIENTS.filter((n) => met[n]) : [];
          const dayNum = fromISODate(iso).getDate();
          const isToday = iso === today;
          const label = metList.length
            ? `${MONTH_NAMES[month]} ${dayNum}: ${metList.map((n) => NUTRIENT_META[n].label).join(", ")} goal${metList.length > 1 ? "s" : ""} met`
            : `${MONTH_NAMES[month]} ${dayNum}: ${t ? "logged, no goals met" : "nothing logged"}`;

          return (
            <div
              key={i}
              aria-label={label}
              className={`flex aspect-square flex-col items-center justify-between rounded-lg border p-1.5 ${
                isToday ? "border-herb bg-herb-soft/50" : t ? "border-line bg-paper/40" : "border-transparent"
              }`}
            >
              <span className={`nums text-xs ${isToday ? "font-bold text-herb-deep" : "text-ink-soft"}`}>{dayNum}</span>
              <div className="flex flex-wrap items-center justify-center gap-0.5">
                {metList.map((n) => (
                  <span key={n} className="h-2 w-2 rounded-full" style={{ background: NUTRIENT_HEX[n] }} title={`${NUTRIENT_META[n].label} met`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line-soft pt-3">
        {NUTRIENTS.map((n) => (
          <li key={n} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ background: NUTRIENT_HEX[n] }} aria-hidden="true" />
            {NUTRIENT_META[n].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalNav({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-pill border border-line bg-surface text-lg text-ink-soft transition hover:border-herb hover:text-herb"
    >
      {children}
    </button>
  );
}
