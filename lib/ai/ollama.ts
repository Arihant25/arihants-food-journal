import { ChatMessage } from "./prompt";

/**
 * Ollama is called directly from the browser: when the app is hosted on Vercel,
 * a server function can't reach a user's local machine. The user must allow the
 * app's origin via OLLAMA_ORIGINS (see Settings for instructions).
 */

const trim = (base: string) => base.replace(/\/+$/, "");

export async function ollamaListModels(baseUrl: string): Promise<string[]> {
  const res = await fetch(`${trim(baseUrl)}/api/tags`);
  if (!res.ok) throw new Error(`Ollama responded ${res.status}. Is it running and reachable?`);
  const data = await res.json();
  return (data.models ?? []).map((m: { name: string }) => m.name);
}

export async function ollamaComplete(baseUrl: string, model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${trim(baseUrl)}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, format: "json" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Ollama responded ${res.status}`);
  }
  const data = await res.json();
  return data.message?.content ?? "";
}
