import { NextRequest } from "next/server";
import { complete, listModels } from "@/lib/ai/providers";
import { ChatMessage } from "@/lib/ai/prompt";
import { AiProvider, CLOUD_PROVIDERS } from "@/lib/types";

/**
 * Proxy for cloud LLM providers. The browser sends the provider, the user's
 * API key (held only on their device), and the prompt; we forward to the
 * provider and return the text. Nothing is persisted here.
 */

interface Body {
  action: "complete" | "models";
  provider: AiProvider;
  apiKey: string;
  model?: string;
  messages?: ChatMessage[];
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { action, provider, apiKey, model, messages } = body;

  if (!CLOUD_PROVIDERS.includes(provider)) {
    return Response.json({ error: "Unknown or non-proxied provider" }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: "Missing API key" }, { status: 400 });
  }

  try {
    if (action === "models") {
      const models = await listModels(provider, apiKey);
      return Response.json({ models });
    }
    if (action === "complete") {
      if (!model || !messages?.length) {
        return Response.json({ error: "Missing model or messages" }, { status: 400 });
      }
      const text = await complete(provider, apiKey, model, messages);
      return Response.json({ text });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provider request failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
