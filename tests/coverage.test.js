import { describe, it, expect } from "vitest";
import { findCoverage, annotateCoverage } from "../lib/coverage";
import { normalizeKeyword, normalizeSlug } from "../lib/keyword-utils";

// Índice como el que construye loadCoverageIndex()
function makeIndex() {
  return [
    {
      title: "Cómo elegir azulejos para el baño",
      url: "https://ferrolan.es/blog/como-elegir-azulejos-bano",
      source: "wordpress",
      date: "2026-01-15",
      fields: [
        { norm: normalizeKeyword("Cómo elegir azulejos para el baño") },
        { norm: normalizeSlug("como-elegir-azulejos-bano") },
      ],
    },
    {
      title: "Guía de parquet laminado",
      url: null,
      source: "kv",
      date: "2026-02-01",
      fields: [{ norm: normalizeKeyword("Guía de parquet laminado") }],
    },
  ];
}

describe("findCoverage", () => {
  it("detecta keyword cubierta por coincidencia exacta", () => {
    const { covered, conflict } = findCoverage("elegir azulejos baño", makeIndex());
    expect(covered).toBe(true);
    expect(conflict.title).toBe("Cómo elegir azulejos para el baño");
    expect(conflict.matchType).toBe("exact");
  });

  it("detecta cobertura por contención", () => {
    const { covered, conflict } = findCoverage("azulejos baño", makeIndex());
    expect(covered).toBe(true);
    expect(conflict.matchType).toBe("contains");
  });

  it("no marca keywords sin relación", () => {
    const { covered, conflict } = findCoverage("grifería cocina monomando", makeIndex());
    expect(covered).toBe(false);
    expect(conflict).toBeNull();
  });

  it("nivel strict excluye solapamientos parciales", () => {
    // "parquet laminado salon" vs "guia parquet laminado": 2/3 = 66% → overlap
    const balanced = findCoverage("parquet laminado salón", makeIndex(), "balanced");
    expect(balanced.covered).toBe(true);
    expect(balanced.conflict.matchType).toBe("overlap");

    const strict = findCoverage("parquet laminado salón", makeIndex(), "strict");
    expect(strict.covered).toBe(false);
  });

  it("gestiona índice vacío o keyword vacía", () => {
    expect(findCoverage("", makeIndex()).covered).toBe(false);
    expect(findCoverage("azulejos", []).covered).toBe(false);
    expect(findCoverage("azulejos", null).covered).toBe(false);
  });
});

describe("annotateCoverage", () => {
  it("anota cubierto y articuloExistente en cada item", () => {
    const items = [
      { query: "elegir azulejos baño", clicks: 10 },
      { query: "grifería cocina monomando", clicks: 5 },
    ];
    const out = annotateCoverage(items, makeIndex(), "query");
    expect(out[0].cubierto).toBe(true);
    expect(out[0].articuloExistente.title).toBe("Cómo elegir azulejos para el baño");
    expect(out[1].cubierto).toBe(false);
    expect(out[1].articuloExistente).toBeUndefined();
  });

  it("devuelve la entrada tal cual si no es array", () => {
    expect(annotateCoverage(null, makeIndex(), "query")).toBeNull();
  });
});
