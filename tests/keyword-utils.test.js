import { describe, it, expect } from "vitest";
import { normalizeKeyword, normalizeSlug, matchType } from "../lib/keyword-utils";

describe("normalizeKeyword", () => {
  it("pasa a minúsculas y quita acentos", () => {
    expect(normalizeKeyword("Cerámica Porcelánica")).toBe("ceramica porcelanica");
  });

  it("elimina stop words y palabras cortas", () => {
    expect(normalizeKeyword("cómo elegir azulejos para el baño")).toBe(
      "elegir azulejos bano"
    );
  });

  it("elimina caracteres no alfanuméricos", () => {
    expect(normalizeKeyword("azulejos: ¿cuáles elegir?")).toBe("azulejos cuales elegir");
  });

  it("devuelve cadena vacía para entradas no válidas", () => {
    expect(normalizeKeyword(null)).toBe("");
    expect(normalizeKeyword(undefined)).toBe("");
    expect(normalizeKeyword(42)).toBe("");
    expect(normalizeKeyword("")).toBe("");
  });
});

describe("normalizeSlug", () => {
  it("convierte guiones en espacios y normaliza", () => {
    expect(normalizeSlug("como-elegir-azulejos-bano")).toBe("elegir azulejos bano");
  });

  it("devuelve cadena vacía para entradas no válidas", () => {
    expect(normalizeSlug(null)).toBe("");
  });
});

describe("matchType", () => {
  it("detecta coincidencia exacta", () => {
    expect(matchType("azulejos bano", "azulejos bano")).toBe("exact");
  });

  it("detecta contención en ambos sentidos", () => {
    expect(matchType("azulejos bano", "elegir azulejos bano moderno")).toBe("contains");
    expect(matchType("elegir azulejos bano", "azulejos bano")).toBe("contains");
  });

  it("detecta solapamiento ≥60% de palabras", () => {
    // 2 de 3 palabras (66%) presentes en el campo
    expect(matchType("suelo porcelanico exterior", "porcelanico terraza exterior antideslizante")).toBe(
      "overlap"
    );
  });

  it("devuelve null por debajo del 60%", () => {
    // 1 de 3 palabras (33%)
    expect(matchType("suelo laminado cocina", "suelo vinilico salon")).toBeNull();
  });

  it("devuelve null con entradas vacías", () => {
    expect(matchType("", "algo")).toBeNull();
    expect(matchType("algo", "")).toBeNull();
  });
});
