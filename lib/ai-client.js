import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ─── Model Mappings ───────────────────────────────────────────────────────────
// 'main'     → heavy creative tasks (article generation)
// 'analysis' → structured reasoning (research, keywords)
// 'fast'     → quick tasks run in parallel (agents, SEO, meta)

const MODELS = {
  anthropic: {
    main:     "claude-opus-4-5",
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
 * Unified AI call — works with both Anthropic and OpenAI.
 * Returns the model's response as a plain string.
 *
 * @param {Object}  opts
 * @param {'anthropic'|'openai'} opts.provider   - AI provider to use
 * @param {'main'|'analysis'|'fast'} opts.tier   - Task tier (determines model)
 * @param {string}  opts.systemPrompt            - System / role instructions
 * @param {string}  opts.userPrompt              - User message / task
 * @param {number}  [opts.maxTokens]             - Max output tokens (default 2048)
 */
export async function callAI({
  provider = "anthropic",
  tier = "main",
  systemPrompt,
  userPrompt,
  maxTokens = 2048,
}) {
  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: MODELS.openai[tier],
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
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
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return message.content[0]?.text || "";
}
