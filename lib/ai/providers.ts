import "server-only";
import { AiProvider } from "@/lib/types";
import { ChatMessage } from "./prompt";

/**
 * Server-side adapters for the cloud LLM providers. Each is called from the
 * /api/ai route with a key supplied per-request (the key lives in the user's
 * browser; it is never stored on the server). Ollama is handled in the browser
 * (see ollama.ts) because a Vercel function can't reach a user's local machine.
 */

const OPENAI_COMPATIBLE: Partial<Record<AiProvider, { base: string; title?: string }>> = {
  openai: { base: "https://api.openai.com/v1" },
  openrouter: { base: "https://openrouter.ai/api/v1", title: "Arihant's Food Journal" },
  xai: { base: "https://api.x.ai/v1" },
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const ANTHROPIC_BASE = "https://api.anthropic.com";

async function failBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text);
    return j.error?.message || j.error || text || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

/* ------------------------------ completion -------------------------------- */

export async function complete(
  provider: AiProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  if (provider === "anthropic") return completeAnthropic(apiKey, model, messages);
  if (provider === "gemini") return completeGemini(apiKey, model, messages);
  if (OPENAI_COMPATIBLE[provider]) return completeOpenAICompatible(provider, apiKey, model, messages);
  throw new Error(`Unsupported provider: ${provider}`);
}

async function completeAnthropic(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(await failBody(res));
  const data = await res.json();
  return (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
}

async function completeOpenAICompatible(
  provider: AiProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const cfg = OPENAI_COMPATIBLE[provider]!;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };
  if (cfg.title) headers["x-title"] = cfg.title;

  const body = (withJsonMode: boolean) =>
    JSON.stringify({
      model,
      messages,
      ...(withJsonMode ? { response_format: { type: "json_object" } } : {}),
    });

  // Try with JSON mode; retry once without it if the model rejects the param.
  let res = await fetch(`${cfg.base}/chat/completions`, { method: "POST", headers, body: body(true) });
  if (res.status === 400) {
    res = await fetch(`${cfg.base}/chat/completions`, { method: "POST", headers, body: body(false) });
  }
  if (!res.ok) throw new Error(await failBody(res));
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function completeGemini(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  const res = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(await failBody(res));
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

/* ----------------------------- model discovery ---------------------------- */

export async function listModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  if (provider === "anthropic") {
    const res = await fetch(`${ANTHROPIC_BASE}/v1/models?limit=100`, {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!res.ok) throw new Error(await failBody(res));
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => m.id);
  }
  if (provider === "gemini") {
    const res = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}&pageSize=200`);
    if (!res.ok) throw new Error(await failBody(res));
    const data = await res.json();
    return (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""));
  }
  const cfg = OPENAI_COMPATIBLE[provider];
  if (cfg) {
    const res = await fetch(`${cfg.base}/models`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(await failBody(res));
    const data = await res.json();
    return (data.data ?? []).map((m: { id: string }) => m.id).sort();
  }
  throw new Error(`Unsupported provider: ${provider}`);
}
