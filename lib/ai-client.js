import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ─── Model Mappings ───────────────────────────────────────────────────────────
// 'main'     → heavy creative tasks (article generation)
// 'analysis' → structured reasoning (research, keywords)
// 'fast'     → quick tasks run in parallel (agents, SEO, meta)

export const MODELS = {
  anthropic: {
    main:     "claude-opus-4-8",
    analysis: "claude-sonnet-4-6",
    fast:     "claude-haiku-4-5-20251001",
  },
  openai: {
    main:     "gpt-4o",
    analysis: "gpt-4o",
    fast:     "gpt-4o-mini",
  },
};

/**
 * Normaliza el system prompt para cada proveedor.
 *
 * Acepta:
 *  - string                       → se envía tal cual
 *  - [{ text, cache?: boolean }]  → bloques; los marcados con cache:true llevan
 *                                   cache_control ephemeral (prompt caching de
 *                                   Anthropic: ~90% menos coste en el input
 *                                   repetido entre llamadas, TTL 5 min)
 *  - cacheSystem: true            → atajo para cachear un system prompt string
 *
 * Para OpenAI los bloques se concatenan (su caching es automático).
 * Exportada para poder testearla.
 */
export function normalizeSystemPrompt(systemPrompt, cacheSystem = false) {
  if (!systemPrompt) return { anthropic: undefined, openai: "" };

  if (Array.isArray(systemPrompt)) {
    const blocks = systemPrompt.filter((b) => b && b.text);
    return {
      anthropic: blocks.map((b) => ({
        type: "text",
        text: b.text,
        ...(b.cache ? { cache_control: { type: "ephemeral" } } : {}),
      })),
      openai: blocks.map((b) => b.text).join("\n\n"),
    };
  }

  return {
    anthropic: cacheSystem
      ? [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]
      : systemPrompt,
    openai: systemPrompt,
  };
}

/**
 * Unified AI call — works with both Anthropic and OpenAI.
 * Returns the model's response as a plain string.
 *
 * @param {Object}  opts
 * @param {'anthropic'|'openai'} opts.provider   - AI provider to use
 * @param {'main'|'analysis'|'fast'} opts.tier   - Task tier (determines model)
 * @param {string|Array<{text:string,cache?:boolean}>} opts.systemPrompt - System / role instructions
 * @param {string}  opts.userPrompt              - User message / task
 * @param {number}  [opts.maxTokens]             - Max output tokens (default 2048)
 * @param {boolean} [opts.cacheSystem]           - Cachear el system prompt (Anthropic)
 */
export async function callAI({
  provider = "anthropic",
  tier = "main",
  systemPrompt,
  userPrompt,
  maxTokens = 2048,
  cacheSystem = false,
}) {
  const system = normalizeSystemPrompt(systemPrompt, cacheSystem);

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: MODELS.openai[tier],
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system.openai },
        { role: "user",   content: userPrompt },
      ],
    });
    return completion.choices[0]?.message?.content || "";
  }

  // Default: Anthropic
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: MODELS.anthropic[tier],
    max_tokens: maxTokens,
    system: system.anthropic,
    messages: [{ role: "user", content: userPrompt }],
  });
  return message.content[0]?.text || "";
}

/**
 * Variante en streaming de callAI: generador asíncrono que va emitiendo los
 * deltas de texto según el modelo escribe. Mismos parámetros que callAI.
 * Usada por /api/generate para pintar el artículo en vivo en el dashboard.
 *
 * @param {function} [opts.onUsage] - callback con los tokens consumidos
 *   { model, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
 */
export async function* callAIStream({
  provider = "anthropic",
  tier = "main",
  systemPrompt,
  userPrompt,
  maxTokens = 2048,
  cacheSystem = false,
  onUsage,
}) {
  const system = normalizeSystemPrompt(systemPrompt, cacheSystem);

  if (provider === "openai") {
    const model = MODELS.openai[tier];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: system.openai },
        { role: "user",   content: userPrompt },
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield text;
      if (chunk.usage && onUsage) {
        onUsage({
          model,
          inputTokens: chunk.usage.prompt_tokens || 0,
          outputTokens: chunk.usage.completion_tokens || 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        });
      }
    }
    return;
  }

  // Default: Anthropic
  const model = MODELS.anthropic[tier];
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: system.anthropic,
    messages: [{ role: "user", content: userPrompt }],
    stream: true,
  });

  const usage = { model, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  for await (const event of stream) {
    if (event.type === "message_start" && event.message?.usage) {
      usage.inputTokens = event.message.usage.input_tokens || 0;
      usage.cacheReadTokens = event.message.usage.cache_read_input_tokens || 0;
      usage.cacheWriteTokens = event.message.usage.cache_creation_input_tokens || 0;
    } else if (event.type === "message_delta" && event.usage) {
      usage.outputTokens = event.usage.output_tokens || 0;
    } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
      yield event.delta.text;
    }
  }
  if (onUsage) onUsage(usage);
}
