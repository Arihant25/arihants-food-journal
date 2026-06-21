import { FoodEntry, Nutrition } from "./types";
import { emptyNutrition, sumNutrition } from "./nutrition";
import { addDays, toISODate, todayISO } from "./date";

/** Sum every entry into per-date nutrition totals. */
export function dailyTotals(entries: FoodEntry[]): Map<string, Nutrition> {
  const byDate = new Map<string, FoodEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const totals = new Map<string, Nutrition>();
  for (const [date, list] of byDate) totals.set(date, sumNutrition(list));
  return totals;
}

/** The last `n` ISO dates, oldest first, ending today. */
export function recentDates(n: number): string[] {
  const today = todayISO();
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

/** Average nutrition across the given dates (counting only days with entries). */
export function averageOver(dates: string[], totals: Map<string, Nutrition>): { avg: Nutrition; daysLogged: number } {
  const logged = dates.filter((d) => totals.has(d));
  if (logged.length === 0) return { avg: emptyNutrition(), daysLogged: 0 };
  const sum = emptyNutrition();
  for (const d of logged) {
    const t = totals.get(d)!;
    sum.calories += t.calories;
    sum.protein += t.protein;
    sum.carbs += t.carbs;
    sum.fat += t.fat;
    sum.fiber += t.fiber;
  }
  const avg = emptyNutrition();
  (Object.keys(sum) as (keyof Nutrition)[]).forEach((k) => (avg[k] = sum[k] / logged.length));
  return { avg, daysLogged: logged.length };
}

/**
 * Calendar grid for a month: a flat array of weeks, each 7 cells.
 * Each cell is an ISO date string, or null for padding outside the month.
 * Weeks start on Sunday.
 */
export function monthGrid(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = first.getDay();

  const cells: (string | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISODate(new Date(year, monthIndex, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
