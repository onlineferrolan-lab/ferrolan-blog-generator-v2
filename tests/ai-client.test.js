import { describe, it, expect } from "vitest";
import { normalizeSystemPrompt } from "../lib/ai-client";

describe("normalizeSystemPrompt", () => {
  it("string simple pasa tal cual", () => {
    const out = normalizeSystemPrompt("Eres un redactor.");
    expect(out.anthropic).toBe("Eres un redactor.");
    expect(out.openai).toBe("Eres un redactor.");
  });

  it("cacheSystem envuelve el string en bloque con cache_control", () => {
    const out = normalizeSystemPrompt("Eres un redactor.", true);
    expect(out.anthropic).toEqual([
      {
        type: "text",
        text: "Eres un redactor.",
        cache_control: { type: "ephemeral" },
      },
    ]);
    expect(out.openai).toBe("Eres un redactor.");
  });

  it("bloques: solo los marcados llevan cache_control", () => {
    const out = normalizeSystemPrompt([
      { text: "Contexto de marca estático", cache: true },
      { text: "Historial variable" },
    ]);
    expect(out.anthropic).toHaveLength(2);
    expect(out.anthropic[0].cache_control).toEqual({ type: "ephemeral" });
    expect(out.anthropic[1].cache_control).toBeUndefined();
    expect(out.openai).toBe("Contexto de marca estático\n\nHistorial variable");
  });

  it("filtra bloques vacíos", () => {
    const out = normalizeSystemPrompt([{ text: "a" }, null, { text: "" }]);
    expect(out.anthropic).toHaveLength(1);
  });

  it("sin system prompt", () => {
    expect(normalizeSystemPrompt(undefined).anthropic).toBeUndefined();
  });
});
