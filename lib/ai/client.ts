import { AiSettings, DailyGoals, NutritionEstimate, Profile } from "@/lib/types";
import { coerceNutrition, goalsMessages, nutritionMessages, NutritionItemInput, parseJsonLoose } from "./prompt";
import { ollamaComplete, ollamaListModels } from "./ollama";

/**
 * Browser-facing AI client. Cloud providers are proxied through /api/ai (keeps
 * provider request shapes server-side and avoids CORS); Ollama is called
 * directly from the browser.
 */

function activeModel(ai: AiSettings): string {
  const model = ai.provider === "ollama" ? ai.models.ollama : ai.models[ai.provider];
  if (!model) throw new Error("No model selected for this provider. Choose one in Settings.");
  return model;
}

async function runMessages(ai: AiSettings, messages: { role: "system" | "user"; content: string }[]): Promise<string> {
  const model = activeModel(ai);
  if (ai.provider === "ollama") {
    return ollamaComplete(ai.ollamaBaseUrl, model, messages);
  }
  const apiKey = ai.apiKeys[ai.provider];
  if (!apiKey) throw new Error("No API key set for this provider. Add one in Settings.");
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "complete", provider: ai.provider, apiKey, model, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI request failed");
  return data.text as string;
}

/** Estimate nutrition for a batch of items; result aligns by index. */
export async function estimateNutrition(items: NutritionItemInput[], ai: AiSettings): Promise<NutritionEstimate[]> {
  const text = await runMessages(ai, nutritionMessages(items));
  const parsed = parseJsonLoose<{ items?: Record<string, unknown>[] }>(text);
  const rows = parsed.items ?? [];
  return items.map((_, i) => coerceNutrition(rows[i] ?? {}));
}

/** Ask the model to recommend daily goals from a body profile. */
export async function recommendGoals(profile: Profile, ai: AiSettings): Promise<DailyGoals & { note?: string }> {
  const text = await runMessages(ai, goalsMessages(profile));
  const parsed = parseJsonLoose<Record<string, unknown>>(text);
  return { ...coerceNutrition(parsed), note: typeof parsed.note === "string" ? parsed.note : undefined };
}

/** List available models for the active provider (Ollama in-browser, others via proxy). */
export async function discoverModels(ai: AiSettings): Promise<string[]> {
  if (ai.provider === "ollama") return ollamaListModels(ai.ollamaBaseUrl);
  const apiKey = ai.apiKeys[ai.provider];
  if (!apiKey) throw new Error("Add an API key first, then fetch models.");
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "models", provider: ai.provider, apiKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not fetch models");
  return data.models as string[];
}
