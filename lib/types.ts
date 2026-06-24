/** Core domain types shared across the app. */

/** The five tracked nutrients. Order is the canonical display order. */
export const NUTRIENTS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
] as const;

export type Nutrient = (typeof NUTRIENTS)[number];

/** Nutrition values for a single food entry (per the stated amount). */
export type Nutrition = Record<Nutrient, number>;

/** A single logged food item. */
export interface FoodEntry {
  id: string;
  /** ISO calendar date, e.g. "2026-06-21". */
  date: string;
  /** 24h local time, e.g. "08:30". */
  time: string;
  name: string;
  /** Free-form amount, e.g. "1 plate", "200 g", "a handful", "2 cups". */
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Optional free-form notes, e.g. brand, preparation method, caveats. */
  notes?: string;
  /** Whether the nutrition values were produced by the AI assistant. */
  aiFilled?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Per-day nutrient targets the user is trying to meet. */
export type DailyGoals = Nutrition;

/** Optional body profile used to estimate goals automatically. */
export interface Profile {
  sex: "male" | "female";
  age: number;
  /** centimetres */
  heightCm: number;
  /** kilograms */
  weightKg: number;
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain";
}

export type AiProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "openrouter"
  | "xai"
  | "ollama";

/** Providers that proxy through our backend (need an API key). */
export const CLOUD_PROVIDERS: AiProvider[] = [
  "anthropic",
  "openai",
  "gemini",
  "openrouter",
  "xai",
];

export interface AiSettings {
  provider: AiProvider;
  /** API keys per cloud provider. Kept only on this device. */
  apiKeys: Partial<Record<AiProvider, string>>;
  /** Selected model id per provider. */
  models: Partial<Record<AiProvider, string>>;
  /** Base URL for the local Ollama server, e.g. "http://localhost:11434". */
  ollamaBaseUrl: string;
  /** When true (and signed in), API keys are synced to the user's cloud account. */
  syncKeys?: boolean;
}

export interface Settings {
  ai: AiSettings;
  goals: DailyGoals;
  profile?: Profile;
  name?: string;
}

/** Shape returned by the AI nutrition estimator for one item. */
export interface NutritionEstimate extends Nutrition {
  /** Optional short note, e.g. assumptions the model made. */
  note?: string;
}
