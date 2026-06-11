import { describe, it, expect } from "vitest";
import { parseLLMJson } from "../lib/llm-json";

describe("parseLLMJson", () => {
  it("parsea JSON limpio", () => {
    expect(parseLLMJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("quita fences markdown", () => {
    expect(parseLLMJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseLLMJson('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("ignora prosa antes y después del JSON", () => {
    expect(
      parseLLMJson('Aquí tienes el análisis:\n{"score": 80}\nEspero que te sirva.')
    ).toEqual({ score: 80 });
  });

  it("repara JSON truncado a mitad de string", () => {
    const out = parseLLMJson('{"keywords": [{"keyword": "azulejos ba');
    expect(out.keywords).toBeInstanceOf(Array);
  });

  it("repara JSON truncado con anidamiento mixto objeto-dentro-de-array", () => {
    // El cierre en orden fijo (primero ] luego }) fallaba con este caso
    const out = parseLLMJson('{"items": [{"a": 1}, {"b": 2');
    expect(out.items[0]).toEqual({ a: 1 });
  });

  it("repara JSON truncado tras una coma (campo parcial)", () => {
    const out = parseLLMJson('{"score": 70, "issues": [], "quickFixes": ["a", "b"], "head');
    expect(out.score).toBe(70);
    expect(out.quickFixes).toEqual(["a", "b"]);
  });

  it("lanza con entradas sin JSON", () => {
    expect(() => parseLLMJson("No puedo generar eso.")).toThrow(/no contiene JSON/);
    expect(() => parseLLMJson("")).toThrow(/vacía/);
    expect(() => parseLLMJson(null)).toThrow(/vacía/);
  });

  it("no se deja engañar por llaves dentro de strings", () => {
    expect(parseLLMJson('{"text": "usa { y } con cuidado"}')).toEqual({
      text: "usa { y } con cuidado",
    });
  });
});
