import { describe, it, expect } from "vitest";
import { estimateCost, formatCost } from "../lib/ai-cost";

describe("estimateCost", () => {
  it("calcula input + output", () => {
    // 1M in a $5 + 1M out a $25 = $30
    expect(
      estimateCost({ model: "claude-opus-4-8", inputTokens: 1e6, outputTokens: 1e6 })
    ).toBe(30);
  });

  it("aplica los multiplicadores de caché", () => {
    // 1M cache read a 10% de $5 = $0.5; 1M cache write a 125% de $5 = $6.25
    expect(
      estimateCost({ model: "claude-opus-4-8", cacheReadTokens: 1e6, cacheWriteTokens: 1e6 })
    ).toBe(6.75);
  });

  it("devuelve null para modelos desconocidos", () => {
    expect(estimateCost({ model: "modelo-inventado", inputTokens: 1000 })).toBeNull();
  });

  it("redondea a 4 decimales", () => {
    const c = estimateCost({ model: "claude-haiku-4-5-20251001", inputTokens: 1234, outputTokens: 567 });
    expect(c).toBeCloseTo(0.0041, 4);
  });
});

describe("formatCost", () => {
  it("formatea en dólares", () => {
    expect(formatCost(0.0432)).toBe("$0.043");
    expect(formatCost(0.0005)).toBe("<$0.001");
    expect(formatCost(null)).toBe("");
  });
});
