import { DailyGoals, FoodEntry, Nutrient, NUTRIENTS, Nutrition, Profile } from "./types";

/** Per-nutrient presentation metadata. Colors mirror globals.css tokens. */
export const NUTRIENT_META: Record<
  Nutrient,
  { label: string; short: string; unit: string; color: string; soft: string }
> = {
  calories: { label: "Calories", short: "Cal", unit: "kcal", color: "var(--color-cal)", soft: "var(--color-cal-soft)" },
  protein: { label: "Protein", short: "Pro", unit: "g", color: "var(--color-protein)", soft: "var(--color-protein-soft)" },
  carbs: { label: "Carbs", short: "Carb", unit: "g", color: "var(--color-carbs)", soft: "var(--color-carbs-soft)" },
  fat: { label: "Fat", short: "Fat", unit: "g", color: "var(--color-fat)", soft: "var(--color-fat-soft)" },
  fiber: { label: "Fiber", short: "Fib", unit: "g", color: "var(--color-fiber)", soft: "var(--color-fiber-soft)" },
};

/** Hex equivalents for contexts that can't read CSS vars (Recharts, canvas). */
export const NUTRIENT_HEX: Record<Nutrient, string> = {
  calories: "#e0a23b",
  protein: "#c2435a",
  carbs: "#df7a2c",
  fat: "#b08a2e",
  fiber: "#5a9e63",
};

/** Sensible starting targets for an average adult; editable in Settings. */
export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 70,
  fiber: 30,
};

export const emptyNutrition = (): Nutrition => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
});

/** Sum the nutrition of a set of entries (typically one day's worth). */
export function sumNutrition(entries: FoodEntry[]): Nutrition {
  return entries.reduce((acc, e) => {
    for (const n of NUTRIENTS) acc[n] += Number(e[n]) || 0;
    return acc;
  }, emptyNutrition());
}

/** Round a nutrient total for display (calories whole, macros 1dp). */
export function roundNutrient(n: Nutrient, value: number): number {
  return n === "calories" ? Math.round(value) : Math.round(value * 10) / 10;
}

/** Which nutrient goals a day's totals meet (>= target). */
export function goalsMet(totals: Nutrition, goals: DailyGoals): Record<Nutrient, boolean> {
  return NUTRIENTS.reduce(
    (acc, n) => {
      acc[n] = goals[n] > 0 && totals[n] >= goals[n];
      return acc;
    },
    {} as Record<Nutrient, boolean>,
  );
}

/** 0–1 progress toward each goal, clamped. */
export function goalProgress(totals: Nutrition, goals: DailyGoals): Record<Nutrient, number> {
  return NUTRIENTS.reduce(
    (acc, n) => {
      acc[n] = goals[n] > 0 ? Math.min(1, totals[n] / goals[n]) : 0;
      return acc;
    },
    {} as Record<Nutrient, number>,
  );
}

/**
 * Estimate daily goals from a body profile.
 * Calories via Mifflin-St Jeor BMR x activity factor, adjusted for goal.
 * Macros from common ratios; fiber from the 14g / 1000 kcal guideline.
 */
export function goalsFromProfile(p: Profile): DailyGoals {
  const bmr =
    10 * p.weightKg +
    6.25 * p.heightCm -
    5 * p.age +
    (p.sex === "male" ? 5 : -161);

  const activityFactor = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }[p.activity];

  const goalAdjust = { lose: -0.15, maintain: 0, gain: 0.12 }[p.goal];
  const calories = Math.round((bmr * activityFactor) * (1 + goalAdjust));

  // Protein scaled to bodyweight; fat ~28% of energy; carbs fill the rest.
  const protein = Math.round(p.weightKg * (p.goal === "lose" ? 1.8 : 1.6));
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((calories / 1000) * 14);

  return { calories, protein, carbs, fat, fiber };
}
