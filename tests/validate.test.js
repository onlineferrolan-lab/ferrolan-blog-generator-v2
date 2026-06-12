import { describe, it, expect } from "vitest";
import { checkString, validateBody, MAX } from "../lib/validate";

describe("checkString", () => {
  it("acepta strings válidos", () => {
    expect(checkString({ tema: "azulejos" }, "tema", { required: true, max: 100 })).toBeNull();
  });

  it("exige campos required", () => {
    expect(checkString({}, "tema", { required: true })).toMatch(/obligatorio/);
    expect(checkString({ tema: "" }, "tema", { required: true })).toMatch(/obligatorio/);
    expect(checkString({ tema: null }, "tema", { required: true })).toMatch(/obligatorio/);
  });

  it("permite ausencia en campos opcionales", () => {
    expect(checkString({}, "keywords", { required: false })).toBeNull();
  });

  it("rechaza tipos no-string (evita TypeError 500 en endpoints)", () => {
    expect(checkString({ articulo: 42 }, "articulo")).toMatch(/debe ser texto/);
    expect(checkString({ articulo: { x: 1 } }, "articulo")).toMatch(/debe ser texto/);
    expect(checkString({ articulo: ["a"] }, "articulo")).toMatch(/debe ser texto/);
  });

  it("aplica límite de longitud", () => {
    expect(checkString({ tema: "x".repeat(301) }, "tema", { max: 300 })).toMatch(/máximo/);
    expect(checkString({ tema: "x".repeat(300) }, "tema", { max: 300 })).toBeNull();
  });
});

describe("validateBody", () => {
  const rules = {
    tema: { required: true, max: MAX.tema },
    articulo: { required: true, max: MAX.articulo },
    keywords: { max: MAX.keywords },
  };

  it("acepta un body válido", () => {
    expect(
      validateBody({ tema: "parquet", articulo: "# Título\nTexto" }, rules)
    ).toBeNull();
  });

  it("rechaza body no-objeto", () => {
    expect(validateBody(null, rules)).toMatch(/inválido/);
    expect(validateBody("texto", rules)).toMatch(/inválido/);
    expect(validateBody([1, 2], rules)).toMatch(/inválido/);
  });

  it("devuelve el primer error encontrado", () => {
    expect(validateBody({ articulo: "x" }, rules)).toMatch(/'tema'/);
    expect(validateBody({ tema: "ok", articulo: 7 }, rules)).toMatch(/'articulo'/);
  });
});
