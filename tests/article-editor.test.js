import { describe, it, expect } from "vitest";
import {
  splitBlocks,
  insertImageAfterBlock,
  insertElementInArticle,
  insertElementsInArticle,
  applyInternalLink,
  applyTitle,
} from "../lib/article-editor";

const ARTICULO = `# Cómo elegir azulejos

Párrafo de introducción.

## Tipos de azulejos

Contenido de tipos.

## Cómo elegir el formato

Contenido de formato.

## Conclusión

Párrafo final.

---

Meta título: X
Slug: y`;

describe("splitBlocks", () => {
  it("divide por secciones H2", () => {
    const blocks = splitBlocks(ARTICULO);
    expect(blocks.length).toBe(4); // intro+h1, tipos, formato, conclusión+meta
    expect(blocks[1].startsWith("## Tipos de azulejos")).toBe(true);
  });
});

describe("insertImageAfterBlock", () => {
  it("inserta la imagen markdown tras el bloque indicado", () => {
    const out = insertImageAfterBlock(ARTICULO, { descripcion: "Baño moderno", src: "data:img" }, 0);
    const blocks = out.split("\n\n");
    expect(out).toContain("![Baño moderno](data:img)");
    // La imagen va después del primer bloque y antes de "## Tipos"
    expect(out.indexOf("![Baño moderno]")).toBeLessThan(out.indexOf("## Tipos"));
  });
});

describe("insertElementInArticle", () => {
  it("INTRO inserta tras el H1", () => {
    const out = insertElementInArticle(ARTICULO, { text: "**Gancho intro**", placement: "INTRO" });
    const lines = out.split("\n");
    const h1Idx = lines.findIndex((l) => l.startsWith("# "));
    expect(lines[h1Idx + 2]).toBe("**Gancho intro**");
  });

  it("CIERRE inserta al final de la última sección, antes del bloque meta", () => {
    const out = insertElementInArticle(ARTICULO, { text: "**CTA final**", placement: "CIERRE" });
    expect(out.indexOf("**CTA final**")).toBeGreaterThan(out.indexOf("## Conclusión"));
    expect(out.indexOf("**CTA final**")).toBeLessThan(out.indexOf("Meta título"));
  });

  it("H2 específico hace fuzzy matching y respeta position inicio", () => {
    const out = insertElementInArticle(ARTICULO, {
      text: "**Consejo de formato**",
      placement: "H2: elegir el formato",
      position: "inicio",
    });
    const idx = out.indexOf("**Consejo de formato**");
    expect(idx).toBeGreaterThan(out.indexOf("## Cómo elegir el formato"));
    expect(idx).toBeLessThan(out.indexOf("Contenido de formato"));
  });

  it("no toca el artículo si el elemento no tiene texto", () => {
    expect(insertElementInArticle(ARTICULO, { placement: "INTRO" })).toBe(ARTICULO);
  });

  it("preserva el bloque meta intacto", () => {
    const out = insertElementInArticle(ARTICULO, { text: "X", placement: "CIERRE" });
    expect(out).toContain("\n---\n\nMeta título: X");
  });
});

describe("insertElementsInArticle", () => {
  it("aplica varios elementos en cadena (sin carreras de estado)", () => {
    const out = insertElementsInArticle(ARTICULO, [
      { text: "**Uno**", placement: "INTRO" },
      { text: "**Dos**", placement: "CIERRE" },
    ]);
    expect(out).toContain("**Uno**");
    expect(out).toContain("**Dos**");
  });
});

describe("applyInternalLink", () => {
  it("convierte el anchor en enlace si existe sin enlazar", () => {
    const sentence = "Descubre nuestra gama de [azulejos](/azulejos) hoy.";
    const out = applyInternalLink("Tenemos muchos azulejos disponibles.", sentence);
    expect(out).toContain("[azulejos](/azulejos)");
  });

  it("no duplica enlaces existentes", () => {
    const articulo = "Ya hay [azulejos](/azulejos) enlazados.";
    const out = applyInternalLink(articulo, "x [azulejos](/azulejos) y");
    expect(out).toBe(articulo);
  });
});

describe("applyTitle", () => {
  it("reemplaza el H1", () => {
    const out = applyTitle(ARTICULO, "Nuevo título");
    expect(out).toContain("# Nuevo título");
    expect(out).not.toContain("# Cómo elegir azulejos");
  });
});
