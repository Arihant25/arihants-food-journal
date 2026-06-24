import { NUTRIENTS, Profile } from "@/lib/types";

/** A chat message in the provider-neutral shape our adapters consume. */
export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface NutritionItemInput {
  name: string;
  /** Free-form amount, e.g. "1 plate", "200 g", "a handful". */
  amount: string;
  /** Optional extra context, e.g. brand, preparation method. */
  notes?: string;
}

const NUTRIENT_GUIDE =
  "calories in kcal, protein/carbs/fat/fiber in grams — all for the TOTAL amount stated, not per 100g";

/** Build the prompt that asks the model to estimate nutrition for each item. */
export function nutritionMessages(items: NutritionItemInput[]): ChatMessage[] {
  const list = items
    .map((it, i) => {
      const base = `${i + 1}. ${it.name} — ${it.amount}`;
      return it.notes?.trim() ? `${base} (${it.notes.trim()})` : base;
    })
    .join("\n");

  return [
    {
      role: "system",
      content:
        "You are a precise nutrition estimator backed by food-composition databases. " +
        "Estimate nutrition for each food item using typical values for the named food. " +
        "Each item gives a free-form amount (e.g. '1 plate', '200 g', 'a handful', '2 cups'); " +
        "interpret it using typical serving sizes for that food. " +
        `Values: ${NUTRIENT_GUIDE}. ` +
        'Respond with ONLY a JSON object of the form {"items":[{"calories":N,"protein":N,"carbs":N,"fat":N,"fiber":N}]} ' +
        "with one entry per input item, in the same order. Numbers only — no units, no comments, no markdown.",
    },
    {
      role: "user",
      content: `Estimate nutrition for these items:\n${list}`,
    },
  ];
}

/** Build the prompt that recommends daily nutrition targets from a profile. */
export function goalsMessages(p: Profile): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a registered dietitian. Recommend sensible daily nutrition targets for the person described. " +
        'Respond with ONLY a JSON object {"calories":N,"protein":N,"carbs":N,"fat":N,"fiber":N,"note":"short rationale"}. ' +
        "calories in kcal; protein, carbs, fat, fiber in grams. Numbers only for the targets.",
    },
    {
      role: "user",
      content:
        `Profile: ${p.sex}, age ${p.age}, height ${p.heightCm} cm, weight ${p.weightKg} kg, ` +
        `activity level ${p.activity.replace("_", " ")}, goal to ${p.goal} weight.`,
    },
  ];
}

/** Extract the first JSON value from a model response, tolerating prose/fences. */
export function parseJsonLoose<T>(text: string): T {
  let t = text.trim();
  // Strip ```json … ``` fences.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Otherwise slice from the first bracket to its match.
  const start = t.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  const end = t.lastIndexOf(close);
  const slice = t.slice(start, end + 1);
  return JSON.parse(slice) as T;
}

/** Coerce a loose nutrition object into clean numbers. */
export function coerceNutrition(raw: Record<string, unknown>) {
  const out = {} as Record<(typeof NUTRIENTS)[number], number>;
  for (const n of NUTRIENTS) {
    const v = Number(raw?.[n]);
    out[n] = Number.isFinite(v) && v >= 0 ? v : 0;
  }
  return out;
}
